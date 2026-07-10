//! GoalProof — pooled binary prediction markets for World Cup fixtures, settled
//! trustlessly against TxLINE's on-chain Merkle roots.
//!
//! Resolution model: a market stores a predicate over a TxLINE stat (e.g.
//! "home goals > 2"). Anyone may call `resolve` with the Merkle proof fetched from
//! `GET /api/scores/stat-validation`; the program CPIs into the TxLINE (txoracle)
//! program's `validate_stat`, which errors unless the proof verifies against the
//! daily root **and** the predicate holds. YES is settled with the market's own
//! predicate, NO with its logical complement — both outcomes are proof-backed,
//! never asserted by a keeper.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// TxLINE (txoracle) program on devnet.
pub const TXORACLE_ID: Pubkey = pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
/// Anchor discriminator of txoracle's `validate_stat` (from the published IDL).
pub const VALIDATE_STAT_DISC: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];
/// Seed of txoracle's daily scores Merkle-root PDA.
pub const DAILY_SCORES_SEED: &[u8] = b"daily_scores_roots";

pub const MARKET_SEED: &[u8] = b"market";
pub const VAULT_SEED: &[u8] = b"vault";
pub const POSITION_SEED: &[u8] = b"position";

#[program]
pub mod goalproof {
    use super::*;

    /// Create a binary market on a fixture stat predicate. The predicate stored here
    /// is the immutable resolution contract; `close_ts` is the betting cutoff.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        fixture_id: i64,
        period: i32,
        stat_a_key: u32,
        stat_b_key: Option<u32>,
        op: Option<BinaryExpr>,
        predicate: TraderPredicate,
        close_ts: i64,
        title: String,
    ) -> Result<()> {
        require!(title.len() <= Market::MAX_TITLE, GoalproofError::TitleTooLong);
        require!(
            close_ts > Clock::get()?.unix_timestamp,
            GoalproofError::CloseInPast
        );
        // A two-stat market needs both the second key and the operator; a
        // one-stat market must have neither.
        require!(
            stat_b_key.is_some() == op.is_some(),
            GoalproofError::InvalidStatCombination
        );

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.mint = ctx.accounts.mint.key();
        market.market_id = market_id;
        market.fixture_id = fixture_id;
        market.period = period;
        market.stat_a_key = stat_a_key;
        market.stat_b_key = stat_b_key;
        market.op = op;
        market.predicate = predicate;
        market.close_ts = close_ts;
        market.resolved = false;
        market.outcome = false;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.title = title;
        market.bump = ctx.bumps.market;
        Ok(())
    }

    /// Deposit `amount` of the market's mint into escrow on the YES or NO side.
    pub fn take_position(ctx: Context<TakePosition>, side: bool, amount: u64) -> Result<()> {
        require!(amount > 0, GoalproofError::ZeroAmount);
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, GoalproofError::AlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp < market.close_ts,
            GoalproofError::MarketClosed
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.user.key();
        position.market = market.key();
        position.side = side;
        position.amount = position
            .amount
            .checked_add(amount)
            .ok_or(GoalproofError::Overflow)?;
        position.claimed = false;
        position.bump = ctx.bumps.position;

        if side {
            market.yes_pool = market.yes_pool.checked_add(amount).ok_or(GoalproofError::Overflow)?;
        } else {
            market.no_pool = market.no_pool.checked_add(amount).ok_or(GoalproofError::Overflow)?;
        }
        Ok(())
    }

    /// Settle the market with a TxLINE Merkle proof. Permissionless: whoever holds a
    /// valid proof may resolve. `claimed_outcome` selects which side the proof backs;
    /// `predicate_used` must be the market predicate (YES) or its complement (NO) —
    /// the program checks that relationship, then CPIs into txoracle `validate_stat`,
    /// which fails the whole transaction unless proof + predicate verify on-chain.
    #[allow(clippy::too_many_arguments)]
    pub fn resolve(
        ctx: Context<Resolve>,
        claimed_outcome: bool,
        ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        predicate_used: TraderPredicate,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, GoalproofError::AlreadyResolved);

        // The proof must be about this market's fixture and stat(s).
        require!(
            fixture_summary.fixture_id == market.fixture_id,
            GoalproofError::FixtureMismatch
        );
        require!(
            stat_a.stat_to_prove.key == market.stat_a_key
                && stat_a.stat_to_prove.period == market.period,
            GoalproofError::StatMismatch
        );
        match (&stat_b, market.stat_b_key) {
            (Some(b), Some(key)) => require!(
                b.stat_to_prove.key == key && b.stat_to_prove.period == market.period,
                GoalproofError::StatMismatch
            ),
            (None, None) => {}
            _ => return err!(GoalproofError::StatMismatch),
        }

        // predicate_used must be exactly the market predicate (YES) or a valid
        // complement of it (NO). Integer stats make complements exact.
        let valid = if claimed_outcome {
            predicate_used == market.predicate
        } else {
            market.predicate.is_complement(&predicate_used)
        };
        require!(valid, GoalproofError::PredicateNotDerived);

        // CPI into txoracle: no return value — success IS the attestation.
        let mut data = Vec::with_capacity(1024);
        data.extend_from_slice(&VALIDATE_STAT_DISC);
        ts.serialize(&mut data)?;
        fixture_summary.serialize(&mut data)?;
        fixture_proof.serialize(&mut data)?;
        main_tree_proof.serialize(&mut data)?;
        predicate_used.serialize(&mut data)?;
        stat_a.serialize(&mut data)?;
        stat_b.serialize(&mut data)?;
        market.op.serialize(&mut data)?;

        let ix = Instruction {
            program_id: TXORACLE_ID,
            accounts: vec![AccountMeta::new_readonly(
                ctx.accounts.daily_scores_roots.key(),
                false,
            )],
            data,
        };
        invoke(
            &ix,
            &[
                ctx.accounts.daily_scores_roots.to_account_info(),
                ctx.accounts.txoracle_program.to_account_info(),
            ],
        )?;

        market.resolved = true;
        market.outcome = claimed_outcome;
        emit!(MarketResolved {
            market: market.key(),
            outcome: claimed_outcome,
            ts,
        });
        Ok(())
    }

    /// Winners withdraw stake plus their pro-rata share of the losing pool.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        require!(market.resolved, GoalproofError::NotResolved);
        require!(!position.claimed, GoalproofError::AlreadyClaimed);
        require!(position.side == market.outcome, GoalproofError::NotAWinner);

        let (winning_pool, losing_pool) = if market.outcome {
            (market.yes_pool, market.no_pool)
        } else {
            (market.no_pool, market.yes_pool)
        };
        // stake + stake * losing / winning, in u128 to avoid overflow
        let share = (position.amount as u128)
            .checked_mul(losing_pool as u128)
            .and_then(|x| x.checked_div(winning_pool as u128))
            .ok_or(GoalproofError::Overflow)?;
        let payout = (position.amount as u128)
            .checked_add(share)
            .ok_or(GoalproofError::Overflow)? as u64;

        let creator = market.creator;
        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds: &[&[u8]] = &[MARKET_SEED, creator.as_ref(), &market_id_bytes, &[market.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                &[seeds],
            ),
            payout,
        )?;
        position.claimed = true;
        Ok(())
    }
}

// ---------- txoracle-compatible types (Borsh layouts mirror the published IDL) ----------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

impl TraderPredicate {
    /// Whether `other` proves the logical negation of `self` over integer stats.
    /// !(v > t)  ⇔  v < t+1;   !(v < t)  ⇔  v > t-1;   !(v = t)  ⇔  v < t  or  v > t.
    pub fn is_complement(&self, other: &TraderPredicate) -> bool {
        use Comparison::*;
        match self.comparison {
            GreaterThan => {
                other.comparison == LessThan && other.threshold == self.threshold.saturating_add(1)
            }
            LessThan => {
                other.comparison == GreaterThan && other.threshold == self.threshold.saturating_sub(1)
            }
            EqualTo => {
                (other.comparison == LessThan || other.comparison == GreaterThan)
                    && other.threshold == self.threshold
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum BinaryExpr {
    Add,
    Subtract,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

// ---------- accounts ----------

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub market_id: u64,
    pub fixture_id: i64,
    pub period: i32,
    pub stat_a_key: u32,
    pub stat_b_key: Option<u32>,
    pub op: Option<BinaryExpr>,
    pub predicate: TraderPredicate,
    pub close_ts: i64,
    pub resolved: bool,
    pub outcome: bool,
    pub yes_pool: u64,
    pub no_pool: u64,
    #[max_len(64)]
    pub title: String,
    pub bump: u8,
}

impl Market {
    pub const MAX_TITLE: usize = 64;
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub side: bool,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

// ---------- contexts ----------

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, creator.key().as_ref(), &market_id.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = market,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(side: bool)]
pub struct TakePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref(), &[side as u8]],
        bump,
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_account.mint == market.mint @ GoalproofError::MintMismatch)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// CHECK: must be txoracle's daily scores roots PDA — verified by ownership
    /// (txoracle checks the PDA derivation itself and errors with InvalidPda).
    #[account(owner = TXORACLE_ID @ GoalproofError::BadRootsAccount)]
    pub daily_scores_roots: UncheckedAccount<'info>,
    /// CHECK: the txoracle program being CPI'd into
    #[account(address = TXORACLE_ID @ GoalproofError::BadOracleProgram)]
    pub txoracle_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref(), &[position.side as u8]],
        bump = position.bump,
        constraint = position.owner == user.key() @ GoalproofError::NotAWinner,
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_account.mint == market.mint @ GoalproofError::MintMismatch)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ---------- events & errors ----------

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: bool,
    pub ts: i64,
}

#[error_code]
pub enum GoalproofError {
    #[msg("title exceeds 64 bytes")]
    TitleTooLong,
    #[msg("betting cutoff is in the past")]
    CloseInPast,
    #[msg("two-stat markets need both stat_b_key and op; one-stat markets neither")]
    InvalidStatCombination,
    #[msg("amount must be > 0")]
    ZeroAmount,
    #[msg("market already resolved")]
    AlreadyResolved,
    #[msg("betting is closed for this market")]
    MarketClosed,
    #[msg("market not resolved yet")]
    NotResolved,
    #[msg("position already claimed")]
    AlreadyClaimed,
    #[msg("position is not on the winning side")]
    NotAWinner,
    #[msg("proof is for a different fixture")]
    FixtureMismatch,
    #[msg("proof stat key/period does not match the market")]
    StatMismatch,
    #[msg("predicate is neither the market predicate nor its complement")]
    PredicateNotDerived,
    #[msg("token account mint does not match the market")]
    MintMismatch,
    #[msg("roots account is not owned by txoracle")]
    BadRootsAccount,
    #[msg("wrong oracle program")]
    BadOracleProgram,
    #[msg("arithmetic overflow")]
    Overflow,
}
