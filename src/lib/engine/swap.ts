import { getRecipe } from "@/data/recipes";
import type { MealPlan, PlannedMeal, Preferences, Recipe, SwapAlternative } from "@/lib/types";
import { candidatesFor } from "./planner";
import { recipeCostPerServing } from "./cost";

/**
 * Alternatives for a planned meal: same slot, diet-compatible, ranked by how
 * closely they match the current meal's calories, protein, cost and time.
 */
export function findSwapAlternatives(
  plan: MealPlan,
  meal: PlannedMeal,
  prefs: Preferences,
  count = 3
): SwapAlternative[] {
  const current = getRecipe(meal.recipeId);
  const currentCost = recipeCostPerServing(current, prefs.supermarket);
  const inPlanToday = new Set(
    plan.meals.filter((m) => m.day === meal.day).map((m) => m.recipeId)
  );

  const scored = candidatesFor(meal.slot, prefs)
    .filter((r) => r.id !== meal.recipeId)
    .map((r) => ({ recipe: r, distance: distance(r, current, currentCost, prefs) }))
    .sort(
      (a, b) =>
        Number(inPlanToday.has(a.recipe.id)) - Number(inPlanToday.has(b.recipe.id)) ||
        a.distance - b.distance
    );

  return scored.slice(0, count).map(({ recipe }) => ({
    recipeId: recipe.id,
    costDelta:
      Math.round((recipeCostPerServing(recipe, prefs.supermarket) - currentCost) * 100) / 100,
    calorieDelta: recipe.calories - current.calories,
    proteinDelta: recipe.protein - current.protein,
  }));
}

function distance(candidate: Recipe, current: Recipe, currentCost: number, prefs: Preferences): number {
  const candidateCost = recipeCostPerServing(candidate, prefs.supermarket);
  return (
    Math.abs(candidate.calories - current.calories) / 180 +
    Math.abs(candidate.protein - current.protein) / 10 +
    Math.abs(candidateCost - currentCost) / 0.9 +
    Math.abs(candidate.totalTime - current.totalTime) / 18
  );
}
