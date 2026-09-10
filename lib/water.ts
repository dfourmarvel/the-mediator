// The water balance. No model call happens in here.
//
// A mediator that only talks produces agreements whose numbers do not add up.
// Everything binding in this app is computed: floors are derived from
// headcounts, the discretionary pool is filled by a capped weighted algorithm,
// and an allocation that exceeds sustainable yield cannot be signed.

export type Tier = "survival" | "livelihood" | "commercial" | "speculative";

export const TIERS: Record<
  Tier,
  { label: string; weight: number; rule: string }
> = {
  survival: {
    label: "Survival",
    weight: 1.0,
    rule: "Drinking, cooking, hygiene and sanitation. The floor is derived from how many people exist, so it is not a negotiating position and cannot be traded away.",
  },
  livelihood: {
    label: "Livelihood",
    weight: 0.9,
    rule: "Water that produces food the household itself eats. Strong claim, but it yields to survival.",
  },
  commercial: {
    label: "Commercial",
    weight: 0.55,
    rule: "Water that produces income. Holds a keep-alive floor so a shortage does not destroy capital stock, but the productive layer above that is the first thing cut.",
  },
  speculative: {
    label: "Speculative",
    weight: 0,
    rule: "A claim with no defined beneficiary count, start date or engineering specification. Cannot be allocated against, because there is nothing to measure it by.",
  },
};

export interface Party {
  id: string;
  name: string;
  seat: string;
  bloc?: string;
  tier: Tier;
  /** What they came in asking for, litres per day. */
  claim: number;
  /** Basis of the protected floor. Stated so anyone can check the arithmetic. */
  floor: number;
  floorBasis: string;
  /**
   * The most this party's use can be justified from the record, litres per day.
   * A claim is a self-declared number; without a ceiling the fill rewards
   * whoever asks for most, because the discretionary share is proportional to
   * unmet need. Ceilings come from the record for the same reason floors come
   * from headcount: so that asking for more cannot get you more.
   */
  needCeiling: number;
  needBasis: string;
  /** Hours they need to abstract in, which is a separate scarce good from volume. */
  window?: string;
}

export const PARTIES: Party[] = [
  {
    id: "households",
    name: "Household Water Committee",
    seat: "96 households · 462 people",
    tier: "survival",
    claim: 14000,
    floor: 9240,
    floorBasis: "462 people × 20 L/person/day (WHO basic access: drinking, cooking, hygiene)",
    needCeiling: 13860,
    needBasis:
      "462 people × 30 L/person/day. Hand-carried consumption above roughly 30 L/person/day is not physically typical, and there are no household connections here — the water comes from four standpipes on foot.",
    window: "05:00–07:00 and 17:00–19:00",
  },
  {
    id: "school",
    name: "Nkwanta Community School",
    seat: "380 pupils · opened this year",
    tier: "survival",
    claim: 4200,
    floor: 1900,
    floorBasis: "380 pupils × 5 L/pupil/day (WHO day-school standard: drinking, handwashing, latrines)",
    needCeiling: 5700,
    needBasis:
      "380 pupils × 15 L/pupil/day, the upper end of the WHO day-school range once flush latrines and handwashing stations are counted rather than drinking water alone.",
    window: "07:00–14:00",
  },
  {
    id: "subsistence",
    name: "Subsistence growers",
    seat: "34 plots · food for own consumption",
    bloc: "farmers",
    tier: "livelihood",
    claim: 9000,
    floor: 3740,
    floorBasis: "34 plots × 110 L/day, the minimum to keep staple food crops alive through the dry season",
    needCeiling: 10200,
    needBasis:
      "34 plots × 300 L/day, the full dry-season requirement for a staple plot of this size rather than the 110 L/day that merely keeps it alive.",
    window: "06:00–09:00 (dry-season planting window)",
  },
  {
    id: "cashcrop",
    name: "Cash-crop growers",
    seat: "12 farms · tomato and pepper for market",
    bloc: "farmers",
    tier: "commercial",
    claim: 22000,
    floor: 4320,
    floorBasis: "12 farms × 360 L/day keep-alive rate — enough to prevent established plants dying, not to crop them",
    needCeiling: 21600,
    needBasis:
      "0.9 ha under drip at a 2.4 mm/day design rate: 9,000 m² × 0.0024 m = 21.6 m³/day. Their own consultant's annex supplies every figure in that calculation.",
    window: "04:00–08:00",
  },
  {
    id: "district",
    name: "District Assembly",
    seat: "Hon. Nartey · future development project",
    tier: "speculative",
    claim: 12000,
    floor: 0,
    floorBasis: "No floor. No beneficiary count, start date or specification has been produced.",
    needCeiling: 0,
    needBasis:
      "No ceiling either, for the same reason there is no floor: nothing has been filed to compute one from.",
  },
];

/** What everyone was told the borehole could sustainably yield. */
export const ASSUMED_YIELD = 48000;
/** What the pump test actually shows, delivered mid-negotiation. */
export const TESTED_YIELD = 28800;

export interface Allocation {
  partyId: string;
  floor: number;
  discretionary: number;
  total: number;
  /** Fraction of what they originally asked for. */
  ofClaim: number;
}

export interface Balance {
  yield_: number;
  allocations: Allocation[];
  floorsTotal: number;
  pool: number;
  allocated: number;
  unallocated: number;
  feasible: boolean;
  /** Populated only when the floors alone exceed yield — a genuine emergency. */
  shortfall?: { partyId: string; missing: number }[];
  gated: { partyId: string; reason: string }[];
}

/**
 * Capped weighted fill. Everyone's floor is paid first. What remains is shared
 * across the parties in proportion to tier weight × unmet need, and anyone who
 * would receive more than they asked for is capped and their surplus
 * redistributed. Iterating is what stops a high-weight party being handed water
 * it never wanted while a lower-weight party goes short.
 */
export function computeBalance(
  yield_: number,
  parties: Party[] = PARTIES,
  opts: { unlockSpeculative?: boolean } = {}
): Balance {
  const gated: { partyId: string; reason: string }[] = [];

  const eligible = parties.filter((p) => {
    if (p.tier === "speculative" && !opts.unlockSpeculative) {
      gated.push({
        partyId: p.id,
        reason:
          "Speculative claim. No beneficiary count, no start date, no engineering specification — there is nothing here to allocate against. Reopens automatically when those are filed.",
      });
      return false;
    }
    return true;
  });

  const floorsTotal = eligible.reduce((s, p) => s + p.floor, 0);

  // Floors alone exceeding yield is a different problem from a tight
  // negotiation, and the mediator must say so rather than quietly shaving
  // survival water to make a document balance.
  if (floorsTotal > yield_) {
    // Tier order, not pro-rata. Scaling every floor by the same factor is an
    // equal percentage cut, which takes the same share from the water a child
    // drinks and the water a tomato drinks — the one move the mediator refuses
    // to make anywhere else. Survival floors are paid first, then livelihood,
    // then commercial, and a tier that cannot be paid in full is shared within
    // itself. Nothing here can be signed; the point is that the numbers a party
    // is shown in an emergency still obey the rule they were promised.
    const ORDER: Tier[] = ["survival", "livelihood", "commercial", "speculative"];
    const paid = new Map<string, number>(eligible.map((p) => [p.id, 0]));
    let left = yield_;

    for (const tier of ORDER) {
      const band = eligible.filter((p) => p.tier === tier && p.floor > 0);
      if (!band.length) continue;
      const bandTotal = band.reduce((s, p) => s + p.floor, 0);
      if (left <= 0) break;
      if (bandTotal <= left) {
        for (const p of band) paid.set(p.id, p.floor);
        left -= bandTotal;
      } else {
        const scale = left / bandTotal;
        for (const p of band) paid.set(p.id, p.floor * scale);
        left = 0;
      }
    }

    const allocations = eligible.map((p) => {
      const got = Math.round(paid.get(p.id) ?? 0);
      return {
        partyId: p.id,
        // The true floor, not a scaled one. A floor that shrinks to make the
        // page balance is not a floor, and reporting it honestly is what lets
        // agreementFaults catch this and refuse the signature.
        floor: p.floor,
        discretionary: 0,
        total: got,
        ofClaim: p.claim ? got / p.claim : 0,
      };
    });

    return {
      yield_,
      floorsTotal,
      pool: 0,
      allocated: allocations.reduce((s, a) => s + a.total, 0),
      unallocated: 0,
      feasible: false,
      shortfall: eligible
        .filter((p) => p.floor > 0)
        .map((p) => ({
          partyId: p.id,
          missing: Math.round(p.floor - (paid.get(p.id) ?? 0)),
        }))
        .filter((s) => s.missing > 0),
      allocations,
      gated,
    };
  }

  const pool = yield_ - floorsTotal;

  const need = new Map<string, number>();
  const award = new Map<string, number>();
  for (const p of eligible) {
    // A claim is what a party says it wants; the ceiling is what the record
    // will support. The fill runs on the lesser of the two, so inflating an
    // ask cannot enlarge a share at anyone else's expense.
    need.set(p.id, Math.max(0, Math.min(p.claim, p.needCeiling) - p.floor));
    award.set(p.id, 0);
  }

  let remaining = pool;
  let open = eligible.filter((p) => (need.get(p.id) ?? 0) > 0);

  // At most one pass per party: each iteration caps at least one of them.
  for (let guard = 0; guard < eligible.length + 2 && remaining > 0.5 && open.length; guard++) {
    const weighted = open.reduce(
      (s, p) => s + (need.get(p.id) ?? 0) * TIERS[p.tier].weight,
      0
    );
    if (weighted <= 0) break;

    const factor = remaining / weighted;
    let spent = 0;
    const capped: string[] = [];

    for (const p of open) {
      const want = need.get(p.id) ?? 0;
      const give = Math.min(want, want * TIERS[p.tier].weight * factor);
      award.set(p.id, (award.get(p.id) ?? 0) + give);
      need.set(p.id, want - give);
      spent += give;
      if (want - give < 0.5) capped.push(p.id);
    }

    remaining -= spent;
    open = open.filter(
      (p) => !capped.includes(p.id) && (need.get(p.id) ?? 0) > 0.5
    );
  }

  // Largest-remainder rounding. Rounding each share independently leaves the
  // document a litre or two off, and in an agreement whose whole claim is that
  // the arithmetic holds, "close enough" is the one thing it cannot be.
  const spent = pool - remaining;
  const target = Math.round(spent);
  const raw = eligible.map((p) => ({ id: p.id, exact: award.get(p.id) ?? 0 }));
  const ints = raw.map((r) => ({ ...r, base: Math.floor(r.exact) }));
  let deficit = target - ints.reduce((s, r) => s + r.base, 0);
  const byRemainder = [...ints].sort(
    (a, b) => b.exact - b.base - (a.exact - a.base)
  );
  const bump = new Map<string, number>(ints.map((r) => [r.id, r.base]));
  for (let i = 0; deficit > 0 && i < byRemainder.length * 2; i++) {
    const r = byRemainder[i % byRemainder.length];
    bump.set(r.id, (bump.get(r.id) ?? 0) + 1);
    deficit--;
  }

  const allocations: Allocation[] = eligible.map((p) => {
    const disc = bump.get(p.id) ?? 0;
    return {
      partyId: p.id,
      floor: p.floor,
      discretionary: disc,
      total: p.floor + disc,
      ofClaim: (p.floor + disc) / p.claim,
    };
  });

  const allocated = allocations.reduce((s, a) => s + a.total, 0);

  return {
    yield_,
    allocations,
    floorsTotal,
    pool,
    allocated,
    unallocated: yield_ - allocated,
    feasible: allocated <= yield_ + 1,
    gated,
  };
}

export const partyOf = (id: string) => PARTIES.find((p) => p.id === id)!;

/** What changed between two balances, for the renegotiation after the pump test. */
export interface Delta {
  partyId: string;
  before: number;
  after: number;
  change: number;
  pct: number;
  protectedFloor: boolean;
}

export function diffBalances(before: Balance, after: Balance): Delta[] {
  return after.allocations.map((a) => {
    const b = before.allocations.find((x) => x.partyId === a.partyId);
    const beforeTotal = b?.total ?? 0;
    return {
      partyId: a.partyId,
      before: beforeTotal,
      after: a.total,
      change: a.total - beforeTotal,
      pct: beforeTotal ? (a.total - beforeTotal) / beforeTotal : 0,
      protectedFloor: a.floor > 0 && a.total >= a.floor,
    };
  });
}
