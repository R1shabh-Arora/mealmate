import type { Diet, Recipe } from "@/lib/types";

export const VEGAN: Diet[] = ["vegan", "vegetarian", "pescatarian", "omnivore"];
export const VEGGIE: Diet[] = ["vegetarian", "pescatarian", "omnivore"];

export type RecipeInput = Omit<Recipe, "totalTime" | "servings" | "diet"> & {
  servings?: number;
  diet?: Diet[];
};

/** Recipe factory: 2 servings and vegetarian by default, totalTime derived. */
export function r(input: RecipeInput): Recipe {
  return {
    servings: 2,
    diet: VEGGIE,
    ...input,
    totalTime: input.prepTime + input.cookTime,
  };
}
