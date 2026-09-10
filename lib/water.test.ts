// The balance's claims, checked rather than asserted. No dependencies: Node 24
// strips the types and runs this directly.
//
//   npm test
//
// These do not check that the tier weights are the right weights — that is an
// argument, and arguments do not have unit tests. They check the mechanical
// promises the README and the signed agreement make: the volumes sum exactly to
// the yield, no floor is breached while the yield can cover it, a speculative
// claim gets nothing, an inflated ask gains nothing, and a supply emergency
// still cuts in tier order instead of taking the same percentage from drinking
// water as from tomatoes.

import test from "node:test";
import assert from "node:assert/strict";

import {
  computeBalance,
  diffBalances,
  partyOf,
  PARTIES,
  ASSUMED_YIELD,
  TESTED_YIELD,
  type Party,
} from "./water.ts";
import { buildAgreement, agreementFaults } from "./agreement.ts";

/** The parties as they stand once the tabled report has been recomputed. */
const corrected: Party[] = PARTIES.map((p) =>
  p.id === "cashcrop" ? { ...p, claim: 21600 } : p
);

const totals = (parties: Party[] = corrected, y = TESTED_YIELD) =>
  Object.fromEntries(
    computeBalance(y, parties).allocations.map((a) => [a.partyId, a.total])
  );

test("allocations sum to exactly the yield", () => {
  // The largest-remainder rounding claim. Rounding each share independently
  // leaves the document a litre or two off.
  for (const y of [ASSUMED_YIELD, TESTED_YIELD, 34000, 21000]) {
    const b = computeBalance(y, corrected);
    assert.equal(b.allocated, y, `yield ${y}`);
  }
});

test("no party lands below its floor while the yield can cover the floors", () => {
  for (const y of [ASSUMED_YIELD, TESTED_YIELD, 21000]) {
    const b = computeBalance(y, corrected);
    assert.ok(b.feasible, `yield ${y} should be feasible`);
    for (const a of b.allocations) assert.ok(a.total >= a.floor, a.partyId);
  }
});

test("a speculative claim is gated at zero and reopens on filing", () => {
  const gated = computeBalance(TESTED_YIELD, corrected);
  assert.ok(!gated.allocations.some((a) => a.partyId === "district"));
  assert.equal(gated.gated[0]?.partyId, "district");

  const unlocked = computeBalance(TESTED_YIELD, corrected, {
    unlockSpeculative: true,
  });
  assert.ok(unlocked.allocations.some((a) => a.partyId === "district"));
});

test("inflating a claim above the ceiling changes nothing", () => {
  // The whole point of needCeiling. Without it the discretionary share is
  // proportional to a self-declared number, and the table rewards whoever
  // opened highest at everyone else's expense.
  const baseline = totals();
  for (const ask of [22000, 40000, 66000, 250000]) {
    const greedy = corrected.map((p) =>
      p.id === "cashcrop" ? { ...p, claim: ask } : p
    );
    assert.deepEqual(totals(greedy), baseline, `cash-crop asking ${ask}`);
  }

  // Asking for less than the ceiling still binds — a concession is real.
  const modest = corrected.map((p) =>
    p.id === "cashcrop" ? { ...p, claim: 9000 } : p
  );
  assert.ok(totals(modest).cashcrop < baseline.cashcrop);
});

test("a supply emergency cuts in tier order, not pro-rata", () => {
  // Floors total 19,200. At 10,000 there is not enough for survival alone.
  const b = computeBalance(10000, corrected);
  assert.equal(b.feasible, false);

  const got = Object.fromEntries(b.allocations.map((a) => [a.partyId, a.total]));
  // Livelihood and commercial go to zero before a drinking-water floor is cut.
  assert.equal(got.subsistence, 0);
  assert.equal(got.cashcrop, 0);
  assert.ok(got.households > 0 && got.school > 0);

  // The true floor is reported, not one scaled down to make the page balance.
  for (const a of b.allocations)
    assert.equal(a.floor, partyOf(a.partyId).floor, a.partyId);

  // Survival is shared within survival, so both survival parties are cut by
  // the same proportion of their own floor and neither is favoured.
  const hh = got.households / partyOf("households").floor;
  const sc = got.school / partyOf("school").floor;
  assert.ok(Math.abs(hh - sc) < 0.01);
});

test("every floor survives the yield shock intact", () => {
  const before = computeBalance(ASSUMED_YIELD, corrected);
  const after = computeBalance(TESTED_YIELD, corrected);
  for (const d of diffBalances(before, after)) {
    assert.ok(d.change < 0, `${d.partyId} should lose water`);
    assert.ok(d.protectedFloor, `${d.partyId} floor breached`);
  }
});

test("an agreement that does not balance cannot be signed", () => {
  const broken = computeBalance(10000, corrected);
  const faults = agreementFaults(buildAgreement(broken, 1, corrected), broken);
  assert.ok(faults.length > 0);
  assert.ok(faults.some((f) => /below its protected floor/.test(f)));

  const sound = computeBalance(TESTED_YIELD, corrected);
  assert.deepEqual(
    agreementFaults(buildAgreement(sound, 2, corrected), sound),
    []
  );
});
