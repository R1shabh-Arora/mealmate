"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MealVisual } from "@/components/meal-visual";
import { Badge, Button, Card, EmptyState, Modal, Progress, SectionTitle } from "@/components/ui";
import { getIngredient } from "@/data/ingredients";
import { RECIPE_MAP } from "@/data/recipes";
import { recipeCostPerServing } from "@/lib/engine/cost";
import { useApp } from "@/lib/store";
import { formatQty, gbp } from "@/lib/utils";

function extractTimerMinutes(step: string): number | null {
  const match = step.match(/(\d+)(?:–|-)?(\d+)?\s*min/);
  if (!match) return null;
  return Number(match[2] ?? match[1]);
}

function CookingMode({
  open,
  onClose,
  steps,
  recipeName,
}: {
  open: boolean;
  onClose: () => void;
  steps: string[];
  recipeName: string;
}) {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setSecondsLeft(null);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    setSecondsLeft(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [index]);

  const startTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return s === null ? null : 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const timerMins = extractTimerMinutes(steps[index] ?? "");
  const done = index >= steps.length;

  return (
    <Modal open={open} onClose={onClose} title={`Cooking: ${recipeName}`} wide>
      {done ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-6xl" aria-hidden="true">🎉</span>
          <p className="font-display text-2xl font-bold text-ink">All done — enjoy!</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-soft">
              <span>
                Step {index + 1} of {steps.length}
              </span>
              {secondsLeft !== null && (
                <span
                  className={`tabular-nums ${secondsLeft === 0 ? "text-terra" : "text-basil-bright"}`}
                  role="timer"
                  aria-live={secondsLeft === 0 ? "assertive" : "off"}
                >
                  {secondsLeft === 0
                    ? "⏰ Time's up!"
                    : `⏱ ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
                </span>
              )}
            </div>
            <Progress value={index + 1} max={steps.length} label="Cooking progress" />
          </div>

          <p className="min-h-24 font-display text-xl font-semibold leading-relaxed text-ink sm:text-2xl">
            {steps[index]}
          </p>

          {timerMins !== null && secondsLeft === null && (
            <Button variant="secondary" onClick={() => startTimer(timerMins)}>
              ⏱ Start {timerMins}-minute timer
            </Button>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              ← Previous
            </Button>
            <Button size="lg" onClick={() => setIndex(index + 1)}>
              {index === steps.length - 1 ? "Finish ✓" : "Next →"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function RecipeDetailClient() {
  const params = useParams<{ id: string }>();
  const { state } = useApp();
  const [cooking, setCooking] = useState(false);

  const recipe = RECIPE_MAP.get(params.id);
  const people = state.preferences.people;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    const factor = people / recipe.servings;
    return recipe.ingredients.map((ri) => {
      const ing = getIngredient(ri.ingredientId);
      return { name: ing.name, qty: ri.qty * factor, unit: ing.unit };
    });
  }, [recipe, people]);

  if (!recipe) {
    return (
      <EmptyState
        emoji="🍽️"
        title="Recipe not found"
        body="It may have been removed — browse the full collection instead."
        action={
          <Link href="/recipes">
            <Button>All recipes</Button>
          </Link>
        }
      />
    );
  }

  const cost = recipeCostPerServing(recipe, state.preferences.supermarket);

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-3xl gap-6">
      <Link href="/recipes" className="text-sm font-semibold text-basil-bright hover:underline">
        ← All recipes
      </Link>

      <Card className="overflow-hidden">
        <MealVisual recipe={recipe} className="h-48 w-full sm:h-60" emojiClass="text-8xl" />
        <div className="p-6">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="neutral">{recipe.cuisine}</Badge>
            {recipe.mealType.map((slot) => (
              <Badge key={slot} variant="default" className="capitalize">
                {slot}
              </Badge>
            ))}
            {recipe.tags.includes("batch") && <Badge variant="amber">🍳 Batch-friendly</Badge>}
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">{recipe.name}</h1>
          <p className="mt-2 text-ink-soft">{recipe.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            {[
              { label: "Calories", value: `${recipe.calories}` },
              { label: "Protein", value: `${recipe.protein}g` },
              { label: "Carbs", value: `${recipe.carbs}g` },
              { label: "Fat", value: `${recipe.fat}g` },
              { label: "Fibre", value: `${recipe.fibre}g` },
              { label: "Est. cost", value: gbp(cost) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-cream px-2 py-3">
                <p className="font-display text-lg font-bold text-ink">{stat.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-[11px] text-ink-soft">Per serving · prices are estimates</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium text-ink-soft">
            <span>🔪 Prep {recipe.prepTime}m</span>
            <span>🍳 Cook {recipe.cookTime}m</span>
            <span>⏱ Total {recipe.totalTime}m</span>
            <span>🍽 Scaled for {people} {people === 1 ? "person" : "people"}</span>
          </div>

          <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={() => setCooking(true)}>
            👨‍🍳 Start Cooking
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-2">
          <SectionTitle>Ingredients</SectionTitle>
          <Card className="p-5">
            <ul className="grid gap-2.5">
              {scaledIngredients.map((ing) => (
                <li key={ing.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink">{ing.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-basil-bright">
                    {formatQty(ing.qty, ing.unit)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="md:col-span-3">
          <SectionTitle>Method</SectionTitle>
          <Card className="p-5">
            <ol className="grid gap-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-basil-soft text-xs font-bold text-basil-bright" aria-hidden="true">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card className="p-4 text-sm">
              <p className="mb-1 font-semibold text-ink">🧊 Storage</p>
              <p className="text-ink-soft">{recipe.storageInstructions}</p>
            </Card>
            <Card className="p-4 text-sm">
              <p className="mb-1 font-semibold text-ink">♨️ Reheating</p>
              <p className="text-ink-soft">{recipe.reheatInstructions}</p>
            </Card>
          </div>
        </section>
      </div>

      <CookingMode open={cooking} onClose={() => setCooking(false)} steps={recipe.instructions} recipeName={recipe.name} />
    </div>
  );
}
