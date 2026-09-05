"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GeneratingOverlay, PLAN_STAGES, useStagedTask } from "@/components/generating";
import { MacroPills, MealVisual } from "@/components/meal-visual";
import { Badge, Button, Card, EmptyState, Modal, Progress, SectionTitle, Skeleton } from "@/components/ui";
import { getRecipe } from "@/data/recipes";
import { groceryTotal } from "@/lib/engine/grocery";
import { computeNutrition } from "@/lib/engine/planner";
import { generateMealPrepSchedule } from "@/lib/engine/prep";
import { suggestUseItUpMeals, quickMealsFromPantry } from "@/lib/engine/useitup";
import { useApp } from "@/lib/store";
import { DAY_NAMES, SLOT_LABELS } from "@/lib/types";
import { formatMins, gbp } from "@/lib/utils";

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7; // Monday = 0
}

export default function DashboardPage() {
  const router = useRouter();
  const { state, hydrated, generateWeek, startDemo, startNextWeek } = useApp();
  const { stage, busy, run } = useStagedTask();
  const [quickOpen, setQuickOpen] = useState(false);

  const { plan, grocery, preferences, pantry } = state;

  const nutrition = useMemo(() => (plan ? computeNutrition(plan, preferences) : null), [plan, preferences]);
  const prep = useMemo(() => (plan ? generateMealPrepSchedule(plan) : null), [plan]);
  const useItUp = useMemo(() => suggestUseItUpMeals(pantry, preferences), [pantry, preferences]);
  const quickMeals = useMemo(() => quickMealsFromPantry(pantry, preferences), [pantry, preferences]);

  const basket = groceryTotal(grocery);
  const today = todayIndex();
  const todaysMeals = plan?.meals.filter((m) => m.day === today) ?? [];

  const wasteRisk = useMemo(() => {
    if (!plan) return null;
    const usedIngredients = new Set(
      plan.meals.flatMap((m) => getRecipe(m.recipeId).ingredients.map((ri) => ri.ingredientId))
    );
    const wasted = useItUp.filter((s) => {
      const item = pantry.find((p) => p.id === s.pantryItemId);
      return item?.ingredientId && !usedIngredients.has(item.ingredientId);
    });
    return wasted.length === 0 ? "Low" : wasted.length <= 2 ? "Medium" : "High";
  }, [plan, useItUp, pantry]);

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <EmptyState
        emoji="👋"
        title="Welcome to MealMate"
        body="Set up your household, budget and goals — or jump straight into the demo kitchen."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <GeneratingOverlay stage={stage} />
            <Link href="/onboarding">
              <Button>Get set up</Button>
            </Link>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(PLAN_STAGES, async () => startDemo())}
            >
              ✨ Try the demo
            </Button>
          </div>
        }
      />
    );
  }

  const handleGenerate = () => run(PLAN_STAGES, async () => generateWeek());

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <GeneratingOverlay stage={stage} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-basil-bright">{DAY_NAMES[today]}</p>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Your week at a glance</h1>
        </div>
        <div className="flex gap-2">
          {quickMeals.length > 0 && (
            <Button variant="secondary" onClick={() => setQuickOpen(true)}>
              😮‍💨 I don&apos;t want to cook
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={busy}>
            {plan ? "↻ Regenerate week" : "✨ Generate My Week"}
          </Button>
        </div>
      </div>

      {plan && nutrition ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Weekly budget</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {gbp(basket)} <span className="text-sm font-medium text-ink-soft">/ {gbp(preferences.budget)}</span>
            </p>
            <Progress
              className="mt-2"
              value={basket}
              max={preferences.budget}
              tone={basket > preferences.budget ? "terra" : "basil"}
              label="Budget used"
            />
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Daily protein</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {nutrition.avgProtein}g <span className="text-sm font-medium text-ink-soft">/ {nutrition.proteinTarget}g</span>
            </p>
            <Progress className="mt-2" value={nutrition.avgProtein} max={nutrition.proteinTarget} label="Protein progress" />
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Daily calories</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {nutrition.avgCalories.toLocaleString()} <span className="text-sm font-medium text-ink-soft">kcal</span>
            </p>
            <Progress className="mt-2" value={nutrition.avgCalories} max={nutrition.calorieTarget} tone="amber" label="Calorie progress" />
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Meal prep</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">{prep ? formatMins(prep.totalMins) : "—"}</p>
            <p className="mt-1 text-xs text-ink-soft">{prep ? `${formatMins(prep.activeMins)} hands-on` : ""}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Food waste</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">{wasteRisk}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {wasteRisk === "Low" ? "Expiring food is planned in" : "Check Use It Up below"}
            </p>
          </Card>
        </div>
      ) : (
        <EmptyState
          emoji="🗓️"
          title="Your week hasn't been planned yet"
          body="MealMate will build 7 days of meals around your pantry, protein target and budget."
          action={
            <Button size="lg" onClick={handleGenerate} disabled={busy}>
              ✨ Generate My Week
            </Button>
          }
        />
      )}

      {useItUp.length > 0 && (
        <Card className="border-l-4 border-l-terra p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">
                ⏳ Use it up: {useItUp.slice(0, 3).map((s) => s.ingredientName).join(", ")}
              </p>
              <p className="text-sm text-ink-soft">
                {useItUp.length === 1 ? "1 ingredient is" : `${useItUp.length} ingredients are`} close to expiry.
              </p>
            </div>
            <Link href="/ingredients#use-it-up">
              <Button variant="danger" size="sm">
                See rescue recipes
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {plan && (
        <section>
          <SectionTitle
            right={
              <Link href="/meal-plan" className="text-sm font-semibold text-basil-bright hover:underline">
                Full week →
              </Link>
            }
          >
            Today&apos;s meals
          </SectionTitle>
          {todaysMeals.length === 0 ? (
            <Card className="p-6 text-sm text-ink-soft">Nothing planned for today.</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todaysMeals.map((meal) => {
                const recipe = getRecipe(meal.recipeId);
                return (
                  <Link key={meal.id} href={`/recipes/${recipe.id}`} className="group">
                    <Card className="overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
                      <MealVisual recipe={recipe} className="h-28 w-full" emojiClass="text-5xl" />
                      <div className="p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="neutral">{SLOT_LABELS[meal.slot]}</Badge>
                          {meal.isLeftover && <Badge variant="amber">♻️ Leftover</Badge>}
                        </div>
                        <p className="font-semibold text-ink group-hover:text-basil-bright">{recipe.name}</p>
                        <MacroPills className="mt-2" calories={recipe.calories} protein={recipe.protein} time={meal.isLeftover ? 5 : recipe.totalTime} />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {plan && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-ink">Finished this week?</p>
            <p className="text-sm text-ink-soft">
              Carry leftover ingredients into next week and plan around them.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              startNextWeek();
              router.push("/meal-plan");
            }}
          >
            Start Next Week →
          </Button>
        </Card>
      )}

      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="No-cook rescue meals" wide>
        <p className="mb-4 text-sm text-ink-soft">
          Ready in 15 minutes or less, mostly from what&apos;s already in your kitchen.
        </p>
        <div className="grid gap-3">
          {quickMeals.map(({ recipe, coverage }) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} onClick={() => setQuickOpen(false)}>
              <Card className="flex items-center gap-4 p-3 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <MealVisual recipe={recipe} className="h-16 w-16 shrink-0 rounded-xl" emojiClass="text-3xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{recipe.name}</p>
                  <MacroPills calories={recipe.calories} protein={recipe.protein} time={recipe.totalTime} />
                </div>
                <Badge variant={coverage >= 0.99 ? "green" : "default"}>
                  {Math.round(coverage * 100)}% in kitchen
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
