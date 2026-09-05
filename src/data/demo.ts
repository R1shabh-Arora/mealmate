import type { PantryItem, Preferences } from "@/lib/types";
import { getIngredient } from "./ingredients";
import { isoDateInDays, uid } from "@/lib/utils";

export const DEFAULT_PREFERENCES: Preferences = {
  people: 2,
  budget: 50,
  diet: "vegetarian",
  goals: ["high-protein", "balanced", "save-money"],
  proteinTarget: "auto",
  calorieTarget: "auto",
  cuisines: ["Indian", "British", "Mediterranean"],
  maxCookTime: 30,
  meals: ["breakfast", "lunch", "dinner"],
  equipment: ["hob", "oven", "microwave", "air-fryer"],
  supermarket: "aldi",
  avoidIngredients: ["mushrooms", "eggs"],
};

function pantry(ingredientId: string, qty: number, expiresInDays?: number): PantryItem {
  const ing = getIngredient(ingredientId);
  return {
    id: uid("pantry"),
    ingredientId,
    name: ing.name,
    category: ing.category,
    qty,
    unit: ing.unit,
    location: ing.defaultLocation,
    expiryDate: isoDateInDays(expiresInDays ?? ing.shelfLifeDays),
  };
}

/** Seed pantry for the demo experience: the spec's starter kitchen. */
export function buildDemoPantry(): PantryItem[] {
  return [
    pantry("rice", 1000),
    pantry("oats", 750),
    pantry("greek-yoghurt", 750, 4),
    pantry("red-lentils", 400),
    pantry("onions", 600),
    pantry("tomatoes", 300, 3),
    pantry("spinach", 240, 2),
    pantry("cumin", 60),
    pantry("turmeric", 70),
    pantry("garam-masala", 50),
    pantry("curry-powder", 60),
    pantry("chilli-flakes", 30),
    pantry("veg-oil", 700),
    pantry("garlic", 120),
    pantry("frozen-peas", 500),
  ];
}
