import { NextResponse } from "next/server";
import { chat, llmAvailable } from "@/lib/llm";
import { CHALLENGE_SYSTEM_HEAD } from "@/lib/prompts";
import { computeBalance, partyOf, PARTIES, ASSUMED_YIELD, TIERS } from "@/lib/water";
import { buildAgreement } from "@/lib/agreement";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question, yield_, claims, windows } = (await req.json()) as {
    question: string;
    yield_: number;
    claims?: Record<string, number>;
    windows?: Record<string, string>;
  };

  // Rebuild the amended party list the client is looking at. Terms renegotiated
  // at the table — a corrected claim, a moved window — have to reach the defend
  // path too, or it argues for a schedule nobody can see.
  const parties = PARTIES.map((p) => ({
    ...p,
    claim: claims?.[p.id] ?? p.claim,
    window: windows?.[p.id] ?? p.window,
  }));

  const balance = computeBalance(yield_, parties);
  const agreement = buildAgreement(
    balance,
    yield_ === ASSUMED_YIELD ? 1 : 2,
    parties
  );

  const facts = [
    `SUSTAINABLE YIELD: ${balance.yield_.toLocaleString()} L/day. TOTAL ALLOCATED: ${balance.allocated.toLocaleString()} L/day.`,
    "",
    "SCHEDULE:",
    ...agreement.schedule.map(
      (r) =>
        `- ${r.name}: ${r.litresPerDay.toLocaleString()} L/day (protected floor ${r.floor.toLocaleString()}, derived from ${r.floorBasis}), window ${r.window}, tolerance ±${r.tolerance.toLocaleString()} L, levy GHS ${r.levyMonthly}/month`
    ),
    ...balance.gated.map(
      (g) => `- ${partyOf(g.partyId).name}: 0 L/day — ${g.reason}`
    ),
    "",
    "TIER RULES:",
    ...Object.entries(TIERS).map(([k, v]) => `- ${k}: ${v.rule}`),
    "",
    "CLAUSES:",
    ...agreement.clauses.map((c) => `${c.n}. ${c.heading} — ${c.body}`),
  ].join("\n");

  const fallback = () => {
    const q = question.toLowerCase();
    const hit = agreement.schedule.find((r) =>
      q.includes(r.name.toLowerCase().split(" ")[0])
    );
    if (hit) {
      return `${hit.name} is allocated ${hit.litresPerDay.toLocaleString()} L/day, of which ${hit.floor.toLocaleString()} is a protected floor derived from ${hit.floorBasis}. Abstraction window ${hit.window}, tolerance ±${hit.tolerance.toLocaleString()} L on a 7-day rolling average, maintenance levy GHS ${hit.levyMonthly} per month. The floor is not tradeable; the volume above it was set by weighted fill across all parties against a tested yield of ${balance.yield_.toLocaleString()} L/day.`;
    }
    return facts;
  };

  if (!llmAvailable()) {
    return NextResponse.json({ answer: fallback(), source: "deterministic" });
  }

  const raw = await chat([
    { role: "system", content: `${CHALLENGE_SYSTEM_HEAD}\n${facts}` },
    { role: "user", content: String(question).slice(0, 800) },
  ]);

  return NextResponse.json({
    answer: raw ?? fallback(),
    source: raw ? "llm" : "deterministic",
  });
}
