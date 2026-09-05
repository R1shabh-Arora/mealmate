import { getIngredient } from "@/data/ingredients";
import { RECIPES, getRecipe } from "@/data/recipes";
import type {
  MealPlan,
  MealSlot,
  NutritionSummary,
  PantryItem,
  PlannedMeal,
  Preferences,
  Recipe,
} from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";
import { daysUntil, hashString, seededRandom, uid } from "@/lib/utils";
import { recipeCostPerServing, isStaple } from "./cost";

export interface Targets {
  calories: number;
  protein: number;
}

export function resolveTargets(prefs: Preferences): Targets {
  let calories = prefs.calorieTarget === "auto" ? 2000 : prefs.calorieTarget;
  if (prefs.calorieTarget === "auto" && prefs.goals.includes("lower-calorie")) calories = 1800;
  let protein = prefs.proteinTarget === "auto" ? 90 : prefs.proteinTarget;
  if (
    prefs.proteinTarget === "auto" &&
    (prefs.goals.includes("high-protein") || prefs.goals.includes("muscle"))
  ) {
    protein = 100;
  }
  return { calories, protein };
}

/** Share of the day's calories assigned to each planned slot. */
export function slotShares(meals: MealSlot[]): Record<MealSlot, number> {
  const base: Record<MealSlot, number> = { breakfast: 0.25, lunch: 0.33, dinner: 0.42, snack: 0.12 };
  const total = meals.reduce((sum, slot) => sum + base[slot], 0);
  const shares = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const slot of meals) shares[slot] = base[slot] / total;
  return shares;
}

function dietOk(recipe: Recipe, prefs: Preferences): boolean {
  return recipe.diet.includes(prefs.diet);
}

function equipmentOk(recipe: Recipe, prefs: Preferences): boolean {
  if (recipe.equipment && !recipe.equipment.every((eq) => prefs.equipment.includes(eq))) {
    return false;
  }
  if (recipe.equipmentAnyOf && !recipe.equipmentAnyOf.some((eq) => prefs.equipment.includes(eq))) {
    return false;
  }
  return true;
}

function avoidsOk(recipe: Recipe, prefs: Preferences): boolean {
  if (prefs.avoidIngredients.length === 0) return true;
  return !recipe.ingredients.some((ri) => prefs.avoidIngredients.includes(ri.ingredientId));
}

/** Hard constraints: diet, kitchen equipment and ingredients the user avoids. */
export function recipeAllowed(recipe: Recipe, prefs: Preferences): boolean {
  return dietOk(recipe, prefs) && equipmentOk(recipe, prefs) && avoidsOk(recipe, prefs);
}

/** Candidates for a slot; relaxes the time cap in steps rather than returning nothing. */
export function candidatesFor(slot: MealSlot, prefs: Preferences): Recipe[] {
  const eligible = RECIPES.filter((r) => r.mealType.includes(slot) && recipeAllowed(r, prefs));
  const caps = [prefs.maxCookTime, 30, 45, 60].filter((c) => c >= prefs.maxCookTime);
  for (const cap of caps) {
    const found = eligible.filter((r) => r.totalTime <= cap);
    if (found.length >= 3) return found;
  }
  return eligible;
}

interface PlanContext {
  prefs: Preferences;
  targets: Targets;
  shares: Record<MealSlot, number>;
  mealBudget: number;
  usedIngredients: Map<string, number>; // ingredientId -> times used this week
  recipeUse: Map<string, number>;
  expiring: Map<string, number>; // ingredientId -> days left
  pantryIds: Set<string>;
  lastCuisine: Partial<Record<MealSlot, string>>;
  rng: () => number;
}

function scoreRecipe(recipe: Recipe, slot: MealSlot, ctx: PlanContext): number {
  const { prefs, targets, shares } = ctx;
  const targetCal = targets.calories * shares[slot];
  const targetProt = targets.protein * shares[slot];
  const cost = recipeCostPerServing(recipe, prefs.supermarket);

  let score = 0;

  // Calorie fit for the slot.
  score += (1 - Math.min(1, Math.abs(recipe.calories - targetCal) / Math.max(targetCal, 1))) * 1.0;

  // Protein: reward getting close to (or beating) the slot target.
  const protWeight =
    prefs.goals.includes("high-protein") || prefs.goals.includes("muscle") ? 2.1 : 1.2;
  score += Math.min(1.25, recipe.protein / Math.max(targetProt, 1)) * protWeight;

  // Cost: cheaper than the per-meal budget is good.
  const costWeight = prefs.goals.includes("save-money") ? 1.2 : 0.8;
  score +=
    Math.max(-1, Math.min(1, (ctx.mealBudget * 1.35 - cost) / Math.max(ctx.mealBudget, 0.5))) *
    costWeight;

  // Ingredient reuse: prefer recipes built from what's already in play.
  const reuseWeight = prefs.goals.includes("less-waste") ? 0.22 : 0.15;
  let reuse = 0;
  let expiringBonus = 0;
  for (const ri of recipe.ingredients) {
    if (isStaple(ri.ingredientId)) continue;
    if (ctx.usedIngredients.has(ri.ingredientId) || ctx.pantryIds.has(ri.ingredientId)) {
      reuse += reuseWeight;
    }
    const daysLeft = ctx.expiring.get(ri.ingredientId);
    if (daysLeft !== undefined) expiringBonus = Math.max(expiringBonus, 1.1 - daysLeft * 0.15);
  }
  score += Math.min(0.9, reuse) + expiringBonus;

  // Variety: strongly discourage repeats, gently discourage same-cuisine streaks.
  score -= (ctx.recipeUse.get(recipe.id) ?? 0) * 1.6;
  if (ctx.lastCuisine[slot] === recipe.cuisine) score -= 0.25;

  // Cuisine preference (soft).
  if (prefs.cuisines.includes("Mixed") || prefs.cuisines.includes(recipe.cuisine)) score += 0.4;
  else score -= 0.45;

  // Cooking time.
  if (prefs.goals.includes("save-time")) {
    score += ((prefs.maxCookTime - recipe.totalTime) / prefs.maxCookTime) * 0.5;
  }

  // Batch-friendliness helps meal-prep efficiency.
  if (recipe.tags.includes("batch")) score += 0.2;

  // Deterministic jitter for tie-breaking.
  score += (ctx.rng() - 0.5) * 0.12;

  return score;
}

function buildReasons(recipe: Recipe, ctx: PlanContext, isLeftoverSource: boolean): string[] {
  const reasons: string[] = [];
  const cost = recipeCostPerServing(recipe, ctx.prefs.supermarket);

  for (const ri of recipe.ingredients) {
    const daysLeft = ctx.expiring.get(ri.ingredientId);
    if (daysLeft !== undefined && !isStaple(ri.ingredientId)) {
      const name = getIngredientName(ri.ingredientId);
      reasons.push(
        daysLeft <= 1
          ? `Uses your ${name.toLowerCase()} before it expires`
          : `Uses your ${name.toLowerCase()} (expires in ${daysLeft} days)`
      );
      break;
    }
  }

  const shared = recipe.ingredients.filter(
    (ri) => !isStaple(ri.ingredientId) && (ctx.usedIngredients.get(ri.ingredientId) ?? 0) > 0
  );
  if (shared.length >= 2) {
    reasons.push(`Shares ${shared.length} ingredients with other meals this week`);
  }

  if (recipe.protein >= 22) reasons.push(`${recipe.protein}g protein per serving`);
  if (cost <= ctx.mealBudget * 0.8) reasons.push(`Great value at ~£${cost.toFixed(2)} per serving`);
  if (recipe.totalTime <= 15) reasons.push(`Ready in ${recipe.totalTime} minutes`);
  if (isLeftoverSource) reasons.push("Cooked double — tomorrow's lunch is already done");
  else if (recipe.tags.includes("batch")) reasons.push("Can be batch-cooked on prep day");

  return reasons.slice(0, 3);
}

function getIngredientName(id: string): string {
  return getIngredient(id).name;
}

/**
 * Deterministic 7-day meal-plan optimiser.
 * Dinners are placed first (they anchor leftovers and batches), then lunches,
 * breakfasts and snacks. Same inputs + same seed → same plan.
 */
export function generateMealPlan(
  prefs: Preferences,
  pantryItems: PantryItem[],
  seed: number
): MealPlan {
  const targets = resolveTargets(prefs);
  const shares = slotShares(prefs.meals);
  const mealsPerWeek = prefs.meals.length * 7;
  const ctx: PlanContext = {
    prefs,
    targets,
    shares,
    mealBudget: prefs.budget / (prefs.people * mealsPerWeek),
    usedIngredients: new Map(),
    recipeUse: new Map(),
    expiring: new Map(),
    pantryIds: new Set(),
    lastCuisine: {},
    rng: seededRandom(seed ^ hashString(JSON.stringify(prefs))),
  };

  for (const item of pantryItems) {
    if (!item.ingredientId) continue;
    ctx.pantryIds.add(item.ingredientId);
    if (item.expiryDate) {
      const days = daysUntil(item.expiryDate);
      if (days >= 0 && days <= 4 && item.location !== "freezer") {
        ctx.expiring.set(item.ingredientId, days);
      }
    }
  }

  const meals: PlannedMeal[] = [];
  const leftoverLunchDays = new Set<number>();
  let leftoversPlaced = 0;

  const placeMeal = (day: number, slot: MealSlot, recipe: Recipe, opts: { leftoverSource?: boolean }) => {
    const servings = prefs.people * (opts.leftoverSource ? 2 : 1);
    meals.push({
      id: uid("meal"),
      day,
      slot,
      recipeId: recipe.id,
      servings,
      reasons: buildReasons(recipe, ctx, Boolean(opts.leftoverSource)),
    });
    ctx.recipeUse.set(recipe.id, (ctx.recipeUse.get(recipe.id) ?? 0) + 1);
    ctx.lastCuisine[slot] = recipe.cuisine;
    for (const ri of recipe.ingredients) {
      ctx.usedIngredients.set(ri.ingredientId, (ctx.usedIngredients.get(ri.ingredientId) ?? 0) + 1);
    }
  };

  const slotOrder: MealSlot[] = ["dinner", "lunch", "breakfast", "snack"];

  for (const slot of slotOrder) {
    if (!prefs.meals.includes(slot)) continue;
    for (let day = 0; day < 7; day++) {
      if (slot === "lunch" && leftoverLunchDays.has(day)) continue;

      const candidates = candidatesFor(slot, prefs);
      if (candidates.length === 0) continue;

      let best: Recipe | null = null;
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        const s = scoreRecipe(candidate, slot, ctx);
        if (s > bestScore) {
          bestScore = s;
          best = candidate;
        }
      }
      if (!best) continue;

      const wantsLeftover =
        slot === "dinner" &&
        Boolean(best.makesLeftovers) &&
        prefs.meals.includes("lunch") &&
        day < 6 &&
        leftoversPlaced < 3 &&
        day % 2 === 0;

      placeMeal(day, slot, best, { leftoverSource: wantsLeftover });

      if (wantsLeftover) {
        meals.push({
          id: uid("meal"),
          day: day + 1,
          slot: "lunch",
          recipeId: best.id,
          servings: prefs.people,
          isLeftover: true,
          leftoverOf: { day, slot: "dinner" },
          reasons: [
            `Leftover from ${DAY_NAMES[day]} dinner — zero extra cooking`,
            "Saves money and cuts food waste",
          ],
        });
        leftoverLunchDays.add(day + 1);
        leftoversPlaced += 1;
      }
    }
  }

  meals.sort((a, b) => a.day - b.day || slotIndex(a.slot) - slotIndex(b.slot));

  return { id: uid("plan"), createdAt: new Date().toISOString(), seed, meals };
}

function slotIndex(slot: MealSlot): number {
  return ["breakfast", "lunch", "dinner", "snack"].indexOf(slot);
}

/** Per-person daily averages across the week. */
export function computeNutrition(plan: MealPlan, prefs: Preferences): NutritionSummary {
  const targets = resolveTargets(prefs);
  let cal = 0,
    prot = 0,
    carbs = 0,
    fat = 0,
    fibre = 0;
  for (const meal of plan.meals) {
    const recipe = getRecipe(meal.recipeId);
    cal += recipe.calories;
    prot += recipe.protein;
    carbs += recipe.carbs;
    fat += recipe.fat;
    fibre += recipe.fibre;
  }
  return {
    avgCalories: Math.round(cal / 7),
    avgProtein: Math.round(prot / 7),
    avgCarbs: Math.round(carbs / 7),
    avgFat: Math.round(fat / 7),
    avgFibre: Math.round(fibre / 7),
    calorieTarget: targets.calories,
    proteinTarget: targets.protein,
  };
}

/** Nutrition totals for a single day (per person). */
export function dayNutrition(plan: MealPlan, day: number) {
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fibre = 0,
    time = 0;
  for (const meal of plan.meals.filter((m) => m.day === day)) {
    const recipe = getRecipe(meal.recipeId);
    calories += recipe.calories;
    protein += recipe.protein;
    carbs += recipe.carbs;
    fat += recipe.fat;
    fibre += recipe.fibre;
    if (!meal.isLeftover) time += recipe.totalTime;
  }
  return { calories, protein, carbs, fat, fibre, time };
}
