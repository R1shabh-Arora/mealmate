import { optimiseBudget, applySwap } from "@/lib/engine/budget";
import { generateMealPlan } from "@/lib/engine/planner";
import { generateMealPrepSchedule } from "@/lib/engine/prep";
import { findSwapAlternatives } from "@/lib/engine/swap";
import { quickMealsFromPantry, suggestUseItUpMeals } from "@/lib/engine/useitup";
import { MealPlanSchema, PreferencesSchema } from "@/lib/schemas";
import type {
  BudgetOptimisation,
  MealPlan,
  MealPrepPlan,
  PantryItem,
  PlannedMeal,
  Preferences,
  Recipe,
  SwapAlternative,
  UseItUpSuggestion,
} from "@/lib/types";

/**
 * Planner backend contract. The UI only ever talks to this interface, and
 * every method returns structured, schema-validated data — never free text.
 *
 * Today one implementation exists: the deterministic local engine (demo mode,
 * no API key needed). To connect a real AI provider, implement this interface
 * (e.g. `AnthropicMealPlannerService` calling a model with structured output),
 * validate the response against the zod schemas in `lib/schemas.ts`, and
 * return it from `getMealPlannerService()`.
 */
export interface MealPlannerService {
  generateMealPlan(prefs: Preferences, pantry: PantryItem[], seed: number): Promise<MealPlan>;
  swapMeal(plan: MealPlan, meal: PlannedMeal, newRecipeId: string, people: number): Promise<MealPlan>;
  suggestSwaps(plan: MealPlan, meal: PlannedMeal, prefs: Preferences): Promise<SwapAlternative[]>;
  optimiseBudget(
    plan: MealPlan,
    pantry: PantryItem[],
    prefs: Preferences
  ): Promise<{ plan: MealPlan; result: BudgetOptimisation }>;
  suggestUseItUpMeals(pantry: PantryItem[], prefs: Preferences): Promise<UseItUpSuggestion[]>;
  quickMeals(pantry: PantryItem[], prefs: Preferences): Promise<Array<{ recipe: Recipe; coverage: number }>>;
  generateMealPrepSchedule(plan: MealPlan): Promise<MealPrepPlan>;
}

class LocalMealPlannerService implements MealPlannerService {
  async generateMealPlan(prefs: Preferences, pantry: PantryItem[], seed: number): Promise<MealPlan> {
    const validPrefs = PreferencesSchema.parse(prefs);
    const plan = generateMealPlan(validPrefs as Preferences, pantry, seed);
    return MealPlanSchema.parse(plan) as MealPlan;
  }

  async swapMeal(plan: MealPlan, meal: PlannedMeal, newRecipeId: string, people: number): Promise<MealPlan> {
    return applySwap(plan, meal, newRecipeId, people);
  }

  async suggestSwaps(plan: MealPlan, meal: PlannedMeal, prefs: Preferences): Promise<SwapAlternative[]> {
    return findSwapAlternatives(plan, meal, prefs);
  }

  async optimiseBudget(plan: MealPlan, pantry: PantryItem[], prefs: Preferences) {
    return optimiseBudget(plan, pantry, prefs);
  }

  async suggestUseItUpMeals(pantry: PantryItem[], prefs: Preferences): Promise<UseItUpSuggestion[]> {
    return suggestUseItUpMeals(pantry, prefs);
  }

  async quickMeals(pantry: PantryItem[], prefs: Preferences) {
    return quickMealsFromPantry(pantry, prefs);
  }

  async generateMealPrepSchedule(plan: MealPlan): Promise<MealPrepPlan> {
    return generateMealPrepSchedule(plan);
  }
}

let instance: MealPlannerService | null = null;

/**
 * Returns the active planner backend. When an AI provider key is configured
 * (e.g. NEXT_PUBLIC_AI_PROVIDER + server-side key), swap in that
 * implementation here — the rest of the app doesn't change.
 */
export function getMealPlannerService(): MealPlannerService {
  if (!instance) instance = new LocalMealPlannerService();
  return instance;
}
