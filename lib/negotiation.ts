import { TESTED_YIELD, type Balance } from "./water.ts";

export type FlagKind =
  | "FABRICATION"
  | "AUTHORITY_PRESSURE"
  | "BLOC_SPLIT"
  | "CONTRADICTION"
  | "SHOCK"
  | "INTEGRATIVE"
  | "UNVERIFIED";

export interface Flag {
  kind: FlagKind;
  note: string;
}

export type Effect =
  | { kind: "yield"; to: number }
  | { kind: "claim"; party: string; to: number; was: number }
  | { kind: "window"; party: string; to: string }
  | { kind: "record"; party: string; statement: string }
  | { kind: "split"; bloc: string; into: string[] };

export type Phase = "positions" | "testing" | "shock" | "rebuild" | "closing";

export const PHASES: { id: Phase; label: string; note: string }[] = [
  { id: "positions", label: "Opening positions", note: "What each party says it needs, before anything is checked." },
  { id: "testing", label: "Testing the claims", note: "Evidence, arithmetic, and who is actually speaking for whom." },
  { id: "shock", label: "The pump test", note: "New technical information arrives mid-negotiation." },
  { id: "rebuild", label: "Renegotiation", note: "Every term reopens. Floors do not." },
  { id: "closing", label: "Closing", note: "Terms fixed, accountability agreed, signatures." },
];

export interface Move {
  id: string;
  phase: Phase;
  /** Party id, or "engineer". */
  speaker: string;
  text: string;
  /** What the mediator says back. */
  mediator: string;
  flags?: Flag[];
  effects?: Effect[];
}

export const SPEAKERS: Record<string, { name: string; role: string }> = {
  cashcrop: { name: "Kwame Adjetey", role: "Cash-crop growers" },
  subsistence: { name: "Adzo Mensimah", role: "Subsistence growers" },
  households: { name: "Mama Yaa Serwaa", role: "Household water committee" },
  school: { name: "Mr Owusu", role: "Headteacher, Nkwanta Community School" },
  district: { name: "Hon. Nartey", role: "District Assembly" },
  engineer: { name: "Sena Kudjoe", role: "Well engineer" },
};

export const MOVES: Move[] = [
  // ---------------------------------------------------------------- positions
  {
    id: "m1",
    phase: "positions",
    speaker: "cashcrop",
    text: "Twelve of us grow tomato and pepper for the Techiman market. We need 22,000 litres a day and we pump from four in the morning. I speak for the farmers here.",
    mediator:
      "Note the volume and the window separately — they are different asks and they will be settled separately. Before I write 'the farmers' anywhere: are all the farmers at this table growing for market?",
    effects: [
      { kind: "record", party: "cashcrop", statement: "12 farms, 22,000 L/day, window from 04:00, claims to speak for all farmers" },
    ],
  },
  {
    id: "m2",
    phase: "positions",
    speaker: "subsistence",
    text: "No. Thirty-four of us grow what we eat. Kwame does not speak for me. And what we need is not more water — it is water between six and nine, when the plants can take it. By then his pumps have dropped the pressure and nothing comes.",
    mediator:
      "Then there are two farming positions here, not one, and I will not let a single voice bind both. I am recording your need as a window, not a volume — that distinction may be worth more to you than litres.",
    flags: [
      {
        kind: "BLOC_SPLIT",
        note: "Farmers presented as one bloc. Two incompatible positions inside it: commercial volume versus subsistence timing. No term may bind the bloc as a whole until both are settled.",
      },
      {
        kind: "INTEGRATIVE",
        note: "Subsistence need is expressed as access hours rather than volume. Timing can be granted without spending litres, which is value created rather than divided.",
      },
    ],
    effects: [
      { kind: "split", bloc: "farmers", into: ["cashcrop", "subsistence"] },
      { kind: "record", party: "subsistence", statement: "34 plots; binding constraint is the 06:00–09:00 window, not volume" },
    ],
  },
  {
    id: "m3",
    phase: "positions",
    speaker: "households",
    text: "Ninety-six houses. Four hundred and sixty-two people. We are asking fourteen thousand — that is drinking, cooking, washing, and the animals.",
    mediator:
      "Of that fourteen, 9,240 is not a request. It is 462 people at twenty litres each, which is the point below which people get sick. I am placing that on the protected floor before any bargaining starts, and it stays there whatever else is agreed.",
    effects: [{ kind: "record", party: "households", statement: "96 households, 462 people, 14,000 L/day ask" }],
  },
  {
    id: "m4",
    phase: "positions",
    speaker: "school",
    text: "Three hundred and eighty children. I know we have no history here — the school opened in January and nobody counted us when the borehole was shared out. I am asking for 4,200, and I am aware I am asking last.",
    mediator:
      "Being new is not a weaker claim, it is an absent record, and those are different things. Your floor is 380 pupils at five litres — 1,900 litres — and it is derived from enrolment, not from seniority. It goes in beside the households' floor with the same protection. Order of arrival is not a water-sharing principle.",
    effects: [{ kind: "record", party: "school", statement: "380 pupils, 4,200 L/day ask, no historical allocation" }],
  },
  {
    id: "m5",
    phase: "positions",
    speaker: "district",
    text: "The Assembly has minuted a future development project for this area. We will require twelve thousand litres a day held in reserve. I would prefer this is agreed today so I can report it upward.",
    mediator:
      "What is the project, how many people does it serve, and when does it start? I am not asking rhetorically — I need a number to write in a schedule and something to measure compliance against.",
    effects: [{ kind: "record", party: "district", statement: "12,000 L/day reserve for an unnamed future project" }],
  },

  // ----------------------------------------------------------------- testing
  {
    id: "m6",
    phase: "testing",
    speaker: "district",
    text: "The details are still with the planning office. But the Assembly's position is settled, and I think you will find it is not really for this meeting to reopen.",
    mediator:
      "The Assembly's position is settled for the Assembly. This table allocates water, and I cannot write 'twelve thousand litres for a project to be described later' into a document that other people are expected to comply with. You will get a clause — Clause 9 — that costs you nothing: zero litres now, and the agreement reopens within thirty days of you filing a beneficiary count, a start date and a design. Until then the water stays in the ground rather than going to anyone else, so nobody is taking it from you.",
    flags: [
      {
        kind: "AUTHORITY_PRESSURE",
        note: "Institutional standing invoked to close discussion rather than to supply evidence. Recorded, and given no weight. The claim is assessed on the same basis as every other.",
      },
      {
        kind: "UNVERIFIED",
        note: "No beneficiary count, start date or specification. Cannot be allocated against; deferred with an automatic reopening trigger rather than refused.",
      },
    ],
  },
  {
    id: "m7",
    phase: "testing",
    speaker: "cashcrop",
    text: "Before you cut us — here is an efficiency assessment from Adom Agri-Services. Fourteen days of continuous metering in August. It shows we draw 9,200 a day and the households draw 26,000. The pressure on this borehole is domestic, not commercial.",
    mediator:
      "Two things, and neither is about your honesty. First, your own annex: 0.9 hectares at 2.4 millimetres a day is 9,000 square metres times 0.0024 metres, which is 21.6 cubic metres — 21,600 litres a day, not 9,200. The back of your report contradicts the front of it, and 21,600 is within two per cent of what you asked me for an hour ago. Second, the metering ran 12 to 25 August. The pump was down for rising-main repair from the 15th to the 22nd. Eight of those fourteen days have no reading to give.",
    flags: [
      {
        kind: "FABRICATION",
        note: "Tabled report broken on two independent checks: its annex refutes its own headline by a factor of 2.3, and it claims continuous metering across a documented eight-day pump outage. The 26,000 L/day household figure also implies 56 L/person/day hand-carried, against sub-meter readings of 11,800 L/day.",
      },
    ],
  },
  {
    id: "m8",
    phase: "testing",
    speaker: "cashcrop",
    text: "I paid a consultant. I did not sit with a calculator behind him. If the number is 21,600 then it is 21,600 — that is what we actually use.",
    mediator:
      "Then the record shows 21,600, and I am not going to spend this meeting deciding whether you were deceived or doing the deceiving, because it changes nothing about how much water is in the ground. It also changes nothing about your allocation, and you should know why: the balance was already computing your share against 21,600, because that is what 0.9 hectares on drip can justify. Your ask of 22,000 was never doing any work. What the annex has done is take away the argument, not the water. And every figure from here is checked against the wellhead totaliser and the maintenance log before it enters the schedule, yours and everyone else's.",
    effects: [{ kind: "claim", party: "cashcrop", to: 21600, was: 22000 }],
  },
  {
    id: "m9",
    phase: "testing",
    speaker: "cashcrop",
    text: "All twelve of our farms are on drip. That is why our efficiency is high.",
    mediator:
      "You told me at the start that you pump from four in the morning for the furrows on the lower plots. Those are not the same statement. Which is it — twelve on drip, or some still furrowing?",
    flags: [
      {
        kind: "CONTRADICTION",
        note: "Conflicts with the opening position recorded in move 1. Surfaced by comparing against the running record, not by memory of the last turn.",
      },
    ],
  },
  {
    id: "m10",
    phase: "testing",
    speaker: "cashcrop",
    text: "Seven on drip. Five still furrow. The five are the ones asking for the early window.",
    mediator:
      "Recorded. That also tells me your window need is five farms wide, not twelve, which makes Adzo's six-to-nine problem solvable without taking a litre from anyone.",
    flags: [
      {
        kind: "INTEGRATIVE",
        note: "The corrected fact shrinks the conflict: only 5 farms need the pre-dawn window, so the subsistence window can be protected by scheduling rather than by reallocating volume.",
      },
    ],
    effects: [
      { kind: "window", party: "cashcrop", to: "04:00–06:00 and 19:00–21:00" },
      { kind: "record", party: "cashcrop", statement: "7 farms drip, 5 furrow; window need is 5 farms wide" },
    ],
  },

  // ------------------------------------------------------------------- shock
  {
    id: "m11",
    phase: "shock",
    speaker: "engineer",
    text: "I have to stop this. I ran the step-drawdown test on Saturday. Sustainable yield is 28,800 litres a day, not 48,000. Static level has dropped 4.1 metres in fourteen months. Everything you have been dividing up is forty per cent larger than what is actually down there.",
    mediator:
      "Then every number on this table is void and we start the arithmetic again — not the relationships, the arithmetic. Nobody's floor moves, because floors were derived from headcount rather than from supply. What is gone is the discretionary layer, and I am going to be direct about where that falls hardest before anyone accuses me of hiding it.",
    flags: [
      {
        kind: "SHOCK",
        note: "Sustainable yield revised from 48,000 to 28,800 L/day, a 40% reduction, delivered after positions were tabled. Every allocated term is recomputed; protected floors are unchanged by construction.",
      },
    ],
    effects: [{ kind: "yield", to: TESTED_YIELD }],
  },

  // ----------------------------------------------------------------- rebuild
  {
    id: "m12",
    phase: "rebuild",
    speaker: "households",
    text: "Then everyone should take forty per cent. That is the only fair way — the same cut for everybody.",
    mediator:
      "That sounds fair and it is the one thing I will not do. An equal percentage cut takes the same share from the water a child drinks and the water a tomato drinks, and those are not the same good. Your floor does not move. Neither does the school's. What moves is everything above the floors, and because your ask is mostly floor and Kwame's is mostly not, you lose eighteen per cent and he loses fifty-nine. That is not favouritism. It is what the tiers were for.",
  },
  {
    id: "m13",
    phase: "rebuild",
    speaker: "cashcrop",
    text: "Fifty-nine per cent. Then say it plainly — you are finishing us, and the school that arrived nine months ago keeps its water.",
    mediator:
      "You keep {cashcrop} litres a day, and 4,320 of that is a keep-alive floor that exists precisely so a bad season does not kill your established plants. You will crop less. You will not lose the farms. And the school is not holding water because it is popular — it is holding 5 litres per enrolled pupil, which would be the same number if the school had been there thirty years or opens next week. If your headcount changes, your floor changes too. That is the deal for everyone.",
  },
  {
    id: "m14",
    phase: "rebuild",
    speaker: "subsistence",
    text: "And our window? If he still pumps at four, the pressure is gone by six and it does not matter what number you write next to my name.",
    mediator:
      "Clause 1 makes the window as binding as the volume. Kwame's five furrow farms move to four-to-six and a second slot at nineteen-to-twenty-one. Six to nine is yours and it is enforceable: if pressure at your outlet is below the agreed level during your window, that is an exceedance against whoever is drawing, and it goes to Clause 6 like any other breach.",
    effects: [{ kind: "window", party: "subsistence", to: "06:00–09:00, protected" }],
  },
  {
    id: "m15",
    phase: "rebuild",
    speaker: "school",
    text: "I will take {school}. But I want it written that if enrolment rises next term nobody has to be persuaded to give us more.",
    mediator:
      "Clause 3. Your floor recalculates on the district enrolment return each term, and it does not require anyone's agreement — it is arithmetic, not a favour. That protects you against being the newest party at the table, and it also means your floor falls if enrolment falls.",
  },
  {
    id: "m16",
    phase: "rebuild",
    speaker: "district",
    text: "And if I file the specification?",
    mediator:
      "Then the agreement reopens within thirty days and your claim is assessed like everyone else's — by tier, by headcount, on evidence. Filing it does not guarantee you water. It guarantees you a hearing with a number attached, which is more than you have now.",
  },

  // ----------------------------------------------------------------- closing
  {
    id: "m17",
    phase: "closing",
    speaker: "households",
    text: "And when someone takes more than their share? Because they will.",
    mediator:
      "Clause 6, and it runs without anyone going to the district. Sunday readings taken by two people from different parties — a reading by two of your own is void. First overdraw: written notice and the excess comes off next week. Second inside ninety days: your window shortens by an hour for a fortnight. Third: your valve is locked for seven days, and the keys are held by two custodians from different parties so neither can open it alone. Tampering with a seal skips straight to the third step and doubles your levy for a quarter.",
  },
  {
    id: "m18",
    phase: "closing",
    speaker: "engineer",
    text: "Who pays when the pump fails again? Because at this drawdown it will.",
    mediator:
      "Everyone, monthly, per thousand litres — domestic and food-growing at 0.30, commercial at 0.90, because commercial draws most and loses most when the pump stops. Two signatories from different parties on the account, balance read aloud every quarter. And you report the static water level at every quarterly meeting whether or not anyone asks, because the trigger in Clause 8 is worthless if the only person who can see it coming stays quiet.",
  },
];

export const REVEAL_MOVE = "m11";

/**
 * Scripted dialogue refers to allocations by `{partyId}`, never by a typed-out
 * litre figure. A number written into the script is a number that goes stale
 * the moment the balance changes, and the mediator's own instructions forbid
 * stating a figure that is not on the schedule. Substituted at render time
 * against the live balance, so what is said and what is shown cannot diverge.
 */
export function fillFigures(text: string, balance: Balance): string {
  return text.replace(/\{(\w+)\}/g, (whole, id: string) => {
    const a = balance.allocations.find((x) => x.partyId === id);
    return a ? a.total.toLocaleString() : whole;
  });
}
