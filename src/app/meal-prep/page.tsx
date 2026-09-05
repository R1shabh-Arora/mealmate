"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, Button, Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { generateMealPrepSchedule } from "@/lib/engine/prep";
import { useApp } from "@/lib/store";
import { cn, formatMins } from "@/lib/utils";

function clockLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function MealPrepPage() {
  const { state, hydrated } = useApp();
  const { plan } = state;

  const prep = useMemo(() => (plan ? generateMealPrepSchedule(plan) : null), [plan]);
  // What these same components would cost cooked back-to-back, with nothing overlapping.
  const sequentialMins = useMemo(
    () => (prep ? prep.tasks.reduce((sum, t) => sum + t.activeMins + t.passiveMins, 0) : 0),
    [prep]
  );

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!plan || !prep) {
    return (
      <EmptyState
        emoji="🍳"
        title="No prep schedule yet"
        body="Generate your meal plan first — MealMate will group the week's cooking into one efficient batch session."
        action={
          <Link href="/meal-plan">
            <Button>Go to Meal Plan</Button>
          </Link>
        }
      />
    );
  }

  if (prep.tasks.length === 0) {
    return (
      <EmptyState
        emoji="🧘"
        title="Nothing to batch this week"
        body="This week's meals are all quick single cooks — no big prep session needed."
      />
    );
  }

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Your Meal Prep</h1>
        <p className="mt-1 text-sm text-ink-soft">
          One batch session covers the week&apos;s building blocks. Best done Sunday afternoon.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="font-display text-2xl font-bold text-ink">{formatMins(prep.totalMins)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">In the kitchen</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="font-display text-2xl font-bold text-basil-bright">
              {formatMins(sequentialMins - prep.totalMins)}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Saved by batching</p>
          </Card>
        </div>
        <p className="mt-2 px-1 text-xs text-ink-soft">
          {formatMins(prep.activeMins)} of that is hands-on, with {formatMins(prep.passiveMins)} of simmering and
          roasting overlapping it. Cooked one after another these would take {formatMins(sequentialMins)}.
        </p>
      </div>

      <section>
        <SectionTitle>Cook once, use all week</SectionTitle>
        <div className="grid gap-3">
          {prep.tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{task.component}</p>
                <div className="flex gap-1.5">
                  <Badge>{formatMins(task.activeMins)} active</Badge>
                  {task.passiveMins > 0 && <Badge variant="neutral">{formatMins(task.passiveMins)} unattended</Badge>}
                </div>
              </div>
              <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
                {task.feeds.map((feed) => (
                  <li key={feed} className="flex items-start gap-1.5 text-xs text-ink-soft">
                    <span className="text-basil" aria-hidden="true">→</span>
                    {feed}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Optimised timeline</SectionTitle>
        <Card className="p-5">
          <ol className="relative grid gap-0.5 border-l-2 border-sand pl-5">
            {prep.timeline.map((entry, i) => (
              <li key={i} className="relative pb-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card",
                    entry.kind === "active" ? "bg-basil" : "bg-sand"
                  )}
                />
                <p className="text-xs font-bold tabular-nums text-basil-bright">{clockLabel(entry.startMin)}</p>
                <p className={cn("text-sm", entry.kind === "active" ? "font-semibold text-ink" : "text-ink-soft")}>
                  {entry.kind === "active" ? entry.label : `⏳ ${entry.label} — get on with the next job`}
                </p>
              </li>
            ))}
            <li className="relative">
              <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card bg-terra" />
              <p className="text-xs font-bold tabular-nums text-terra">{clockLabel(prep.totalMins)}</p>
              <p className="text-sm font-semibold text-ink">Done — portion, label and chill 🎉</p>
            </li>
          </ol>
        </Card>
        <p className="mt-2 text-xs text-ink-soft">
          Start at the top and work down — each job begins while the one above it is still cooking.
        </p>
      </section>
    </div>
  );
}
