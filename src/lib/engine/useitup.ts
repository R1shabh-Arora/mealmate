import { RECIPES } from "@/data/recipes";
import { isStaple } from "./cost";
import { recipeAllowed } from "./planner";
import type { PantryItem, Preferences, Recipe, UseItUpSuggestion } from "@/lib/types";
import { daysUntil } from "@/lib/utils";

/** Pantry items expiring within `windowDays`, each with recipes that use them up. */
export function suggestUseItUpMeals(
  pantryItems: PantryItem[],
  prefs: Preferences,
  windowDays = 3
): UseItUpSuggestion[] {
  const suggestions: UseItUpSuggestion[] = [];

  for (const item of pantryItems) {
    if (!item.expiryDate || item.location === "freezer") continue;
    if (item.ingredientId && isStaple(item.ingredientId)) continue;
    const daysLeft = daysUntil(item.expiryDate);
    if (daysLeft < 0 || daysLeft > windowDays) continue;

    const matches = item.ingredientId
      ? RECIPES.filter(
          (r) =>
            recipeAllowed(r, prefs) &&
            r.ingredients.some((ri) => ri.ingredientId === item.ingredientId)
        )
          .sort(
            (a, b) =>
              qtyUsed(b, item.ingredientId!) - qtyUsed(a, item.ingredientId!) ||
              a.totalTime - b.totalTime
          )
          .slice(0, 3)
      : [];

    suggestions.push({
      pantryItemId: item.id,
      ingredientName: item.name,
      daysLeft,
      recipeIds: matches.map((r) => r.id),
    });
  }

  return suggestions.sort((a, b) => a.daysLeft - b.daysLeft);
}

function qtyUsed(recipe: Recipe, ingredientId: string): number {
  return recipe.ingredients.find((ri) => ri.ingredientId === ingredientId)?.qty ?? 0;
}

/**
 * "I don't want to cook": ≤15-minute meals mostly makeable from the current
 * pantry, ranked by how much of the recipe is already in the kitchen.
 */
export function quickMealsFromPantry(
  pantryItems: PantryItem[],
  prefs: Preferences
): Array<{ recipe: Recipe; coverage: number }> {
  const stock = new Map<string, number>();
  for (const item of pantryItems) {
    if (item.ingredientId) stock.set(item.ingredientId, (stock.get(item.ingredientId) ?? 0) + item.qty);
  }

  return RECIPES.filter((r) => r.totalTime <= 15 && recipeAllowed(r, prefs))
    .map((recipe) => {
      const countable = recipe.ingredients.filter((ri) => !isStaple(ri.ingredientId));
      const have = countable.filter((ri) => (stock.get(ri.ingredientId) ?? 0) >= ri.qty * 0.5);
      return { recipe, coverage: countable.length === 0 ? 1 : have.length / countable.length };
    })
    .filter(({ coverage }) => coverage >= 0.5)
    .sort((a, b) => b.coverage - a.coverage || a.recipe.totalTime - b.recipe.totalTime)
    .slice(0, 5);
}
