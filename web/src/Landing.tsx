import { type ReactNode } from "react";
import { ONCHAIN_SETTLEMENT } from "./data/onchain";
import { FIXTURE } from "./data/timeline";
import { PROGRAM_ID, TXORACLE_ID, explorerAddress, explorerTx } from "./config";
import { Flag } from "./components/Flag";

// GoalProof landing page — explains the product and, above all, WHY it is not a
// betting site: outcomes are settled by a Merkle proof the Solana program
// re-verifies on-chain, not reported by a trusted admin/oracle.

const shortSig = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;

export function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Contrast />
        <HowItWorks />
        <LiveProof />
        <Features />
        <Architecture />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* ── Nav ─────────────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/40 bg-ink-950/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#/" className="flex items-center gap-2.5">
          <ShieldMark className="h-8 w-8" />
          <span className="font-display text-[17px] font-bold tracking-tight text-slate-50">GoalProof</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          <a href="#how" className="transition-colors hover:text-slate-100">How it settles</a>
          <a href="#proof" className="transition-colors hover:text-slate-100">Live proof</a>
          <a href="#features" className="transition-colors hover:text-slate-100">Features</a>
          <a href="#stack" className="transition-colors hover:text-slate-100">Stack</a>
        </nav>
        <a
          href="#/live"
          className="rounded-full bg-pitch-500 px-4 py-1.5 text-sm font-semibold text-ink-950 shadow-lg shadow-pitch-500/25 transition-transform hover:-translate-y-0.5 hover:bg-pitch-400"
        >
          Open live board
        </a>
      </div>
    </header>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10rem] h-[32rem] w-[64rem] max-w-[130%] -translate-x-1/2 rounded-full bg-pitch-500/12 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 font-mono text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-proof-400 animate-live" />
              Solana devnet · settled live, not reported
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.03] tracking-[-0.03em] text-slate-50 text-balance sm:text-6xl">
              Prediction markets that{" "}
              <span className="text-pitch-400">settle themselves.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400 sm:text-lg">
              GoalProof runs micro-markets on live World Cup stats. When a period ends, the
              outcome isn't announced by an admin or an oracle you have to trust — the Solana
              program re-checks a <span className="text-slate-200">Merkle proof</span> from the
              TxLINE feed and pays out <span className="text-slate-200">only if the math holds.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#/live"
                className="rounded-full bg-pitch-500 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-pitch-500/25 transition-transform hover:-translate-y-0.5 hover:bg-pitch-400"
              >
                Open the live board →
              </a>
              <a
                href={explorerTx(ONCHAIN_SETTLEMENT.resolveTx)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-ink-700/70 px-5 py-2.5 font-mono text-sm text-slate-300 transition-colors hover:border-proof-500/50 hover:text-proof-300"
              >
                See a real settlement ↗
              </a>
            </div>
            <p className="mt-4 font-mono text-[11px] text-slate-500">
              No wager on the project token · escrow in devnet SPL · MIT-licensed & open source
            </p>
          </div>

          <ProofReceiptHero />
        </div>
      </div>
    </section>
  );
}

/** A stylised "settlement receipt" — the product's signature object. */
function ProofReceiptHero() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-proof-500/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-ink-700/60 bg-ink-900/70 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">settlement receipt</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-proof-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-proof-300 ring-1 ring-proof-500/30">
            ✓ verified on-chain
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <Flag team={FIXTURE.home} className="h-9 w-9" />
          <span className="font-display text-2xl font-bold tabular-nums text-white">1 – 2</span>
          <Flag team={FIXTURE.away} className="h-9 w-9" />
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          {FIXTURE.home} vs {FIXTURE.away} · full-time
        </p>

        <div className="mt-5 space-y-2 rounded-xl bg-ink-950/60 p-3.5 font-mono text-[11px] leading-relaxed">
          <Row k="market" v="Total goals > 2 ?" />
          <Row k="proven" v={`${ONCHAIN_SETTLEMENT.provenValue} goals → YES`} accent />
          <Row k="merkle root" v={`${ONCHAIN_SETTLEMENT.proofRootPreview.slice(0, 20)}…`} />
          <Row k="cpi" v="txoracle · validate_stat" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <TxPill label="resolve" sig={ONCHAIN_SETTLEMENT.resolveTx} accent />
          <TxPill label="claim" sig={ONCHAIN_SETTLEMENT.claimTx} />
          <TxPill label="market" sig={ONCHAIN_SETTLEMENT.marketAddress} address />
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className={accent ? "text-proof-300" : "text-slate-300"}>{v}</span>
    </div>
  );
}

function TxPill({ label, sig, accent, address }: { label: string; sig: string; accent?: boolean; address?: boolean }) {
  return (
    <a
      href={address ? explorerAddress(sig) : explorerTx(sig)}
      target="_blank"
      rel="noreferrer"
      className={`rounded-lg border px-2 py-1.5 transition-colors ${
        accent
          ? "border-proof-500/30 text-proof-300 hover:bg-proof-500/10"
          : "border-ink-700/70 text-slate-400 hover:border-ink-600 hover:text-slate-200"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono text-[10px] opacity-80">{shortSig(sig)} ↗</div>
    </a>
  );
}

/* ── Contrast: the differentiator, stated bluntly ────────────────────────── */
function Contrast() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-50 text-balance sm:text-4xl">
          It looks like a betting board. It isn't one.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
          Every other prediction market ends the same way: somebody you trust types in the
          result. GoalProof removes that somebody.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/40 p-6">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">everyone else</span>
          <h3 className="mt-2 font-display text-lg font-semibold text-slate-200">Reported by an oracle</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <CompareItem tone="bad">An admin or oracle service declares the winner off-chain.</CompareItem>
            <CompareItem tone="bad">You trust that they read the feed correctly — and honestly.</CompareItem>
            <CompareItem tone="bad">Disputes are a support ticket, not a proof.</CompareItem>
          </ul>
        </div>

        <div className="relative rounded-2xl border border-proof-500/40 bg-ink-900/40 p-6 shadow-[0_0_0_1px_rgba(166,224,47,0.12),0_16px_50px_-20px_rgba(166,224,47,0.3)]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-proof-400">goalproof</span>
          <h3 className="mt-2 font-display text-lg font-semibold text-slate-50">Verified by the chain</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <CompareItem tone="good">The program receives a Merkle proof for the exact stat.</CompareItem>
            <CompareItem tone="good">It re-hashes the proof to the on-chain daily root via CPI.</CompareItem>
            <CompareItem tone="good">Payout executes only if the proof verifies. No trusted party.</CompareItem>
          </ul>
        </div>
      </div>
    </section>
  );
}

function CompareItem({ tone, children }: { tone: "good" | "bad"; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className={`mt-0.5 shrink-0 ${tone === "good" ? "text-proof-400" : "text-no"}`}>
        {tone === "good" ? "✓" : "✕"}
      </span>
      <span>{children}</span>
    </li>
  );
}

/* ── How it works ────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Anchored",
      body: "TxLINE commits every match stat into a daily Merkle root that lives on Solana. The truth is on-chain before any market resolves.",
    },
    {
      n: "02",
      title: "Proven",
      body: "At period end the keeper bot pulls that stat's Merkle proof from the TxLINE feed and submits it to the goalproof program.",
    },
    {
      n: "03",
      title: "Verified",
      body: "The program re-checks the proof against the root via CPI into validate_stat, evaluates the predicate, and pays the winning side.",
    },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-y border-ink-700/40 bg-ink-950/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          From whistle to payout, in three moves
        </h2>
        <p className="mt-3 max-w-xl text-[15px] text-slate-400">
          The whole pipeline is deterministic and open — the resolution code is the spec.
        </p>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className={`relative rounded-2xl border p-6 ${
                i === 2 ? "border-proof-500/30 bg-proof-500/[0.04]" : "border-ink-700/60 bg-ink-900/40"
              }`}
            >
              <div className={`font-mono text-2xl font-bold ${i === 2 ? "text-proof-400" : "text-pitch-400"}`}>{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-slate-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
              {i < 2 && (
                <span aria-hidden className="absolute right-4 top-6 hidden text-slate-600 md:block">→</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Live proof (the money shot) ─────────────────────────────────────────── */
function LiveProof() {
  const txs: Array<[string, string, boolean]> = [
    ["create market", ONCHAIN_SETTLEMENT.createTx, false],
    ["position · YES", ONCHAIN_SETTLEMENT.positionYesTx, false],
    ["position · NO", ONCHAIN_SETTLEMENT.positionNoTx, false],
    ["resolve (CPI validate_stat)", ONCHAIN_SETTLEMENT.resolveTx, true],
    ["claim payout", ONCHAIN_SETTLEMENT.claimTx, true],
  ];
  return (
    <section id="proof" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-proof-400">not a mockup</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            One market, start to finish, on devnet
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            This exact market — <span className="text-slate-200">"{FIXTURE.home} vs {FIXTURE.away}, total goals over 2"</span> —
            was opened, bet on both sides, then resolved by a Merkle proof and paid out. Every
            signature below resolves on Solana Explorer. Nothing here is a placeholder.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <Metric k="Proven stat" v={`${ONCHAIN_SETTLEMENT.provenValue} goals`} />
            <Metric k="Outcome" v="YES · paid" accent />
            <Metric k="Network" v="Solana devnet" />
            <Metric k="Resolution" v="on-chain CPI" />
          </dl>
        </div>

        <ol className="overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/50">
          {txs.map(([label, sig, accent], i) => (
            <li key={sig} className={i > 0 ? "border-t border-ink-700/50" : ""}>
              <a
                href={explorerTx(sig)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-850/60"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                    accent ? "bg-proof-500/15 text-proof-300 ring-1 ring-proof-500/30" : "bg-ink-800 text-slate-400"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${accent ? "text-proof-200" : "text-slate-200"}`}>{label}</div>
                  <div className="truncate font-mono text-[11px] text-slate-500">{sig}</div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-slate-500 transition-colors group-hover:text-pitch-300">
                  explorer ↗
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Metric({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 px-4 py-3">
      <dd className={`font-display text-lg font-bold ${accent ? "text-proof-300" : "text-slate-100"}`}>{v}</dd>
      <dt className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
    </div>
  );
}

/* ── Features (bento, varied sizes — not an identical grid) ───────────────── */
function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-ink-700/40 bg-ink-950/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">Built to be judged on the code</h2>
        <p className="mt-3 max-w-xl text-[15px] text-slate-400">
          Clean, deterministic resolution; a live feed with a replay mode for the demo; and only
          markets we can actually prove.
        </p>

        <div className="mt-10 grid auto-rows-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          <Feature
            className="md:col-span-2 md:row-span-2"
            icon={<IconProof />}
            title="Proof-backed settlement"
            big
          >
            Resolution is a single deterministic path: fetch proof → CPI <code className="font-mono text-proof-300">validate_stat</code> →
            evaluate predicate → pay out. The NO side settles on the exact complement predicate, so both
            outcomes are equally proof-backed. If the proof fails to verify, nothing moves — there is no
            manual override anywhere in the program.
          </Feature>
          <Feature icon={<IconShield />} title="Provable-only markets">
            Every market maps to a stat TxLINE can prove. If it can't be proven, it never gets listed.
          </Feature>
          <Feature icon={<IconFeed />} title="Live feed + replay">
            A Go service ingests the real TxLINE SSE stream and records it, so the demo replays a full
            match deterministically.
          </Feature>
          <Feature icon={<IconVault />} title="On-chain escrow & payout">
            Stakes sit in a program vault (devnet SPL). Winners claim their stake plus a pro-rata cut of
            the losing pool.
          </Feature>
          <Feature icon={<IconBot />} title="Keeper automation">
            A bot watches the feed, detects period end, pulls the proof, and triggers resolve — no human
            in the settlement loop.
          </Feature>
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  children,
  className = "",
  big,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  big?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl border border-ink-700/60 bg-ink-900/40 p-5 ${className}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-pitch-500/12 text-pitch-300 ring-1 ring-pitch-500/25">
        {icon}
      </div>
      <h3 className={`mt-4 font-display font-semibold text-slate-100 ${big ? "text-xl" : "text-base"}`}>{title}</h3>
      <p className={`mt-2 leading-relaxed text-slate-400 ${big ? "text-[15px]" : "text-sm"}`}>{children}</p>
    </div>
  );
}

/* ── Architecture strip ──────────────────────────────────────────────────── */
function Architecture() {
  const parts = [
    { name: "ingestion", lang: "Go", body: "SSE consumer + record/replay of the TxLINE odds & scores feed." },
    { name: "program", lang: "Anchor / Rust", body: "create · take_position · resolve (CPI) · claim, on Solana devnet." },
    { name: "keeper", lang: "TypeScript", body: "Fetches proofs, submits resolve, orchestrates the on-chain flow." },
    { name: "web", lang: "React + Vite", body: "This dashboard: live markets, replay scrubber, on-chain receipts." },
  ];
  return (
    <section id="stack" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">Four services, one network</h2>
      <p className="mt-3 max-w-xl text-[15px] text-slate-400">
        Everything shares one devnet — same RPC, program ID, mint, and TxLINE endpoint.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p) => (
          <div key={p.name} className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-pitch-300">{p.name}/</span>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{p.lang}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-slate-500">
        <a href={explorerAddress(PROGRAM_ID)} target="_blank" rel="noreferrer" className="hover:text-pitch-300">
          program {shortSig(PROGRAM_ID)} ↗
        </a>
        <a href={explorerAddress(TXORACLE_ID)} target="_blank" rel="noreferrer" className="hover:text-pitch-300">
          txoracle {shortSig(TXORACLE_ID)} ↗
        </a>
      </div>
    </section>
  );
}

/* ── CTA ─────────────────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-ink-700/60 bg-ink-900/50 px-6 py-12 text-center sm:px-10 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-56 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-pitch-500/12 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-slate-50 text-balance sm:text-4xl">
            Watch a match settle itself.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-slate-400">
            Scrub through a full match on the live board and watch each market lock, fetch its proof,
            and pay out — with explorer links on every settlement.
          </p>
          <a
            href="#/live"
            className="mt-7 inline-block rounded-full bg-pitch-500 px-6 py-3 text-sm font-semibold text-ink-950 shadow-lg shadow-pitch-500/25 transition-transform hover:-translate-y-0.5 hover:bg-pitch-400"
          >
            Open the live board →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-ink-700/40 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-[12px] text-slate-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldMark className="h-5 w-5" />
          <span className="font-display font-semibold text-slate-300">GoalProof</span>
          <span>· Superteam World Cup · MIT</span>
        </div>
        <div className="flex items-center gap-5 font-mono">
          <span className="rounded bg-ink-800 px-2 py-0.5 text-slate-400">devnet</span>
          <a href="#/live" className="hover:text-pitch-300">live board →</a>
        </div>
      </div>
    </footer>
  );
}

/* ── Marks & icons ───────────────────────────────────────────────────────── */
function ShieldMark({ className = "" }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-pitch-400 to-pitch-600 shadow-lg shadow-pitch-500/20 ring-1 ring-white/20 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%] text-ink-950" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5l-8-3Z" fill="currentColor" fillOpacity="0.15" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

const iconCls = "h-5 w-5";
function IconProof() {
  return (
    <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" /><circle cx="6" cy="15" r="2" /><circle cx="18" cy="15" r="2" />
      <path d="M12 7v3m0 0-4.5 3.5M12 10l4.5 3.5" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconFeed() {
  return (
    <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconVault() {
  return (
    <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9V7" />
    </svg>
  );
}
function IconBot() {
  return (
    <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="11" rx="2" /><path d="M12 8V5M9 13h.01M15 13h.01" />
    </svg>
  );
}
