"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  PARTIES,
  TIERS,
  computeBalance,
  diffBalances,
  partyOf,
  ASSUMED_YIELD,
  type Party,
} from "@/lib/water";
import { buildAgreement, agreementFaults } from "@/lib/agreement";
import { MOVES, PHASES, SPEAKERS, fillFigures, type Flag, type FlagKind, type Effect } from "@/lib/negotiation";
import { FACTS, TABLED_REPORT } from "@/lib/facts";
import { MEDIATOR_SYSTEM, PROMPT_NOTES, ENGINE_GUARD } from "@/lib/prompts";
import JudgesNote from "./JudgesNote";

type View = "brief" | "table" | "agreement" | "prompt" | "judges";
interface Line {
  speaker: string;
  text: string;
  flags?: Flag[];
}

const L = (n: number) => Math.round(n).toLocaleString();

const FLAG_TONE: Record<Flag["kind"], string> = {
  FABRICATION: "text-against",
  CONTRADICTION: "text-against",
  AUTHORITY_PRESSURE: "text-mark",
  UNVERIFIED: "text-mark",
  BLOC_SPLIT: "text-mark",
  SHOCK: "text-against",
  INTEGRATIVE: "text-place",
};

function FlagRow({ f }: { f: Flag }) {
  return (
    <li className="ev-in">
      <span
        className={`block text-[11px] font-semibold uppercase tracking-[0.07em] ${FLAG_TONE[f.kind]}`}
      >
        {f.kind.replace(/_/g, " ")}
      </span>
      <span className="mt-1 block text-[11.5px] leading-[1.5] text-muted">
        {f.note}
      </span>
    </li>
  );
}

const RAIL_TABS = [
  { id: "allocation" as const, label: "Allocation" },
  { id: "flags" as const, label: "Flags" },
  { id: "record" as const, label: "Record" },
];

/** Floor solid, discretionary lighter. The floor is the part that cannot move. */
function AllocBar({
  floor,
  total,
  scale,
  tier,
}: {
  floor: number;
  total: number;
  scale: number;
  tier: Party["tier"];
}) {
  const tone =
    tier === "survival"
      ? ["bg-accent", "bg-accent/30"]
      : tier === "livelihood"
      ? ["bg-place", "bg-place/30"]
      : ["bg-mark", "bg-mark/25"];
  return (
    <div className="relative h-2 flex-1 rounded-full bg-rule-soft overflow-hidden">
      <div
        className={`bar-fill absolute inset-y-0 left-0 ${tone[1]}`}
        style={{ width: `${Math.min(100, (total / scale) * 100)}%` }}
      />
      <div
        className={`bar-fill absolute inset-y-0 left-0 ${tone[0]}`}
        style={{ width: `${Math.min(100, (floor / scale) * 100)}%` }}
      />
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("brief");
  const [moveIndex, setMoveIndex] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [yield_, setYield] = useState(ASSUMED_YIELD);
  const [claims, setClaims] = useState<Record<string, number>>({});
  const [windows, setWindows] = useState<Record<string, string>>({});
  const [record, setRecord] = useState<string[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [reportTabled, setReportTabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seat, setSeat] = useState("cashcrop");
  const [input, setInput] = useState("");
  const [challenge, setChallenge] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [shockPulse, setShockPulse] = useState(false);

  /** Same kind caught twice is one line with a count, not two identical rows. */
  const flagTally = useMemo(() => {
    const n = new Map<FlagKind, number>();
    for (const f of flags) n.set(f.kind, (n.get(f.kind) ?? 0) + 1);
    return [...n.entries()];
  }, [flags]);
  const [rail, setRail] = useState<(typeof RAIL_TABS)[number]["id"]>(
    "allocation"
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const parties: Party[] = useMemo(
    () =>
      PARTIES.map((p) => ({
        ...p,
        claim: claims[p.id] ?? p.claim,
        window: windows[p.id] ?? p.window,
      })),
    [claims, windows]
  );

  const balance = useMemo(
    () => computeBalance(yield_, parties),
    [yield_, parties]
  );
  const assumedBalance = useMemo(
    () => computeBalance(ASSUMED_YIELD, parties),
    [parties]
  );
  const agreement = useMemo(
    () => buildAgreement(balance, yield_ === ASSUMED_YIELD ? 1 : 2, parties),
    [balance, yield_, parties]
  );
  const faults = useMemo(() => agreementFaults(agreement, balance), [agreement, balance]);
  const shocked = yield_ !== ASSUMED_YIELD;
  const deltas = useMemo(
    () => (shocked ? diffBalances(assumedBalance, balance) : []),
    [shocked, assumedBalance, balance]
  );

  const started = lines.length > 0;
  const phase = MOVES[Math.min(moveIndex, MOVES.length - 1)]?.phase ?? "closing";
  const done = moveIndex >= MOVES.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [lines]);

  function applyEffects(fx: Effect[] | undefined) {
    for (const e of fx ?? []) {
      if (e.kind === "yield") {
        setYield(e.to);
        setShockPulse(true);
        setTimeout(() => setShockPulse(false), 1400);
      } else if (e.kind === "claim") {
        setClaims((c) => ({ ...c, [e.party]: e.to }));
      } else if (e.kind === "window") {
        setWindows((w) => ({ ...w, [e.party]: e.to }));
      } else if (e.kind === "record") {
        setRecord((r) => [...r, `${partyOf(e.party).name}: ${e.statement}`]);
      }
    }
  }

  function playMove(i: number) {
    const m = MOVES[i];
    if (!m) return;
    if (m.id === "m7") setReportTabled(true);
    setLines((ls) => [
      ...ls,
      { speaker: m.speaker, text: m.text },
      { speaker: "mediator", text: m.mediator, flags: m.flags },
    ]);
    if (m.flags?.length) setFlags((f) => [...f, ...m.flags!]);
    applyEffects(m.effects);
    setMoveIndex(i + 1);
  }

  async function runAll() {
    setRunning(true);
    setView("table");
    for (let i = moveIndex; i < MOVES.length; i++) {
      playMove(i);
      const m = MOVES[i];
      await new Promise((r) => setTimeout(r, m.effects?.some((e) => e.kind === "yield") ? 1900 : 900));
    }
    setRunning(false);
    setView("agreement");
  }

  async function speak() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setBusy(true);
    const next = [...lines, { speaker: seat, text }];
    setLines(next);
    try {
      const res = await fetch("/api/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: seat,
          transcript: next.map((l) => ({ speaker: l.speaker, text: l.text })),
          moveIndex,
          record,
          currentYield: yield_,
          reportTabled,
        }),
      });
      const d = await res.json();
      setSource(d.source);
      setLines((ls) => [...ls, { speaker: "mediator", text: d.reply, flags: d.flags }]);
      if (d.flags?.length) setFlags((f) => [...f, ...d.flags]);
      applyEffects(d.effects);
    } finally {
      setBusy(false);
    }
  }

  function engineerShock() {
    const m = MOVES.find((x) => x.id === "m11")!;
    setLines((ls) => [
      ...ls,
      { speaker: "engineer", text: m.text },
      { speaker: "mediator", text: m.mediator, flags: m.flags },
    ]);
    setFlags((f) => [...f, ...(m.flags ?? [])]);
    applyEffects(m.effects);
  }

  async function ask(q?: string) {
    const question = (q ?? challenge).trim();
    if (!question) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the renegotiated terms too. Defending the original schedule
        // while the screen shows an amended one is worse than not defending it.
        body: JSON.stringify({ question, yield_, claims, windows }),
      });
      const d = await res.json();
      setAnswer(d.answer);
      setSource(d.source);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMoveIndex(0);
    setLines([]);
    setYield(ASSUMED_YIELD);
    setClaims({});
    setWindows({});
    setRecord([]);
    setFlags([]);
    setReportTabled(false);
    setAnswer(null);
    setChallenge("");
    setView("brief");
  }

  const tab = (id: View, label: string, enabled = true) => (
    <button
      key={id}
      onClick={() => enabled && setView(id)}
      disabled={!enabled}
      title={enabled ? undefined : "Available once the mediation has started"}
      className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${
        view === id
          ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
          : enabled
          ? "text-muted hover:text-ink"
          : "text-rule cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-5 sm:px-7 py-3.5">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">The Mediator</h1>
            <p className="text-[12px] text-muted">
              Nkwanta borehole · {PARTIES.length} parties ·{" "}
              <span className={shocked ? "text-against font-medium" : ""}>
                {L(yield_)} L/day sustainable yield
              </span>
            </p>
          </div>

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-panel border border-rule sm:ml-2 order-3 sm:order-none w-full sm:w-auto overflow-x-auto">
            {tab("brief", "Brief")}
            {tab("table", "The table", started || running)}
            {tab("agreement", "Agreement", started)}
            {tab("prompt", "Prompt")}
            {tab("judges", "For judges")}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {started && (
              <span className="tnum hidden md:inline text-[12px] text-muted">
                {PHASES.find((p) => p.id === phase)?.label}
              </span>
            )}
            <button
              onClick={runAll}
              disabled={running || done}
              className="px-3.5 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
            >
              {running ? "Mediating…" : done ? "Concluded" : "Run the mediation"}
            </button>
            <button
              onClick={reset}
              className="px-3 py-2 rounded-lg border border-rule text-[13px] text-ink-soft hover:bg-panel transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------- */}
      {view === "brief" && (
        <div className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
          <button
            onClick={() => setView("judges")}
            className="mb-8 flex w-full items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-left transition-colors hover:border-accent/45"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-accent">
                Judging this? Start here
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-ink-soft">
                How it works, every constraint from the brief and where it is
                met, and four things to try.
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-accent">
              &rarr;
            </span>
          </button>

          <p className="text-[13px] text-muted mb-5">The problem</p>
          <p className="text-[22px] sm:text-[26px] leading-[1.35] tracking-[-0.015em] text-balance">
            One borehole. Five claims on it, one of them speculative, one of them
            newer than the others. And it is drying up faster than anyone at the
            table has been told.
          </p>

          <div className="mt-8 space-y-4 text-[14.5px] leading-[1.65] text-ink-soft">
            <p>
              This is a mediator, not a judge. It does not rule and it does not
              pick a winner. What it produces is an agreement: volumes in litres
              per day, the hours each party may draw, how compliance is measured,
              and what happens the third time somebody takes more than their
              share.
            </p>
            <p>
              The model runs the room. It does not compute a single litre. A water
              balance derives every protected floor from a headcount, fills what
              is left by tier, and refuses to produce an agreement that overdraws
              the aquifer — which is the failure an eloquent mediator makes most
              often.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-2.5">
            <button
              onClick={runAll}
              disabled={running}
              className="px-4 py-2.5 rounded-lg bg-ink text-paper text-[13.5px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
            >
              Run the mediation
            </button>
            <button
              onClick={() => setView("table")}
              className="px-4 py-2.5 rounded-lg border border-rule text-[13.5px] hover:bg-panel transition-colors"
            >
              Sit at the table yourself
            </button>
          </div>

          <div className="mt-14 pt-8 border-t border-rule">
            <p className="text-[13px] text-muted mb-4">Who is at the table</p>
            <ul className="space-y-3.5">
              {PARTIES.map((p) => (
                <li key={p.id} className="text-[13.5px] leading-[1.55]">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-panel border border-rule text-muted">
                      {TIERS[p.tier].label.toLowerCase()}
                    </span>
                    <span className="tnum text-muted">asking {L(p.claim)} L/day</span>
                  </div>
                  <div className="text-muted">{p.seat}</div>
                </li>
              ))}
              <li className="text-[13.5px] leading-[1.55] pt-2 border-t border-rule-soft">
                <span className="font-medium">Sena Kudjoe</span>
                <span className="text-muted"> — well engineer. Not a claimant. Has been running a pump test.</span>
              </li>
            </ul>
            <p className="tnum mt-5 text-[13px] text-muted">
              Claims total {L(PARTIES.reduce((s, p) => s + p.claim, 0))} L/day
              against an assumed {L(ASSUMED_YIELD)}. It does not fit before the
              negotiation starts.
            </p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {view === "table" && (
        <div className="grid lg:grid-cols-[1fr_360px]">
          <section className="flex flex-col lg:max-h-[calc(100vh-65px)] border-b lg:border-b-0 lg:border-r border-rule">
            {/* Identity and turn count only — the party roster and figures
                already live in the top bar and the rail. */}
            <div className="border-b border-rule px-6 py-4 sm:px-8">
              <div className="text-[17px] font-semibold tracking-[-0.012em]">
                Nkwanta Borehole · Mediation session
              </div>
              <div className="text-[13px] text-muted">
                {PHASES.find((p) => p.id === phase)?.label} · {moveIndex} of{" "}
                {MOVES.length} turns
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 min-h-[380px]"
            >
              {!started && (
                <p className="text-[14px] leading-[1.6] text-muted max-w-[62ch]">
                  Nobody has spoken yet. Run the mediation to watch all five
                  parties negotiate to a signed agreement, or take a seat below
                  and open the meeting yourself.
                </p>
              )}

              {started && (
                <div className="mb-4 hidden xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-x-8">
                  <span className="text-[10px] uppercase tracking-[0.11em] text-muted">
                    Negotiation
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.11em] text-muted">
                    What the mediator caught
                  </span>
                </div>
              )}

              {/* Dialogue and flags are different kinds of thing, so they get
                  different columns rather than different margins. */}
              <div className="space-y-6">
                {lines.map((l, i) => {
                  const isMed = l.speaker === "mediator";
                  const who = SPEAKERS[l.speaker];
                  return (
                    <div
                      key={i}
                      className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-x-8"
                    >
                      <div>
                        <div className="text-[11.5px] text-muted mb-1">
                          {isMed ? "Mediator" : `${who?.name ?? l.speaker} · ${who?.role ?? ""}`}
                        </div>
                        <p
                          className={
                            isMed
                              ? "max-w-[62ch] text-[15px] leading-[1.62]"
                              : "max-w-[62ch] text-[15px] leading-[1.62] text-ink-soft pl-3 border-l-2 border-rule"
                          }
                        >
                          {fillFigures(l.text, balance)}
                        </p>
                      </div>
                      {!!l.flags?.length && (
                        <ul className="mt-3 space-y-3 border-l border-rule-soft pl-4 xl:mt-0">
                          {l.flags.map((f, j) => (
                            <FlagRow key={j} f={f} />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-rule px-6 sm:px-8 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10.5px] uppercase tracking-wider text-muted w-9">
                  Demo
                </span>
                <button
                  onClick={() => playMove(moveIndex)}
                  disabled={done || busy || running}
                  className="px-2.5 py-1.5 rounded-md border border-rule text-[12px] text-ink-soft hover:bg-panel disabled:opacity-35 transition-colors"
                >
                  Step one turn · {moveIndex}/{MOVES.length}
                </button>
                {!shocked && (
                  <button
                    onClick={engineerShock}
                    disabled={busy || running}
                    className="px-2.5 py-1.5 rounded-md border border-against/40 text-[12px] text-against hover:bg-against-soft disabled:opacity-35 transition-colors"
                  >
                    Engineer interrupts with the pump test
                  </button>
                )}
                {source && (
                  <span className="text-[11px] text-muted">
                    {source === "llm" ? "live model" : source}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-[10.5px] uppercase tracking-wider text-muted w-9 pt-2.5">
                  Live
                </span>
                <p className="flex-1 min-w-[240px] text-[12px] leading-[1.5] text-muted pt-2">
                  Take a seat and the mediator answers in real time — against the
                  record, and against what that seat said earlier. Try arguing
                  from authority, or tabling a figure that contradicts you.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:pl-11">
                <select
                  value={seat}
                  onChange={(e) => setSeat(e.target.value)}
                  className="bg-surface border border-rule rounded-lg px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                >
                  {Object.entries(SPEAKERS).map(([id, s]) => (
                    <option key={id} value={id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && speak()}
                  placeholder="Speak as this party…"
                  className="flex-1 min-w-[180px] bg-surface border border-rule rounded-lg px-3 py-2 text-[13.5px] placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
                />
                <button
                  onClick={() => speak()}
                  disabled={busy}
                  className="px-3.5 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
                >
                  {busy ? "…" : "Say it"}
                </button>
              </div>
            </div>
          </section>

          {/* Water balance is pinned — it is this app's proof the terms add
              up, so it does not get relegated behind a tab. Everything else
              switches, because stacking all three at once was the wall of
              numbers judges tripped over. */}
          <aside className="flex flex-col lg:max-h-[calc(100vh-65px)]">
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <div className={shockPulse ? "pulse-once rounded-lg" : "rounded-lg"}>
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-[12px] font-medium text-muted">Water balance</h2>
                  <span
                    className={`tnum text-[12px] ${shocked ? "text-against font-medium" : "text-muted"}`}
                  >
                    {L(balance.allocated)} / {L(yield_)} L
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-rule-soft overflow-hidden mb-1">
                  <div
                    className="bar-fill absolute inset-y-0 left-0 bg-ink-soft rounded-full"
                    style={{ width: `${Math.min(100, (balance.allocated / yield_) * 100)}%` }}
                  />
                </div>
                <p className="text-[12px] text-muted">
                  {balance.feasible
                    ? `Floors ${L(balance.floorsTotal)} · discretionary pool ${L(balance.pool)}`
                    : "Floors exceed yield. This is a supply emergency, not a negotiation."}
                </p>
              </div>
            </div>

            <div className="px-4 pt-4 sm:px-5">
              <div className="flex gap-0.5 rounded-lg border border-rule bg-panel p-0.5">
                {RAIL_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRail(t.id)}
                    aria-pressed={rail === t.id}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                      rail === t.id
                        ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {rail === "allocation" && (
                <div>
                  <h2 className="text-[12px] font-medium text-muted mb-3">
                    Allocation {shocked ? "after the pump test" : "on assumed yield"}
                  </h2>
                  <div className="space-y-3">
                    {balance.allocations.map((a) => {
                      const p = parties.find((x) => x.id === a.partyId)!;
                      const d = deltas.find((x) => x.partyId === a.partyId);
                      return (
                        <div key={a.partyId}>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[13px] font-medium truncate">{p.name}</span>
                            <span className="tnum ml-auto text-[13px]">{L(a.total)}</span>
                            {d && d.change !== 0 && (
                              <span
                                className={`tnum text-[12px] ${d.change < 0 ? "text-against" : "text-place"}`}
                              >
                                {d.change > 0 ? "+" : ""}
                                {(d.pct * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <AllocBar
                            floor={a.floor}
                            total={a.total}
                            scale={Math.max(...balance.allocations.map((x) => x.total), 1)}
                            tier={p.tier}
                          />
                          <div className="mt-1 flex justify-between text-[12px] text-muted">
                            <span>
                              floor {L(a.floor)} · {TIERS[p.tier].label.toLowerCase()}
                            </span>
                            <span className="tnum">{(a.ofClaim * 100).toFixed(0)}% of ask</span>
                          </div>
                        </div>
                      );
                    })}
                    {balance.gated.map((g) => (
                      <div key={g.partyId} className="pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-muted truncate">
                            {partyOf(g.partyId).name}
                          </span>
                          <span className="tnum ml-auto text-[13px] text-muted">0</span>
                        </div>
                        <p className="mt-1 text-[12px] leading-[1.5] text-mark">
                          Deferred, not refused — reopens on filing a specification.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rail === "flags" &&
                (flags.length === 0 ? (
                  <p className="text-[12.5px] leading-[1.55] text-muted">
                    Nothing flagged yet. This fills the moment a claim can&rsquo;t
                    be verified, someone leans on authority, or the record
                    contradicts itself.
                  </p>
                ) : (
                  <>
                    <p className="mb-2.5 text-[12px] text-muted">
                      {flags.length} caught so far. The detail sits beside the
                      turn that caused it.
                    </p>
                    <ul className="space-y-1.5">
                      {flagTally.map(([kind, n]) => (
                        <li
                          key={kind}
                          className="flex items-baseline gap-2 text-[12.5px] leading-snug"
                        >
                          <span className={`font-semibold ${FLAG_TONE[kind]}`}>
                            {kind.replace(/_/g, " ").toLowerCase()}
                          </span>
                          {n > 1 && (
                            <span className="tnum ml-auto text-[11.5px] text-muted">
                              ×{n}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ))}

              {rail === "record" &&
                (record.length === 0 ? (
                  <p className="text-[12.5px] leading-[1.55] text-muted">
                    Nothing on the record yet. Every substantive claim a party
                    makes is logged here, so a later contradiction is checked
                    against the whole history rather than the last thing said.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {record.slice(-6).map((r, i) => (
                      <li key={i} className="text-[12px] leading-snug text-muted">
                        {r}
                      </li>
                    ))}
                  </ul>
                ))}
            </div>

            {started && (
              <div className="border-t border-rule p-4 sm:p-5">
                <button
                  onClick={() => setView("agreement")}
                  className="w-full px-3 py-2.5 rounded-lg border border-rule text-[13px] hover:bg-panel transition-colors"
                >
                  See the agreement
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {view === "agreement" && (
        <div className="mx-auto max-w-[46rem] px-6 py-12 sm:py-16">
          <p className="text-[13px] text-muted">
            {done ? "Agreed and signed." : "Draft — the negotiation is still open."}{" "}
            Revision {shocked ? 2 : 1}.
          </p>
          <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.25] tracking-[-0.02em] text-balance">
            Nkwanta Borehole Sharing Agreement
          </h2>
          <p className="tnum mt-3 text-[13.5px] text-muted">
            {L(agreement.totalAllocated)} L/day allocated against a tested
            sustainable yield of {L(agreement.yield_)} L/day.
            {agreement.headroom > 0 && ` ${L(agreement.headroom)} L/day unallocated.`}
          </p>

          {faults.length > 0 ? (
            <div className="mt-5 rounded-lg border border-against/40 bg-against-soft p-4">
              <p className="text-[13px] font-medium text-against mb-1.5">
                This document cannot be signed.
              </p>
              <ul className="space-y-1">
                {faults.map((f, i) => (
                  <li key={i} className="text-[13px] leading-[1.55] text-ink-soft">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] text-place">
              Balances. Every protected floor is met.
            </p>
          )}

          <h3 className="mt-10 text-[13px] font-medium">Schedule of allocations</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[13px] border-y border-rule">
              <thead>
                <tr className="text-left text-[11.5px] text-muted">
                  <th className="py-2.5 pr-3 font-medium">Party</th>
                  <th className="py-2.5 pr-3 font-medium tnum">L/day</th>
                  <th className="py-2.5 pr-3 font-medium tnum">of which floor</th>
                  <th className="py-2.5 pr-3 font-medium">Window</th>
                  <th className="py-2.5 font-medium tnum">Levy/mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule-soft">
                {agreement.schedule.map((r) => (
                  <tr key={r.partyId}>
                    <td className="py-2.5 pr-3">{r.name}</td>
                    <td className="py-2.5 pr-3 tnum">{L(r.litresPerDay)}</td>
                    <td className="py-2.5 pr-3 tnum text-muted">{L(r.floor)}</td>
                    <td className="py-2.5 pr-3 text-muted">{r.window}</td>
                    <td className="py-2.5 tnum text-muted">GHS {r.levyMonthly}</td>
                  </tr>
                ))}
                {balance.gated.map((g) => (
                  <tr key={g.partyId}>
                    <td className="py-2.5 pr-3 text-muted">{partyOf(g.partyId).name}</td>
                    <td className="py-2.5 pr-3 tnum text-muted">0</td>
                    <td className="py-2.5 pr-3 tnum text-muted">—</td>
                    <td className="py-2.5 pr-3 text-muted">Deferred, Clause 9</td>
                    <td className="py-2.5 tnum text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 text-[13px] font-medium">Terms</h3>
          <dl className="mt-3 divide-y divide-rule border-y border-rule">
            {agreement.clauses.map((c) => (
              <div key={c.n} className="py-4">
                <dt className="flex items-baseline gap-2.5">
                  <span className="tnum text-[12px] text-muted w-4">{c.n}</span>
                  <span className="text-[13.5px] font-medium">{c.heading}</span>
                  {c.derived && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent">
                      computed
                    </span>
                  )}
                </dt>
                <dd className="mt-1.5 ml-7 text-[13.5px] leading-[1.6] text-muted whitespace-pre-line">
                  {c.body}
                </dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-10 text-[13px] font-medium">Signatories</h3>
          <ul className="mt-3 space-y-2">
            {agreement.signatories.map((s) => (
              <li key={s.name} className="sm:flex gap-4 text-[13px]">
                <span className="sm:w-56 sm:shrink-0">{s.name}</span>
                <span className="text-muted">{s.capacity}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <h3 className="text-[13px] font-medium mb-1">Challenge a term</h3>
            <p className="text-[13px] leading-[1.55] text-muted mb-3.5 max-w-[60ch]">
              It answers from the agreement and the balance. It cannot move a
              figure, and it will not concede that the allocation should have
              been different.
            </p>
            <div className="flex gap-2">
              <input
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="The school opened this year. Why does it outrank farms that have been here for decades?"
                className="flex-1 bg-surface border border-rule rounded-lg px-3 py-2.5 text-[13.5px] placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
              />
              <button
                onClick={() => ask()}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
              >
                {busy ? "…" : "Ask"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[
                "Why does the District Assembly get nothing?",
                "Cash-crop lost 59%. Justify that.",
                "Why not just cut everyone by 40%?",
                "What happens if someone overdraws?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setChallenge(q);
                    ask(q);
                  }}
                  className="text-[12px] px-2.5 py-1 rounded-full border border-rule text-muted hover:text-ink hover:bg-panel transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            {answer && (
              <div className="mt-4 rounded-lg bg-panel border border-rule p-4 text-[13.5px] leading-[1.65] text-ink-soft whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {view === "prompt" && (
        <div className="mx-auto max-w-[46rem] px-6 py-12 sm:py-16">
          <p className="text-[13px] text-muted">What the model is told</p>
          <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.25] tracking-[-0.02em] text-balance">
            The mediator prompt, verbatim.
          </h2>
          <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-soft">
            This is the entire system prompt sent on every turn. It runs the room
            and records what was established. It cannot move a litre, because no
            volume passes through it.
          </p>
          <pre className="mt-7 rounded-lg bg-panel border border-rule p-4 text-[12px] leading-[1.6] text-ink-soft whitespace-pre-wrap font-mono overflow-x-auto">
            {MEDIATOR_SYSTEM}
          </pre>

          <h3 className="mt-11 text-[13px] font-medium">Why each rule is there</h3>
          <dl className="mt-4 divide-y divide-rule border-y border-rule">
            {PROMPT_NOTES.map((n) => (
              <div key={n.rule} className="py-3.5">
                <dt className="text-[13.5px] font-medium">{n.rule}</dt>
                <dd className="mt-1 text-[13.5px] leading-[1.6] text-muted">{n.why}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-11 text-[13px] font-medium">The record it checks against</h3>
          <dl className="mt-4 divide-y divide-rule border-y border-rule">
            {FACTS.map((f) => (
              <div key={f.id} className="py-3.5">
                <dt className="text-[12px] text-muted">{f.source}</dt>
                <dd className="mt-1 text-[13.5px] leading-[1.6]">{f.statement}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-11 text-[13px] font-medium">The prompt is not the only defence</h3>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-muted">{ENGINE_GUARD}</p>
        </div>
      )}

      {view === "judges" && <JudgesNote tabled={TABLED_REPORT} />}
    </main>
  );
}
