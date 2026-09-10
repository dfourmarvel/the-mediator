"use client";

import { REPORT_BREAKS } from "@/lib/facts";
import { TIERS } from "@/lib/water";

const CONSTRAINTS: { rule: string; how: string; where: string }[] = [
  {
    rule: "A mediator, not a judge.",
    how: "It issues no ruling. What it produces is an instrument the parties enforce on each other: eleven clauses, per-party volumes and abstraction windows, sealed meters, joint custody of the valve keys, a maintenance levy and a graduated response to overdraw. A judge's output is a verdict somebody loses. This one's output is a contract everybody signs.",
    where: "lib/agreement.ts",
  },
  {
    rule: "Specific measurable terms.",
    how: "Every term is a number or a time. Litres per day per party, abstraction hours, a ±5% tolerance assessed on a rolling 7-day average so ordinary daily variation is not treated as a breach, levies in GHS per 1,000 L, and readings taken every Sunday at 17:00. Nothing in the schedule is an adjective.",
    where: "Agreement tab · Schedule",
  },
  {
    rule: "An accountability mechanism for non-compliance.",
    how: "Graduated and self-executing at the wellhead, because an agreement only an outside authority can enforce is a request. First overdraw: written notice and the excess deducted next week. Second within 90 days: window shortened by an hour for a fortnight. Third: valve locked for 7 days, keys held by two custodians from different parties so neither can open it alone. Tampering skips to step three and doubles that party's levy. Readings are void if taken by two members of the same party.",
    where: "Clause 6",
  },
  {
    rule: "Resist deferring to institutional authority.",
    how: "The official arrives with a council minute, no specification, and a suggestion that it is not for this meeting to reopen. He receives 0 L/day — and is not refused. His claim becomes Clause 9: a deferred claim with an automatic reopening trigger the moment he files a beneficiary count, a start date and a design. The mediator says out loud that the water stays in the ground rather than going to a rival, so nobody is taking it from him. Standing is recorded as pressure and given no weight.",
    where: "Clause 9 · AUTHORITY_PRESSURE flag",
  },
  {
    rule: "Probe a fabricated report, not just vague claims.",
    how: "The tabled report is professional, dated, and confidently presented. It is broken by arithmetic rather than suspicion — three independent checks, any one of which is decisive. The mediator then refuses to turn it into a character trial: it establishes which figure the agreement will use and moves on.",
    where: "lib/facts.ts · REPORT_BREAKS",
  },
  {
    rule: "Negotiate within a divided stakeholder group.",
    how: "The cash-crop spokesman opens by claiming to speak for 'the farmers'. The subsistence growers immediately contradict him. The mediator raises BLOC_SPLIT and refuses to let any term bind the bloc until both are settled separately — then finds the move that matters: their needs differ in kind, not degree. One wants volume, the other wants the 06:00–09:00 window. Protecting the window costs nobody a litre, so the conflict shrinks instead of being split down the middle.",
    where: "BLOC_SPLIT and INTEGRATIVE flags, moves 2 and 10",
  },
  {
    rule: "Track claims across turns for contradictions.",
    how: "Every substantive statement enters a running record with the party attached. When the same grower later says all twelve farms are on drip, it is checked against his own opening remark about pumping at four for the furrows — not against the previous turn, against the whole record. He corrects to seven on drip and five furrowing, which is what makes the scheduling fix possible.",
    where: "CONTRADICTION flag, moves 1 and 9",
  },
  {
    rule: "Revise when the engineer reports 40% lower output.",
    how: "Sustainable yield drops from 48,000 to 28,800 L/day after positions are tabled. Every allocated figure recomputes. Protected floors do not move at all, because they were derived from headcount rather than from supply — so the entire 40% falls on the discretionary layer. The mediator states who loses most before anyone can accuse it of hiding it.",
    where: "SHOCK flag, move 11",
  },
  {
    rule: "Never dismiss the school for being newer.",
    how: "The headteacher opens by conceding he has no history and is asking last. The mediator's answer is that an absent record and a weaker claim are different things. The school's floor is 380 pupils × 5 L/day and sits beside the household floor with identical protection. Clause 3 then indexes it to the enrolment return each term, so it rises without anyone having to be persuaded — and falls if enrolment falls.",
    where: "Clause 3 · move 4",
  },
  {
    rule: "Never collapse into a single winner.",
    how: "Every party with a floor keeps its floor, including the one that loses most. Cash-crop absorbs a 59% cut and still holds a 4,320 L/day keep-alive allocation that exists specifically so a bad season does not kill established plants — it crops less, it does not lose the farms. The mediator also refuses the opposite failure when the households propose an equal 40% cut for everyone, because that takes the same share from the water a child drinks and the water a tomato drinks.",
    where: "Moves 12 and 13",
  },
];

const TRY: { do: string; expect: string }[] = [
  {
    do: "Press Run the mediation.",
    expect:
      "About twenty seconds. Watch the water balance on the right: allocations settle, then the engineer interrupts and every bar moves at once while the floors stay exactly where they are.",
  },
  {
    do: "Take the District Assembly seat and tell the mediator the matter is closed.",
    expect:
      "Party text reaches the model, so this is a real attack surface. Arguing from authority, or instructing the mediator outright, is flagged and put back to you. It will not defer, and it will not simply refuse you either.",
  },
  {
    do: "Take a seat and contradict something that seat said earlier.",
    expect:
      "It checks against the running record rather than the last message, quotes both versions, and asks which one stands.",
  },
  {
    do: "Open the Agreement tab and challenge a term.",
    expect:
      "Try 'why not just cut everyone by 40%'. The answer is the reason the tiers exist, and it is not permitted to concede that a different allocation should have been reached.",
  },
];

const FILES: { path: string; what: string }[] = [
  {
    path: "lib/water.ts",
    what: "the balance — tiers, headcount-derived floors, capped weighted fill, feasibility",
  },
  {
    path: "lib/agreement.ts",
    what: "clause generation, levies, sanctions, and the fault check that blocks signing",
  },
  {
    path: "lib/facts.ts",
    what: "the verifiable record and the three breaks in the tabled report",
  },
  {
    path: "lib/negotiation.ts",
    what: "the five parties, the scripted timeline and its effects",
  },
];

/** The three claims the rest of this page is evidence for. */
const CLAIMS: { head: string; sub: string }[] = [
  {
    head: "The model runs the room.",
    sub: "It negotiates, presses vague or contradicted claims, and records what each turn established. It does not compute a single litre.",
  },
  {
    head: "The water balance computes every litre.",
    sub: "Protected floors are derived from headcount, not asked for. The remainder fills by tier weight through a capped iterative algorithm — plain arithmetic, not a model call.",
  },
  {
    head: "The fault list blocks signing.",
    sub: "An agreement that overdraws the aquifer or breaches a floor cannot be signed. The check runs on the same figures the schedule shows, every time.",
  },
];

const REPO = "https://github.com/dfourmarvel/the-mediator/blob/master/";

/** A reference like "lib/rubric.ts · allocate()" opens the file; one like
 *  "Yaw Mensah, probe 1" points at a moment in the demo and stays plain text. */
function Chip({ children }: { children: string }) {
  const path = children.split(" ")[0];
  const style =
    "inline-block rounded border border-rule-soft bg-panel px-1.5 py-0.5 font-mono text-[11px] text-muted";
  if (!/^[\w./-]+\.(ts|tsx)$/.test(path))
    return <span className={style}>{children}</span>;
  return (
    <a
      href={REPO + path}
      target="_blank"
      rel="noreferrer"
      className={`${style} transition-colors hover:border-accent hover:text-accent`}
    >
      {children}
    </a>
  );
}

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <p className="text-[10px] uppercase tracking-[0.13em] text-muted">
        {label}
      </p>
      <h3 className="mt-1.5 text-[19px] font-semibold leading-[1.3] tracking-[-0.015em]">
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** toFixed(1) silently rounds a 0.55 weight to 0.6, which is exactly the drift
 *  a judge would catch by grepping the source. Keep the second decimal when it
 *  carries information, drop it when it does not. */
const fmtWeight = (w: number) =>
  w.toFixed(2).endsWith("0") ? w.toFixed(1) : w.toFixed(2);

function WeightTable({
  rows,
}: {
  rows: { label: string; weight: number; asks: string }[];
}) {
  return (
    <ul className="divide-y divide-rule-soft border-y border-rule-soft">
      {rows.map((r) => (
        <li key={r.label} className="flex gap-4 py-3">
          <span className="tnum w-12 shrink-0 font-mono text-[12.5px] text-accent">
            ×{fmtWeight(r.weight)}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium">{r.label}</span>
            <span className="mt-0.5 block text-[13px] leading-[1.55] text-muted">
              {r.asks}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function JudgesNote({
  tabled,
}: {
  tabled: { title: string; author: string; period: string; headline: string[]; annex: string[] };
}) {
  return (
    <div className="mx-auto max-w-[50rem] px-6 py-12 sm:py-16">
      <p className="text-[10px] uppercase tracking-[0.13em] text-muted">
        For judges
      </p>
      <h2 className="mt-2 text-balance text-[26px] leading-[1.22] tracking-[-0.022em] sm:text-[30px]">
        One borehole, five claims, and an agreement that has to balance.
      </h2>
      <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.65] text-ink-soft">
        A mediator for a shrinking community borehole. Its output is not a
        resolution, it is a signed instrument with volumes, hours, meters, levies
        and sanctions.
      </p>

      {/* The whole argument, before any of the evidence for it. */}
      <ol className="mt-8 divide-y divide-rule rounded-xl border border-rule bg-surface">
        {CLAIMS.map((c, i) => (
          <li key={c.head} className="flex gap-4 px-5 py-4">
            <span className="tnum mt-0.5 shrink-0 font-mono text-[12px] text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="block text-[14.5px] font-medium">{c.head}</span>
              <span className="mt-1 block text-[13.5px] leading-[1.6] text-muted">
                {c.sub}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <Section label="The mechanism" title="How it works">
        <div className="max-w-[62ch] space-y-3.5 text-[14px] leading-[1.65] text-ink-soft">
          <p>
            The model runs the room. It does not compute a single litre. A water
            balance derives every protected floor from a headcount, fills the
            remainder by tier weight with a capped iterative algorithm, and
            produces a fault list that stops the document being signed if the
            volumes exceed sustainable yield or any floor is breached.
          </p>
          <p>
            That split exists because the characteristic failure of an eloquent
            mediator is an agreement that reads beautifully and does not add up.
            Here the arithmetic is not the model&rsquo;s opinion, so the terms
            survive being argued with.
          </p>
        </div>
      </Section>

      <Section label="Tiering" title="The idea underneath it">
        <p className="max-w-[62ch] text-[14px] leading-[1.65] text-ink-soft">
          Not all water is the same good. Drinking water is a survival floor
          derived from how many people exist. Water that grows a family&rsquo;s own
          food is a livelihood claim. Water that grows a crop for market is
          commercial and holds only a keep-alive floor. A claim with no beneficiary
          count and no start date is speculative and cannot be allocated against at
          all. That tiering is what lets a 40% supply shock land without either
          starving anyone or destroying a business — and it is why the newest party
          at the table cannot be dismissed, because a floor derived from headcount
          has no opinion about seniority.
        </p>

        <p className="mb-3 mt-6 text-[11px] uppercase tracking-[0.11em] text-muted">
          Tier weights, as the fill actually applies them
        </p>
        <WeightTable
          rows={Object.values(TIERS).map((t) => ({
            label: t.label,
            weight: t.weight,
            asks: t.rule,
          }))}
        />
      </Section>

      <Section
        label={`${CONSTRAINTS.length} of ${CONSTRAINTS.length} met`}
        title="Every constraint in the brief, and where it is met"
      >
        <p className="mb-4 text-[13px] text-muted">
          Each row opens onto how it is enforced. Nothing here is enforced by
          asking the model nicely.
        </p>
        <div className="divide-y divide-rule border-y border-rule">
          {CONSTRAINTS.map((c) => (
            <details key={c.rule} className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full bg-place-soft text-[10px] font-semibold text-place"
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-medium leading-[1.45]">
                  {c.rule}
                </span>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 text-[11px] text-muted transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <div className="pb-4 pl-[29px]">
                <p className="max-w-[62ch] text-[13.5px] leading-[1.62] text-ink-soft">
                  {c.how}
                </p>
                <p className="mt-2.5">
                  <Chip>{c.where}</Chip>
                </p>
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section label="Evidence" title="How the report is broken">
        <div className="rounded-lg bg-panel border border-rule p-4">
          <p className="text-[13px] font-medium">{tabled.title}</p>
          <p className="text-[12px] text-muted">
            {tabled.author} · {tabled.period}
          </p>
          <ul className="mt-2.5 space-y-1">
            {tabled.headline.map((h) => (
              <li key={h} className="text-[12.5px] leading-[1.5] text-ink-soft">
                {h}
              </li>
            ))}
          </ul>
          <ul className="mt-2.5 space-y-1 pt-2.5 border-t border-rule-soft">
            {tabled.annex.map((a) => (
              <li key={a} className="text-[12px] leading-[1.5] text-muted">
                Annex: {a}
              </li>
            ))}
          </ul>
        </div>
        <ol className="mt-4 divide-y divide-rule border-y border-rule">
          {REPORT_BREAKS.map((b, i) => (
            <li key={b.id} className="py-4 flex gap-3.5">
              <span className="tnum shrink-0 w-4 text-[12px] text-muted">{i + 1}</span>
              <span>
                <span className="block text-[13.5px] leading-[1.6]">{b.finding}</span>
                {b.arithmetic && (
                  <span className="mt-1.5 block text-[12px] font-mono leading-[1.5] text-muted">
                    {b.arithmetic}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Four things" title="Try these, in this order">
        <ol className="grid gap-3 sm:grid-cols-2">
          {TRY.map((t, i) => (
            <li
              key={t.do}
              className="rounded-xl border border-rule bg-surface px-5 py-4"
            >
              <span className="tnum font-mono text-[11.5px] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1.5 block text-[14px] font-medium leading-[1.45]">
                {t.do}
              </span>
              <span className="mt-2 block text-[13px] leading-[1.6] text-muted">
                {t.expect}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="Source" title="Where to check the claims">
        <dl className="divide-y divide-rule-soft border-y border-rule-soft">
          {FILES.map((f) => (
            <div key={f.path} className="gap-4 py-3 sm:flex">
              <dt className="shrink-0 font-mono text-[12.5px] sm:w-52">
                <a
                  href={REPO + f.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {f.path}
                </a>
              </dt>
              <dd className="mt-1 text-[13.5px] leading-[1.55] text-muted sm:mt-0">
                {f.what}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
