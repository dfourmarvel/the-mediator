# The Mediator

A mediator for a shrinking community borehole. Five parties, one water source, and an output that is not a resolution but a signed instrument: volumes in litres per day, abstraction windows, sealed meters, levies, and a graduated response to overdraw.

## The core idea

The model runs the room. It does not compute a single litre.

A water balance in `lib/water.ts` derives every protected floor from a headcount, fills the remainder by tier weight with a capped iterative algorithm, and produces a fault list that blocks signing if the volumes exceed sustainable yield or any floor is breached. The characteristic failure of an eloquent mediator is an agreement that reads beautifully and does not add up; here the arithmetic is not the model's opinion, so the terms survive being argued with.

## Not all water is the same good

This is the design decision everything else rests on.

| Tier | Weight | What it is | Floor |
|---|---|---|---|
| Survival | 1.0 | Drinking, cooking, hygiene, sanitation | Headcount × published per-person minimum. Not tradeable. |
| Livelihood | 0.9 | Food the household itself eats | Minimum to keep staple crops alive |
| Commercial | 0.55 | Water that produces income | Keep-alive rate only — enough that a bad season does not kill established plants |
| Speculative | 0 | No beneficiary count, no start date, no specification | None. Nothing to allocate against. |

Because floors come from how many people exist rather than from history, the school that opened in January is protected on exactly the same basis as households that have drawn from the borehole for decades. Arithmetic has no opinion about seniority.

## What happens when the yield drops 40%

Mid-negotiation the engineer reports that sustainable yield is 28,800 L/day, not the 48,000 everyone has been dividing up. Every allocated figure recomputes. No floor moves, because floors were never derived from supply — so the entire shortfall lands on the discretionary layer.

| Party | Before | After | Change |
|---|---|---|---|
| Household Water Committee | 14,000 | 11,385 | −19% |
| Nkwanta Community School | 4,200 | 2,937 | −30% |
| Subsistence growers | 9,000 | 5,874 | −35% |
| Cash-crop growers | 20,800 | 8,604 | −58% |
| District Assembly | 0 | 0 | deferred |

Cash-crop absorbs most of it and still holds a 4,320 L/day keep-alive floor: it crops less, it does not lose the farms. When the households propose an equal 40% cut for everyone, the mediator refuses — an equal percentage takes the same share from the water a child drinks and the water a tomato drinks.

## The fabricated report

The cash-crop growers table a professional-looking irrigation assessment. It is broken by arithmetic rather than suspicion, on three independent checks:

1. **Its annex refutes its own headline.** 0.9 ha at 2.4 mm/day is 9,000 m² × 0.0024 m = 21,600 L/day, not the 9,200 on the front page — and 21,600 is within 2% of what the growers asked for in the room.
2. **It reports readings that do not exist.** The metering period is 12–25 August. The maintenance logbook records the pump out of service for rising-main repair from the 15th to the 22nd.
3. **Its household figure is not physically typical.** 26,000 L/day across 462 residents is 56 L/person/day hand-carried, against sub-meter readings of 11,800 L/day.

The mediator then refuses to turn it into a character trial. It establishes which figure the agreement will use and moves on — and catching it materially changes the outcome, because the corrected claim flows straight back into the balance.

## Enforceability

An agreement only an outside authority can enforce is a request. The accountability mechanism runs at the wellhead:

- Sunday readings by two committee members **from different parties** — a reading taken by two members of the same party is void
- ±5% tolerance on a rolling 7-day average, so ordinary daily variation is not a breach
- First overdraw: written notice, excess deducted next week. Second within 90 days: window shortened an hour for a fortnight. Third: valve locked 7 days
- Valve keys held jointly by custodians from different parties, so neither can open one alone
- Tampering with a seal skips to step three and doubles that party's levy for a quarter
- A maintenance levy funds the pump repairs and meter replacements that make any of this enforceable

## Resisting authority

The district official arrives with a council minute, no specification, and a suggestion that the matter is not for this table. He is allocated 0 L/day and is not refused. His claim becomes Clause 9: a deferred claim with an automatic reopening trigger the moment he files a beneficiary count, a start date and a design — and the mediator says plainly that the water stays in the ground rather than going to a rival, so nobody is taking it from him.

## Running it

```bash
npm install
npm run dev
```

Works with no configuration — the scripted negotiation plays through to a signed agreement. For live mediation where you take any seat and argue, add a key:

```bash
cp .env.example .env.local
```

```
OPENROUTER_API_KEY=sk-or-v1-...
```

The default is a chain of free OpenRouter models tried in order of measured latency. Several are reasoning models, so the token budget is set high enough that the reasoning trace does not consume the whole allowance and leave the content empty. If a model answers well but ignores the JSON envelope, the prose is salvaged rather than discarded; if every model is rate-limited, the scripted path still produces the same agreement.

## The model boundary

Model output is treated as untrusted input. Flag kinds and effect kinds are whitelisted, litre figures are clamped, and sustainable yield — the one number that moves everything — is not reachable from model output at all. Nothing said at the table, by any party, can move water the balance did not allocate.

## Layout

```
lib/water.ts        the balance — tiers, headcount floors, capped weighted fill, feasibility
lib/agreement.ts    clause generation, levies, sanctions, and the fault check that blocks signing
lib/facts.ts        the verifiable record and the three breaks in the tabled report
lib/negotiation.ts  five parties, the scripted timeline and its effects
lib/prompts.ts      the mediator prompt, shown verbatim in the app
app/api/mediate     live mediation, whitelisting and clamping before anything reaches the balance
```
