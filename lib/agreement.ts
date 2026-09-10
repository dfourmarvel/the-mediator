// Turns a balance into an enforceable instrument.
//
// "Enforceable" here means enforceable by the people standing at the wellhead:
// sealed meters, joint custody of the valve keys, readings witnessed by someone
// from a different party, and a graduated response that runs without anyone
// travelling to the district capital. An agreement that can only be enforced by
// an outside authority is not an agreement, it is a request.

import { PARTIES, TIERS, partyOf, type Balance, type Party } from "./water";

export const LEVY_PER_1000L: Record<Party["tier"], number> = {
  survival: 0.3,
  livelihood: 0.3,
  commercial: 0.9,
  speculative: 0,
};

export const TOLERANCE = 0.05;
export const ROLLING_DAYS = 7;

export interface ScheduleRow {
  partyId: string;
  name: string;
  litresPerDay: number;
  floor: number;
  window: string;
  tolerance: number;
  levyMonthly: number;
  floorBasis: string;
}

export interface Clause {
  n: string;
  heading: string;
  body: string;
  /** Set when the clause is computed from the balance rather than boilerplate. */
  derived?: boolean;
}

export interface Agreement {
  schedule: ScheduleRow[];
  clauses: Clause[];
  totalAllocated: number;
  yield_: number;
  headroom: number;
  levyTotalMonthly: number;
  signatories: { name: string; capacity: string }[];
  feasible: boolean;
}

const L = (n: number) => `${Math.round(n).toLocaleString()} L/day`;

export function buildAgreement(
  balance: Balance,
  revision = 1,
  amended: Party[] = PARTIES
): Agreement {
  // Terms renegotiated at the table (a revised window, a corrected claim) live
  // on the amended party list. Reading the originals here would silently drop
  // them from the signed document.
  const lookup = (id: string) =>
    amended.find((p) => p.id === id) ?? partyOf(id);
  const schedule: ScheduleRow[] = balance.allocations.map((a) => {
    const p = lookup(a.partyId);
    const levy = (a.total / 1000) * LEVY_PER_1000L[p.tier] * 30;
    return {
      partyId: p.id,
      name: p.name,
      litresPerDay: a.total,
      floor: a.floor,
      window: p.window ?? "—",
      tolerance: Math.round(a.total * TOLERANCE),
      levyMonthly: Math.round(levy),
      floorBasis: p.floorBasis,
    };
  });

  const levyTotalMonthly = schedule.reduce((s, r) => s + r.levyMonthly, 0);
  const gatedParty = balance.gated[0] ? lookup(balance.gated[0].partyId) : null;

  const clauses: Clause[] = [
    {
      n: "1",
      heading: "Allocation",
      derived: true,
      body: `Daily abstraction is fixed at the volumes in the schedule above, totalling ${L(
        balance.allocated
      )} against a tested sustainable yield of ${L(
        balance.yield_
      )}. Each party abstracts only within its stated window. Windows are as binding as volumes: a party denied its window is denied its allocation, because water delivered at the wrong hour is not the same good.`,
    },
    {
      n: "2",
      heading: "Protected floors",
      derived: true,
      body: `The floor component of each allocation is derived from headcount and is not tradeable, lendable, or available as a concession in any future negotiation. Floors total ${L(
        balance.floorsTotal
      )}. A party may give away water above its floor. No party may give away water below it, and no party may accept such an offer.`,
    },
    {
      n: "3",
      heading: "Indexation",
      body:
        "Because floors are derived from how many people exist rather than from history, they move when the headcount moves. The school's floor is recalculated at 5 L per enrolled pupil per day on the district enrolment return each term. The household floor is recalculated at 20 L per resident per day on the community register each year. Neither recalculation requires anyone's agreement; it is arithmetic.",
    },
    {
      n: "4",
      heading: "Measurement",
      body: `The wellhead totaliser and each outlet sub-meter are sealed. Readings are taken every Sunday at 17:00 by two committee members who must be drawn from different parties, recorded in the logbook, and posted legibly at the main standpipe within 24 hours. A reading taken by two members of the same party is void.`,
    },
    {
      n: "5",
      heading: "Tolerance",
      derived: true,
      body: `Compliance is assessed on a rolling ${ROLLING_DAYS}-day average, not on any single day, with a tolerance of ±${(
        TOLERANCE * 100
      ).toFixed(
        0
      )}%. Daily variation is normal and is not a breach. Sustained overdraw is.`,
    },
    {
      n: "6",
      heading: "Graduated response to overdraw",
      body:
        "First exceedance: written notice, and the excess volume is deducted from the following week's allocation. Second exceedance within 90 days: the party's abstraction window is shortened by one hour for 14 days. Third within 90 days: the party's outlet valve is locked for 7 days. Keys to every outlet valve are held jointly by two custodians who must be from different parties, and neither can open a valve alone. Tampering with a meter or seal moves straight to the third step and doubles that party's levy for one quarter.",
    },
    {
      n: "7",
      heading: "Maintenance levy",
      derived: true,
      body: `Each party pays into a maintenance fund monthly at ${
        LEVY_PER_1000L.survival
      } GHS per 1,000 L for domestic and food-growing use and ${
        LEVY_PER_1000L.commercial
      } GHS per 1,000 L for commercial use, totalling approximately GHS ${levyTotalMonthly.toLocaleString()} per month. The fund pays for pump repair, meter replacement and the annual yield test. Commercial use pays the higher rate because it draws the most and because a failed pump costs it the most. The fund is held in a named account with two signatories from different parties, and the balance is read out at every quarterly meeting.`,
    },
    {
      n: "8",
      heading: "Automatic review triggers",
      body:
        "This agreement reopens, without anyone needing to request it, on any of: a further 1.5 m fall in static water level; a yield test differing by more than 10% from the figure in Clause 1; a change of more than 15% in school enrolment or household register; or failure of the pump for more than 72 hours. The engineer reports the static water level at each quarterly meeting whether or not anyone asks.",
    },
    {
      n: "9",
      heading: gatedParty ? `Deferred claim — ${gatedParty.name}` : "Deferred claims",
      derived: true,
      body: gatedParty
        ? `${gatedParty.name} is allocated 0 L/day under this agreement. This is not a refusal and is not a finding about the merits of the project. No volume can be set against a claim that states no beneficiary count, no start date and no engineering specification, because there is nothing to measure compliance against. On filing those three items with the water committee, this agreement reopens within 30 days and the claim is assessed on the same basis as every other — by tier, headcount and evidence. Until then the water stays in the ground, not with another party, and no party acquires a right to it.`
        : "No deferred claims.",
    },
    {
      n: "10",
      heading: "Disputes",
      body:
        "A dispute goes first to the water committee, which must meet within 7 days. If unresolved it goes to the chief's council sitting with one representative from each party, within 14 days. Only then does it go to the district. Escalation does not suspend the schedule: parties keep to their allocations while a dispute is live, and a party that suspends its own compliance in protest is treated as being in exceedance under Clause 6.",
    },
    {
      n: "11",
      heading: "Duration",
      body: `Revision ${revision}. This agreement runs to the end of the dry season and extends automatically if no trigger in Clause 8 has fired. Any party may call one review meeting per quarter without giving a reason.`,
    },
  ];

  return {
    schedule,
    clauses,
    totalAllocated: balance.allocated,
    yield_: balance.yield_,
    headroom: balance.unallocated,
    levyTotalMonthly,
    feasible: balance.feasible,
    signatories: [
      ...PARTIES.filter((p) => balance.allocations.some((a) => a.partyId === p.id)).map(
        (p) => ({ name: p.name, capacity: "Allocated party" })
      ),
      ...(gatedParty
        ? [{ name: gatedParty.name, capacity: "Deferred claim, Clause 9" }]
        : []),
      { name: "Sena Kudjoe", capacity: "Well engineer, technical witness" },
    ],
  };
}

/** Sanity gate used by the UI: an agreement that fails this must not be signable. */
export function agreementFaults(a: Agreement, balance: Balance): string[] {
  const faults: string[] = [];
  if (a.totalAllocated > a.yield_ + 1)
    faults.push(
      `Allocations total ${L(a.totalAllocated)} against a yield of ${L(
        a.yield_
      )}. The document does not balance and cannot be signed.`
    );
  for (const row of a.schedule) {
    if (row.litresPerDay < row.floor)
      faults.push(
        `${row.name} is below its protected floor by ${L(
          row.floor - row.litresPerDay
        )}. Floors are derived from headcount and cannot be traded.`
      );
  }
  if (!balance.feasible && balance.shortfall?.length)
    faults.push(
      "Sustainable yield does not cover the survival floors. This is a supply emergency, not a negotiation, and the mediator must say so rather than shave survival water to make a document balance."
    );
  return faults;
}

export { TIERS };
