"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MacroPills, MealVisual } from "@/components/meal-visual";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { getRecipe } from "@/data/recipes";
import { dayNutrition } from "@/lib/engine/planner";
import { useApp } from "@/lib/store";
import { DAY_NAMES, SLOT_LABELS } from "@/lib/types";
import { formatMins } from "@/lib/utils";

export default function DayDetailClient() {
  const params = useParams<{ id: string }>();
  const day = Number(params.id);
  const { state, hydrated } = useApp();
  const { plan } = state;

  if (!hydrated) return <Skeleton className="h-96" />;

  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return (
      <EmptyState
        emoji="🤔"
        title="That day doesn't exist"
        body="Pick a day from the weekly plan."
        action={
          <Link href="/meal-plan">
            <Button>Back to plan</Button>
          </Link>
        }
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState
        emoji="🗓️"
        title="Your week hasn't been planned yet"
        body="Generate a plan first, then explore each day."
        action={
          <Link href="/meal-plan">
            <Button>Go to Meal Plan</Button>
          </Link>
        }
      />
    );
  }

  const meals = plan.meals.filter((m) => m.day === day);
  const dn = dayNutrition(plan, day);

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-2xl gap-5">
      <div className="flex items-center justify-between">
        <Link href="/meal-plan" className="text-sm font-semibold text-basil-bright hover:underline">
          ← Week
        </Link>
        <div className="flex gap-2">
          {day > 0 && (
            <Link href={`/meal-plan/${day - 1}`}>
              <Button variant="ghost" size="sm">← {DAY_NAMES[day - 1].slice(0, 3)}</Button>
            </Link>
          )}
          {day < 6 && (
            <Link href={`/meal-plan/${day + 1}`}>
              <Button variant="ghost" size="sm">{DAY_NAMES[day + 1].slice(0, 3)} →</Button>
            </Link>
          )}
        </div>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold text-ink">{DAY_NAMES[day]}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {dn.calories} kcal · {dn.protein}g protein · {dn.carbs}g carbs · {dn.fat}g fat · {dn.fibre}g fibre ·{" "}
          {formatMins(dn.time)} cooking
        </p>
      </div>

      {meals.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-soft">Nothing planned for this day.</Card>
      )}

      {meals.map((meal) => {
        const recipe = getRecipe(meal.recipeId);
        return (
          <Card key={meal.id} className="overflow-hidden">
            <MealVisual recipe={recipe} className="h-36 w-full" emojiClass="text-6xl" />
            <div className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge>{SLOT_LABELS[meal.slot]}</Badge>
                {meal.isLeftover && meal.leftoverOf && (
                  <Badge variant="amber">♻️ Leftover from {DAY_NAMES[meal.leftoverOf.day]} dinner</Badge>
                )}
                <Badge variant="neutral">{recipe.cuisine}</Badge>
              </div>
              <Link href={`/recipes/${recipe.id}`}>
                <h2 className="font-display text-xl font-semibold text-ink hover:text-basil-bright">{recipe.name}</h2>
              </Link>
              <p className="mt-1 text-sm text-ink-soft">{recipe.description}</p>
              <MacroPills className="mt-3" calories={recipe.calories} protein={recipe.protein} time={meal.isLeftover ? 5 : recipe.totalTime} />
              {meal.reasons.length > 0 && (
                <ul className="mt-4 grid gap-1.5" aria-label="Why this meal">
                  {meal.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-sm text-basil-bright">
                      <span aria-hidden="true">💡</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Link href={`/recipes/${recipe.id}`}>
                  <Button variant="secondary" size="sm">
                    {meal.isLeftover ? "Reheat instructions →" : "View recipe →"}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
