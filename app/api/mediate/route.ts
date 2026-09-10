import { NextResponse } from "next/server";
import { chat, parseJson, llmAvailable } from "@/lib/llm";
import { MEDIATOR_SYSTEM } from "@/lib/prompts";
import { FACTS, TABLED_REPORT } from "@/lib/facts";
import { PARTIES, TIERS, ASSUMED_YIELD } from "@/lib/water";
import { MOVES, SPEAKERS, type Flag, type Effect } from "@/lib/negotiation";

export const runtime = "nodejs";

const VALID_FLAGS = new Set([
  "FABRICATION",
  "AUTHORITY_PRESSURE",
  "BLOC_SPLIT",
  "CONTRADICTION",
  "SHOCK",
  "INTEGRATIVE",
  "UNVERIFIED",
]);
const PARTY_IDS = new Set(PARTIES.map((p) => p.id));

interface Out {
  reply?: string;
  flags?: unknown[];
  effects?: unknown[];
  note?: string;
}

/**
 * The model never touches the balance directly. Effects are whitelisted by kind
 * and by party, litre figures are clamped, and yield — the one number that
 * moves everything — is only revisable from the engineer's seat.
 */
function sanitise(out: Out) {
  const flags: Flag[] = [];
  for (const raw of Array.isArray(out.flags) ? out.flags : []) {
    const f = raw as Record<string, unknown>;
    const kind = String(f.kind ?? "");
    if (!VALID_FLAGS.has(kind)) continue;
    flags.push({ kind: kind as Flag["kind"], note: String(f.note ?? "").slice(0, 400) });
  }

  const effects: Effect[] = [];
  for (const raw of Array.isArray(out.effects) ? out.effects : []) {
    const e = raw as Record<string, unknown>;
    const kind = String(e.kind ?? "");
    const party = String(e.party ?? "");
    if (kind === "record" && PARTY_IDS.has(party)) {
      effects.push({ kind: "record", party, statement: String(e.statement ?? "").slice(0, 300) });
    } else if (kind === "claim" && PARTY_IDS.has(party)) {
      const to = Number(e.to);
      const base = PARTIES.find((p) => p.id === party)!;
      // Downward only. A party can concede at the table; it cannot talk its way
      // to a larger ask, and even a conceded figure is capped again by the
      // party's needCeiling before the balance uses it.
      if (Number.isFinite(to) && to >= 0 && to <= base.claim) {
        effects.push({ kind: "claim", party, to: Math.round(to), was: base.claim });
      }
    } else if (kind === "window" && PARTY_IDS.has(party)) {
      effects.push({ kind: "window", party, to: String(e.to ?? "").slice(0, 80) });
    }
    // "yield" is deliberately not reachable from here. Only the engineer seat
    // revises sustainable yield, and the client sends that as an explicit
    // action rather than as model output.
  }

  return { flags, effects };
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    speaker,
    transcript,
    moveIndex,
    record,
    currentYield,
    reportTabled,
  }: {
    speaker: string;
    transcript: { speaker: string; text: string }[];
    moveIndex: number;
    record: string[];
    currentYield: number;
    reportTabled: boolean;
  } = body;

  const scripted = MOVES[Math.min(moveIndex ?? 0, MOVES.length - 1)];

  if (!llmAvailable()) {
    return NextResponse.json({
      reply: scripted.mediator,
      flags: scripted.flags ?? [],
      effects: (scripted.effects ?? []).filter((e) => e.kind !== "yield"),
      note: null,
      source: "scripted",
    });
  }

  const who = SPEAKERS[speaker] ?? { name: speaker, role: "party" };

  const context = [
    `SUSTAINABLE YIELD CURRENTLY ASSUMED: ${currentYield ?? ASSUMED_YIELD} L/day.`,
    "",
    "PARTIES, TIERS AND PROTECTED FLOORS:",
    ...PARTIES.map(
      (p) =>
        `- ${p.name} (${p.id}) — tier ${p.tier}, asking ${p.claim} L/day, protected floor ${p.floor} L/day (${p.floorBasis})${p.bloc ? `, member of the "${p.bloc}" bloc` : ""}`
    ),
    "",
    "TIER RULES:",
    ...Object.entries(TIERS).map(([k, v]) => `- ${k}: ${v.rule}`),
    "",
    "THE VERIFIABLE RECORD — check any claim against this:",
    // The pump test is withheld until the engineer actually delivers it.
    // Leaving it in the record lets the mediator quote a yield nobody at the
    // table has been told yet, which destroys the point of a mid-negotiation
    // revision.
    ...FACTS.filter(
      (f) => f.id !== "pumptest" || (currentYield ?? ASSUMED_YIELD) !== ASSUMED_YIELD
    ).map((f) => `- [${f.source}] ${f.statement}`),
    "",
    reportTabled
      ? [
          "A DOCUMENT HAS BEEN TABLED. Do arithmetic on it before accepting it:",
          `  Title: ${TABLED_REPORT.title} (${TABLED_REPORT.author})`,
          `  Period: ${TABLED_REPORT.period}`,
          ...TABLED_REPORT.headline.map((h) => `  Headline: ${h}`),
          ...TABLED_REPORT.annex.map((a) => `  Annex: ${a}`),
        ].join("\n")
      : "",
    "",
    "ALREADY ESTABLISHED AT THIS TABLE (check the new statement against these for contradictions):",
    ...(Array.isArray(record) && record.length
      ? record.slice(-16).map((r) => `- ${r}`)
      : ["- nothing yet"]),
  ]
    .filter(Boolean)
    .join("\n");

  const convo = (transcript ?? [])
    .slice(-14)
    .map(
      (t: { speaker: string; text: string }) =>
        `${t.speaker === "mediator" ? "MEDIATOR" : (SPEAKERS[t.speaker]?.name ?? t.speaker).toUpperCase()}: ${t.text}`
    )
    .join("\n");

  const raw = await chat(
    [
      { role: "system", content: MEDIATOR_SYSTEM },
      {
        role: "user",
        content: `${context}\n\nTRANSCRIPT SO FAR:\n${convo}\n\n${who.name} (${who.role}) has just spoken. Respond as the mediator: check what they said against the record and against what they said earlier, then take the negotiation forward.

Return ONLY the JSON object described in your instructions. No text before or after it.`,
      },
    ],
    { json: true }
  );

  const parsed = parseJson<Out>(raw);

  // Salvage: the model answered in prose. Use the answer, record no flags or
  // effects, and say so in the source rather than pretending it was structured.
  if (!parsed?.reply && raw && raw.trim().length > 60) {
    return NextResponse.json({
      reply: raw.trim().slice(0, 1200),
      flags: [],
      effects: [],
      note: null,
      source: "llm-prose",
    });
  }

  if (!parsed?.reply) {
    return NextResponse.json({
      reply: scripted.mediator,
      flags: scripted.flags ?? [],
      effects: (scripted.effects ?? []).filter((e) => e.kind !== "yield"),
      note: null,
      source: "scripted-fallback",
    });
  }

  const { flags, effects } = sanitise(parsed);
  return NextResponse.json({
    reply: String(parsed.reply).slice(0, 1200),
    flags,
    effects,
    note: parsed.note ? String(parsed.note).slice(0, 300) : null,
    source: "llm",
  });
}
