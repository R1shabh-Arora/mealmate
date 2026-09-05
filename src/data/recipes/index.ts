import type { Recipe } from "@/lib/types";
import { INDIAN_RECIPES } from "./indian";
import { WESTERN_RECIPES } from "./western";

/**
 * Demo recipe library. Every recipe is egg-free, mushroom-free and needs no
 * frying — anything crisp is done in an air fryer or oven, and everything
 * else is a hob simmer, a microwave, or no cooking at all.
 */
export const RECIPES: Recipe[] = [...INDIAN_RECIPES, ...WESTERN_RECIPES];

export const RECIPE_MAP: Map<string, Recipe> = new Map(RECIPES.map((rec) => [rec.id, rec]));

export function getRecipe(id: string): Recipe {
  const found = RECIPE_MAP.get(id);
  if (!found) throw new Error(`Unknown recipe: ${id}`);
  return found;
}
