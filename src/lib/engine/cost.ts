import { getIngredient, proRataCost } from "@/data/ingredients";
import type { Recipe, Supermarket } from "@/lib/types";
import { SUPERMARKETS } from "@/lib/types";

/** Estimated ingredient cost per serving at the chosen supermarket (pro-rata, not pack-rounded). */
export function recipeCostPerServing(recipe: Recipe, supermarket: Supermarket): number {
  const multiplier = SUPERMARKETS[supermarket].multiplier;
  const total = recipe.ingredients.reduce(
    (sum, ri) => sum + proRataCost(ri.ingredientId, ri.qty, multiplier),
    0
  );
  return total / recipe.servings;
}

/** True when the ingredient is a store-cupboard staple that a stocked kitchen already covers. */
export function isStaple(ingredientId: string): boolean {
  return getIngredient(ingredientId).category === "Spices & Sauces";
}
