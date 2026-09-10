# The Mediator

**Live: https://themediatorbot.vercel.app**

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

## Asking for more does not get you more

Every party also carries a **ceiling on justified use**, computed from the record the same way its floor is computed from headcount. The share of the discretionary pool is worked out against the ceiling, never against the ask.

| Party | Asked | Ceiling | Where the ceiling comes from |
|---|---|---|---|
| Households | 14,000 | 13,860 | 462 × 30 L/person/day — hand-carried draw above about 30 L is not physically typical, and there are no household connections here |
| School | 4,200 | 5,700 | 380 × 15 L/pupil/day, WHO day-school upper bound with latrines and handwashing |
| Subsistence | 9,000 | 10,200 | 34 plots × 300 L/day, the full dry-season staple requirement |
| Cash-crop | 22,000 | 21,600 | 0.9 ha on drip at 2.4 mm/day — every figure supplied by their own consultant's annex |

Without this, the fill rewards whoever opens highest: the discretionary share is proportional to unmet need, and need is the gap between a floor and a self-declared number. A party that trebled its ask took roughly a third more water and everyone else lost between 10 and 19 per cent of theirs. Two parties are asking above their ceiling, and it earns them nothing.

It also settles what the tabled report is actually worth. The growers' 22,000 was never doing any work — the balance was already computing against 21,600, because that is what 0.9 hectares on drip can justify. Recomputing their annex does not take their water. It takes their argument.

## What happens when the yield drops 40%

Mid-negotiation the engineer reports that sustainable yield is 28,800 L/day, not the 48,000 everyone has been dividing up. Every allocated figure recomputes. No floor moves, because floors were never derived from supply — so the entire shortfall lands on the discretionary layer.

| Party | Before | After | Change |
|---|---|---|---|
| Household Water Committee | 13,860 | 11,336 | −18.2% |
| Nkwanta Community School | 4,200 | 2,944 | −29.9% |
| Subsistence growers | 9,000 | 5,888 | −34.6% |
| Cash-crop growers | 20,940 | 8,632 | −58.8% |
| District Assembly | 0 | 0 | deferred |

Cash-crop absorbs most of it and still holds a 4,320 L/day keep-alive floor: it crops less, it does not lose the farms. When the households propose an equal 40% cut for everyone, the mediator refuses — an equal percentage takes the same share from the water a child drinks and the water a tomato drinks.

The same rule holds in the case nobody wants. If the yield ever falls below the floors themselves, the engine does not scale every floor down by a common factor — that would be the equal-percentage cut it just refused, applied at the worst possible moment. Survival floors are paid first and shared within survival only; livelihood and commercial go to zero before a drinking-water floor is touched. Nothing on that path can be signed, and the schedule reports each party's true floor next to what it would actually receive, so the gap is on the page rather than hidden by a floor that quietly moved.

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

Model output is treated as untrusted input. Flag kinds and effect kinds are whitelisted against the engine, and sustainable yield — the one number that moves everything — is not reachable from model output at all.

Claims are reachable, because they have to be: correcting a figure at the table is the whole point of catching the report. So the channel is narrowed instead of closed. A claim revision is clamped **downward only** — a party can concede, it cannot talk its way to a larger ask — and the balance never computes a share against the ask in the first place. It computes against the ceiling, which comes from the record. Raise the cash-crop claim to any number you like and the schedule does not move a litre. There is a test for it.

## Layout

```
lib/water.ts        the balance — tiers, headcount floors, capped weighted fill, feasibility
lib/agreement.ts    clause generation, levies, sanctions, and the fault check that blocks signing
lib/facts.ts        the verifiable record and the three breaks in the tabled report
lib/negotiation.ts  five parties, the scripted timeline and its effects
lib/prompts.ts      the mediator prompt, shown verbatim in the app
app/api/mediate     live mediation, whitelisting and clamping before anything reaches the balance
```
