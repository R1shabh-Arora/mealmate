import { getRecipe } from "@/data/recipes";
import type {
  BudgetChange,
  BudgetOptimisation,
  MealPlan,
  PantryItem,
  PlannedMeal,
  Preferences,
} from "@/lib/types";
import { estimatePlanCost } from "./grocery";
import { candidatesFor } from "./planner";

const MAX_CHANGES = 6;
const MAX_PROTEIN_DROP = 8; // per serving
const MAX_CALORIE_SHIFT = 160;

/**
 * Swap a meal's recipe, keeping leftover links coherent.
 * - Source keeps cooking double only if the new recipe also makes leftovers.
 * - A linked leftover lunch follows the new recipe; if the new recipe can't
 *   produce leftovers, that lunch becomes a freshly-cooked meal instead.
 */
export function applySwap(
  plan: MealPlan,
  target: PlannedMeal,
  newRecipeId: string,
  people: number
): MealPlan {
  const recipe = getRecipe(newRecipeId);
  const linkedLeftover = plan.meals.find(
    (m) => m.isLeftover && m.leftoverOf?.day === target.day && m.leftoverOf?.slot === target.slot
  );
  const keepsLeftover = Boolean(recipe.makesLeftovers) && Boolean(linkedLeftover);

  const meals = plan.meals.map((m) => {
    if (m.id === target.id) {
      return {
        ...m,
        recipeId: newRecipeId,
        servings: keepsLeftover ? people * 2 : people,
        isLeftover: false,
        leftoverOf: undefined,
        reasons: ["Swapped in by you", `${recipe.protein}g protein per serving`],
      };
    }
    if (linkedLeftover && m.id === linkedLeftover.id) {
      return keepsLeftover
        ? { ...m, recipeId: newRecipeId }
        : {
            ...m,
            recipeId: newRecipeId,
            servings: people,
            isLeftover: false,
            leftoverOf: undefined,
            reasons: ["Cooked fresh — your swapped dinner doesn't make leftovers"],
          };
    }
    return m;
  });

  return { ...plan, meals };
}

/**
 * Brings a plan under budget by swapping the meals that move the basket most,
 * while keeping calories and protein close to the originals.
 * Classic swaps fall out naturally: paneer → tofu, quinoa → rice, fresh → frozen.
 */
export function optimiseBudget(
  plan: MealPlan,
  pantryItems: PantryItem[],
  prefs: Preferences
): { plan: MealPlan; result: BudgetOptimisation } {
  const before = estimatePlanCost(plan, pantryItems, prefs);
  let working: MealPlan = { ...plan, meals: plan.meals.map((m) => ({ ...m })) };
  let currentCost = before;
  const changes: BudgetChange[] = [];

  for (let i = 0; i < MAX_CHANGES && currentCost > prefs.budget; i++) {
    let bestPlan: MealPlan | null = null;
    let bestCost = currentCost;
    let bestChange: BudgetChange | null = null;

    for (const meal of working.meals) {
      if (meal.isLeftover) continue;
      const current = getRecipe(meal.recipeId);

      for (const candidate of candidatesFor(meal.slot, prefs)) {
        if (candidate.id === meal.recipeId) continue;
        if (current.protein - candidate.protein > MAX_PROTEIN_DROP) continue;
        if (Math.abs(candidate.calories - current.calories) > MAX_CALORIE_SHIFT) continue;

        const trial = applySwap(working, meal, candidate.id, prefs.people);
        const cost = estimatePlanCost(trial, pantryItems, prefs);
        if (cost < bestCost - 0.05) {
          bestCost = cost;
          bestPlan = trial;
          bestChange = {
            from: current.name,
            to: candidate.name,
            day: meal.day,
            slot: meal.slot,
            saving: Math.round((currentCost - cost) * 100) / 100,
          };
        }
      }
    }

    if (!bestPlan || !bestChange) break;
    working = bestPlan;
    currentCost = bestCost;
    changes.push(bestChange);
  }

  return {
    plan: working,
    result: { before, after: currentCost, changes },
  };
}
