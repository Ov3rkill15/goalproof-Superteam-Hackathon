// Real devnet settlement — the numbers here are NOT mock. This exact market was
// opened, bet on both sides, resolved by CPI into txoracle `validate_stat` against
// a live TxLINE Merkle proof, and the winner was paid out. Every signature below
// resolves on Solana Explorer (devnet). Captured 2026-07-18 from keeper/demo-state.
//
// The dashboard overlays this onto the matching mock market (total goals > 2) so at
// least one card links to a genuine on-chain settlement, not a placeholder.

export interface OnChainProof {
  marketAddress: string;
  dailyScoresRoots: string;
  resolveTx: string;
  claimTx: string;
}

export const ONCHAIN_SETTLEMENT = {
  /** index into fixturePack() — market 0 is "total goals > 2?" */
  marketIndex: 0,
  fixtureId: 18213979,
  marketId: "1784345272304",
  marketAddress: "EzFT9cpfKBpaL43TTJQb1u3k7hC1oNdtMaG2ydhTUSDB",
  mint: "27m8Gq235JyHp39UrHgp4uDFgnaPHzBNhri6LMFSFuhC",
  createTx: "7quy5nVPnaHHGRJeisU9LhBqcS5U26QFFKLYxtV8cL4MeSd48mYawMNHWMbijGx6Dk1vEAB1xRSasBRcV9L5nBf",
  positionYesTx: "4S2G4NsLFFEi3ysdHhFD3Aknwy6MonsNRQKHLBBECjJAPZB6B51ut7pBmNJk59UpqaeyT7w9E8VmuuaAqMY8akgp",
  positionNoTx: "7EAY3vQkWepT1Pdd1vTpAH21WLz4uY5zWdarZqnLjkzYWZXxHYJ1RQZb8wQti7jFaDSMgp7Cdpu381v42LPwvr5",
  resolveTx: "UqgCj5GxGTAmCxTJ89yD7pfhs7axp8NBdn5L2CcKHqtkCYAkBGgS8SySoSTUS8ZxHDyqfxu2LmLuTASLhbQNMMy",
  claimTx: "5RajCEi3LAzdA6NC5zYWUaCpaKNLhyibxSdidw6LRyFc1QhydiFSwTCWPv5yTJWoTzQUMY8hqiBkUimq83mzrR9X",
  dailyScoresRoots: "EdJuEftTBNwXRWJpvYCziVxKT87qMDVu9V6HC7PwGffB",
  /** proven stats: home goals (1) + away goals (2) = 3 > 2 → YES */
  provenValue: 3,
  outcome: true,
  /** eventStatRoot from the TxLINE proof, hex preview */
  proofRootPreview: "011d84f6c3121bb7b4f764b43f7193c131fc0fc182852438d65adc4f2b2cabec",
} as const;

export const onChainProof: OnChainProof = {
  marketAddress: ONCHAIN_SETTLEMENT.marketAddress,
  dailyScoresRoots: ONCHAIN_SETTLEMENT.dailyScoresRoots,
  resolveTx: ONCHAIN_SETTLEMENT.resolveTx,
  claimTx: ONCHAIN_SETTLEMENT.claimTx,
};
