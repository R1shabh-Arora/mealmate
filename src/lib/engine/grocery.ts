import { INGREDIENTS, getIngredient } from "@/data/ingredients";
import { getRecipe } from "@/data/recipes";
import type {
  GroceryCategory,
  GroceryItem,
  MealPlan,
  PantryItem,
  Preferences,
} from "@/lib/types";
import { SUPERMARKETS } from "@/lib/types";
import { normalizeName, uid } from "@/lib/utils";

export const CATEGORY_ORDER: GroceryCategory[] = [
  "Fruit & Vegetables",
  "Protein",
  "Dairy & Eggs",
  "Grains",
  "Tinned & Jarred",
  "Frozen",
  "Pantry",
  "Spices & Sauces",
];

/** Total quantity of each ingredient the plan consumes (leftover meals cost nothing extra). */
export function planIngredientNeeds(plan: MealPlan): Map<string, number> {
  const needs = new Map<string, number>();
  for (const meal of plan.meals) {
    if (meal.isLeftover) continue;
    const recipe = getRecipe(meal.recipeId);
    const factor = meal.servings / recipe.servings;
    for (const ri of recipe.ingredients) {
      needs.set(ri.ingredientId, (needs.get(ri.ingredientId) ?? 0) + ri.qty * factor);
    }
  }
  return needs;
}

/** Pantry stock per catalog ingredient (matches by id, falls back to normalised name). */
export function pantryStock(pantryItems: PantryItem[]): Map<string, number> {
  const stock = new Map<string, number>();
  const byName = new Map<string, string>(); // normalised name -> ingredientId
  for (const ing of INGREDIENTS) byName.set(normalizeName(ing.name), ing.id);

  for (const item of pantryItems) {
    const id = item.ingredientId ?? byName.get(normalizeName(item.name));
    if (!id) continue;
    stock.set(id, (stock.get(id) ?? 0) + item.qty);
  }
  return stock;
}

/**
 * Consolidated grocery list: one line per ingredient across the whole week,
 * with pantry stock deducted and pack-rounded UK pricing applied.
 */
export function buildGroceryList(
  plan: MealPlan,
  pantryItems: PantryItem[],
  prefs: Preferences
): GroceryItem[] {
  const multiplier = SUPERMARKETS[prefs.supermarket].multiplier;
  const needs = planIngredientNeeds(plan);
  const stock = pantryStock(pantryItems);
  const items: GroceryItem[] = [];

  for (const [ingredientId, needQtyRaw] of needs) {
    const ing = getIngredient(ingredientId);
    const have = stock.get(ingredientId) ?? 0;

    // Spices & sauces are staples: owning the item at all covers a week's pinches.
    if (ing.category === "Spices & Sauces" && have > 0) continue;

    const shortfall = Math.max(0, needQtyRaw - have);
    if (shortfall <= 0.01) continue;

    const packs = Math.max(1, Math.ceil(shortfall / ing.packSize - 0.02));
    items.push({
      id: uid("grocery"),
      ingredientId,
      name: ing.name,
      category: ing.category,
      needQty: Math.round(shortfall * 10) / 10,
      unit: ing.unit,
      packs,
      buyQty: packs * ing.packSize,
      packLabel: ing.packLabel,
      estCost: Math.round(packs * ing.packPrice * multiplier * 100) / 100,
      purchased: false,
      haveQty: Math.round(Math.min(have, needQtyRaw) * 10) / 10,
    });
  }

  items.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name)
  );
  return items;
}

export function groceryTotal(items: GroceryItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.estCost, 0) * 100) / 100;
}

/** Estimated basket cost a plan would produce — used by the budget optimiser. */
export function estimatePlanCost(
  plan: MealPlan,
  pantryItems: PantryItem[],
  prefs: Preferences
): number {
  return groceryTotal(buildGroceryList(plan, pantryItems, prefs));
}
