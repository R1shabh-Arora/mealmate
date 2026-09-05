"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GeneratingOverlay, PLAN_STAGES, useStagedTask } from "@/components/generating";
import { MacroPills, MealVisual } from "@/components/meal-visual";
import { Badge, Button, Card, EmptyState, Modal, SectionTitle, Skeleton } from "@/components/ui";
import { getRecipe } from "@/data/recipes";
import { groceryTotal } from "@/lib/engine/grocery";
import { computeNutrition, dayNutrition } from "@/lib/engine/planner";
import { getMealPlannerService } from "@/lib/services/meal-planner-service";
import { useApp } from "@/lib/store";
import type { PlannedMeal, SwapAlternative } from "@/lib/types";
import { DAY_NAMES, DAY_SHORT, SLOT_LABELS } from "@/lib/types";
import { gbp } from "@/lib/utils";

export default function MealPlanPage() {
  const { state, hydrated, generateWeek, swapMeal, removeMeal, moveMeal } = useApp();
  const { stage, busy, run } = useStagedTask();
  const [swapTarget, setSwapTarget] = useState<PlannedMeal | null>(null);
  const [alternatives, setAlternatives] = useState<SwapAlternative[] | null>(null);
  const [moveTarget, setMoveTarget] = useState<PlannedMeal | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const { plan, preferences, grocery } = state;
  const nutrition = useMemo(() => (plan ? computeNutrition(plan, preferences) : null), [plan, preferences]);
  const basket = groceryTotal(grocery);

  const openSwap = async (meal: PlannedMeal) => {
    setSwapTarget(meal);
    setAlternatives(null);
    setMenuFor(null);
    if (!plan) return;
    const alts = await getMealPlannerService().suggestSwaps(plan, meal, preferences);
    setAlternatives(alts);
  };

  const confirmSwap = async (recipeId: string) => {
    if (!swapTarget) return;
    await swapMeal(swapTarget, recipeId);
    setSwapTarget(null);
    setAlternatives(null);
  };

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!plan) {
    return (
      <>
        <GeneratingOverlay stage={stage} />
        <EmptyState
          emoji="🗓️"
          title="Your week hasn't been planned yet"
          body="Generate a 7-day plan built around your pantry, budget and protein target."
          action={
            <Button size="lg" disabled={busy} onClick={() => run(PLAN_STAGES, async () => generateWeek())}>
              ✨ Generate My Week
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <GeneratingOverlay stage={stage} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">This week&apos;s plan</h1>
          {nutrition && (
            <p className="mt-1 text-sm text-ink-soft">
              Avg {nutrition.avgCalories.toLocaleString()} kcal · {nutrition.avgProtein}g protein/day ·{" "}
              <span className={basket > preferences.budget ? "font-semibold text-terra" : "font-semibold text-basil-bright"}>
                {gbp(basket)} basket
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {basket > preferences.budget && (
            <Link href="/groceries">
              <Button variant="danger" size="sm">
                Over budget by {gbp(basket - preferences.budget)} →
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" disabled={busy} onClick={() => run(PLAN_STAGES, async () => generateWeek())}>
            ↻ Regenerate
          </Button>
        </div>
      </div>

      {/* Week grid: horizontal snap-scroll on mobile, 7 columns on wide screens */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar xl:mx-0 xl:grid xl:grid-cols-7 xl:overflow-visible xl:px-0">
        {DAY_NAMES.map((dayName, day) => {
          const dayMeals = plan.meals.filter((m) => m.day === day);
          const dn = dayNutrition(plan, day);
          return (
            <section
              key={day}
              aria-label={dayName}
              className="w-[82vw] max-w-xs shrink-0 snap-start sm:w-64 xl:w-auto xl:max-w-none"
            >
              <Link href={`/meal-plan/${day}`} className="group mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-display text-base font-bold text-ink group-hover:text-basil-bright">
                  <span className="xl:hidden">{dayName}</span>
                  <span className="hidden xl:inline">{DAY_SHORT[day]}</span>
                </h2>
                <span className="text-[11px] font-medium text-ink-soft">
                  {dn.calories} kcal · {dn.protein}g
                </span>
              </Link>
              <div className="grid gap-2.5">
                {dayMeals.length === 0 && (
                  <Card className="p-4 text-center text-xs text-ink-soft">Nothing planned</Card>
                )}
                {dayMeals.map((meal) => {
                  const recipe = getRecipe(meal.recipeId);
                  return (
                    <Card key={meal.id} className="overflow-hidden">
                      <div className="relative">
                        <MealVisual recipe={recipe} className="h-16 w-full" emojiClass="text-3xl" />
                        <span className="absolute left-2 top-2">
                          <Badge variant="neutral" className="bg-card/90">{SLOT_LABELS[meal.slot]}</Badge>
                        </span>
                        {meal.isLeftover && meal.leftoverOf && (
                          <span className="absolute right-2 top-2">
                            <Badge variant="amber" className="bg-butter/95 backdrop-blur-[1px]">♻️ {DAY_SHORT[meal.leftoverOf.day]} dinner</Badge>
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <Link href={`/recipes/${recipe.id}`}>
                          <p className="text-sm font-semibold leading-snug text-ink hover:text-basil-bright">{recipe.name}</p>
                        </Link>
                        <MacroPills className="mt-1.5" calories={recipe.calories} protein={recipe.protein} time={meal.isLeftover ? 5 : recipe.totalTime} />
                        {meal.reasons[0] && (
                          <p className="mt-1.5 text-[11px] leading-snug text-basil-bright">💡 {meal.reasons[0]}</p>
                        )}
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs" onClick={() => openSwap(meal)}>
                            ⇄ Swap
                          </Button>
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 px-0 text-base"
                              aria-label={`More actions for ${recipe.name}`}
                              aria-expanded={menuFor === meal.id}
                              onClick={() => setMenuFor(menuFor === meal.id ? null : meal.id)}
                            >
                              ⋯
                            </Button>
                            {menuFor === meal.id && (
                              <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-sand bg-surface p-1 shadow-[var(--shadow-lift)] animate-fade-up">
                                <Link
                                  href={`/recipes/${recipe.id}`}
                                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-cream"
                                >
                                  📖 View recipe
                                </Link>
                                <button
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-cream"
                                  onClick={() => {
                                    setMoveTarget(meal);
                                    setMenuFor(null);
                                  }}
                                >
                                  📅 Move day
                                </button>
                                <button
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-terra hover:bg-terra-soft"
                                  onClick={() => {
                                    removeMeal(meal.id);
                                    setMenuFor(null);
                                  }}
                                >
                                  🗑 Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <SectionTitle>Why this week works</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 text-sm text-ink-soft">
          <p className="mb-1 text-xl" aria-hidden="true">♻️</p>
          <p className="font-semibold text-ink">{plan.meals.filter((m) => m.isLeftover).length} leftover lunches</p>
          Cook dinner once, eat twice — less cooking, less cost.
        </Card>
        <Card className="p-4 text-sm text-ink-soft">
          <p className="mb-1 text-xl" aria-hidden="true">🧺</p>
          <p className="font-semibold text-ink">{grocery.length} items to buy</p>
          Ingredients are deliberately shared across meals to keep the basket small.
        </Card>
        <Card className="p-4 text-sm text-ink-soft">
          <p className="mb-1 text-xl" aria-hidden="true">🍳</p>
          <p className="font-semibold text-ink">Batch-friendly</p>
          Rice, dal and sauces are grouped into one prep session — see{" "}
          <Link href="/meal-prep" className="font-semibold text-basil-bright hover:underline">
            Meal Prep
          </Link>
          .
        </Card>
      </div>

      {/* Swap modal */}
      <Modal
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        title={swapTarget ? `Swap ${SLOT_LABELS[swapTarget.slot].toLowerCase()}` : "Swap meal"}
      >
        {swapTarget && (
          <div className="grid gap-3">
            <p className="text-sm text-ink-soft">
              Alternatives matched on calories, protein, cost and time:
            </p>
            {alternatives === null && (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            )}
            {alternatives?.map((alt) => {
              const recipe = getRecipe(alt.recipeId);
              return (
                <button
                  key={alt.recipeId}
                  onClick={() => confirmSwap(alt.recipeId)}
                  className="flex items-center gap-3 rounded-2xl border border-sand bg-surface p-3 text-left transition-all hover:border-basil hover:shadow-[var(--shadow-soft)]"
                >
                  <MealVisual recipe={recipe} className="h-14 w-14 shrink-0 rounded-xl" emojiClass="text-2xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{recipe.name}</p>
                    <MacroPills calories={recipe.calories} protein={recipe.protein} time={recipe.totalTime} />
                  </div>
                  <div className="text-right text-xs font-semibold">
                    <p className={alt.costDelta <= 0 ? "text-basil-bright" : "text-terra"}>
                      {alt.costDelta <= 0 ? "−" : "+"}
                      {gbp(Math.abs(alt.costDelta)).replace("£", "£")}/serv
                    </p>
                    <p className="text-ink-soft">
                      {alt.proteinDelta >= 0 ? "+" : ""}
                      {alt.proteinDelta}g protein
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Move modal */}
      <Modal open={moveTarget !== null} onClose={() => setMoveTarget(null)} title="Move meal to…">
        {moveTarget && (
          <div className="grid grid-cols-2 gap-2">
            {DAY_NAMES.map((dayName, day) => (
              <Button
                key={day}
                variant={day === moveTarget.day ? "secondary" : "outline"}
                disabled={day === moveTarget.day}
                onClick={() => {
                  moveMeal(moveTarget.id, day);
                  setMoveTarget(null);
                }}
              >
                {dayName}
              </Button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
