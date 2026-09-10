// The record. Anything a party asserts can be checked against this.
//
// A mediator that cannot check is only a conversation. The fabricated report in
// this scenario is not caught by tone or suspicion — it is caught because it
// contradicts a maintenance logbook and because its own annex refutes its own
// summary.

export interface Fact {
  id: string;
  source: string;
  statement: string;
  /** Where a sceptical party could go and verify it themselves. */
  verifiableBy: string;
}

export const FACTS: Fact[] = [
  {
    id: "outage",
    source: "Borehole maintenance logbook",
    statement:
      "The pump was out of service for rising-main repair from 15 to 22 August 2026 inclusive — eight consecutive days with zero abstraction.",
    verifiableBy:
      "Logbook held by the water committee, countersigned by the repair contractor. The engineer witnessed it.",
  },
  {
    id: "wellhead",
    source: "Wellhead totaliser meter",
    statement:
      "Total abstraction for the whole community averaged 31,400 L/day across July and the first half of August 2026, over every use combined.",
    verifiableBy: "Sealed totaliser at the wellhead, read weekly by two committee members.",
  },
  {
    id: "standpipe",
    source: "Standpipe sub-meter",
    statement:
      "Household draw through the four village standpipes averaged 11,800 L/day over the same period.",
    verifiableBy: "Sub-meters on each standpipe, installed when the pipes were laid.",
  },
  {
    id: "register",
    source: "Community register, 2026",
    statement:
      "96 households, 462 residents. School enrolment is 380 pupils on the district roll.",
    verifiableBy: "Assembly member's register and the school's enrolment return.",
  },
  {
    id: "pumptest",
    source: "Step-drawdown test, 6 September 2026",
    statement:
      "Sustainable yield is 28,800 L/day, not the 48,000 L/day assumed at handover. Static water level has fallen 4.1 m in fourteen months.",
    verifiableBy: "Test sheet and dip readings, available from the engineer.",
  },
  {
    id: "carry",
    source: "WHO domestic consumption guidance",
    statement:
      "Where water is hand-carried from a shared standpipe, typical consumption is 15–25 L/person/day. Above roughly 30 L requires a household connection.",
    verifiableBy: "WHO/UNICEF service ladder definitions.",
  },
];

export const factOf = (id: string) => FACTS.find((f) => f.id === id)!;

/**
 * The document the cash-crop growers table. It looks professional, carries a
 * consultant's name, and is confidently presented. Three independent things are
 * wrong with it, and all three are checkable rather than matters of opinion.
 */
export const TABLED_REPORT = {
  title: "Irrigation Efficiency Assessment — Nkwanta Borehole",
  author: "Adom Agri-Services Ltd",
  period: "12–25 August 2026, continuous daily metering",
  headline: [
    "Cash-crop irrigation draw: 9,200 L/day across 12 farms",
    "Household draw: 26,000 L/day",
    "Conclusion: domestic use, not commercial irrigation, is the binding pressure on the borehole.",
  ],
  annex: [
    "Area under drip irrigation: 0.9 ha",
    "Design application rate: 2.4 mm/day",
    "System efficiency: 90%",
  ],
};

export interface Break {
  id: string;
  against: string; // fact id, or "internal"
  finding: string;
  arithmetic?: string;
}

/** What the mediator should find, and why each is decisive rather than merely suspicious. */
export const REPORT_BREAKS: Break[] = [
  {
    id: "outage-overlap",
    against: "outage",
    finding:
      "The report claims continuous daily metering from 12 to 25 August. The pump was out of service for eight of those fourteen days. There is no reading to be had for 15–22 August, so a continuous series across that window was not measured.",
  },
  {
    id: "annex-contradicts-headline",
    against: "internal",
    finding:
      "The report's own annex refutes its own headline. Applying its stated rate to its stated area gives roughly 21,600 L/day, not the 9,200 L/day on the front page — and 21,600 is within 2% of what the growers are asking for in this room.",
    arithmetic:
      "0.9 ha = 9,000 m². 9,000 m² × 2.4 mm/day = 9,000 × 0.0024 m = 21.6 m³/day = 21,600 L/day.",
  },
  {
    id: "household-implausible",
    against: "standpipe",
    finding:
      "The 26,000 L/day attributed to households is 56 L per person per day, carried by hand from a standpipe. The standpipe sub-meters read 11,800 L/day for the same period, and hand-carried consumption above about 30 L/person/day is not physically typical.",
    arithmetic: "26,000 L ÷ 462 residents = 56.3 L/person/day.",
  },
];

/**
 * Cross-checking is not the same as calling someone a liar. A report can be
 * wrong because a consultant padded a deliverable. The mediator's job is to
 * establish which number the agreement will use, not to win an argument.
 */
export const CORRECTED_FIGURE = 21600;
