import { z } from "zod";

/**
 * Structured-output contracts. Every planner backend — the local engine today,
 * an AI provider tomorrow — must return data that validates against these
 * schemas. The UI never consumes free-form text.
 */

export const MealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const PlannedMealSchema = z.object({
  id: z.string(),
  day: z.number().int().min(0).max(6),
  slot: MealSlotSchema,
  recipeId: z.string(),
  servings: z.number().positive(),
  isLeftover: z.boolean().optional(),
  leftoverOf: z.object({ day: z.number().int(), slot: MealSlotSchema }).optional(),
  reasons: z.array(z.string()),
});

export const MealPlanSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  seed: z.number(),
  meals: z.array(PlannedMealSchema).min(1),
});

export const GroceryItemSchema = z.object({
  id: z.string(),
  ingredientId: z.string().optional(),
  name: z.string().min(1),
  category: z.string(),
  needQty: z.number().min(0),
  unit: z.enum(["g", "ml", "unit"]),
  packs: z.number().int().min(0),
  buyQty: z.number().min(0),
  packLabel: z.string(),
  estCost: z.number().min(0),
  purchased: z.boolean(),
  custom: z.boolean().optional(),
  haveQty: z.number().min(0),
});

export const GroceryListSchema = z.array(GroceryItemSchema);

export const PreferencesSchema = z.object({
  people: z.number().int().min(1).max(6),
  budget: z.number().min(10).max(500),
  diet: z.enum(["vegetarian", "vegan", "pescatarian", "omnivore"]),
  goals: z.array(z.string()),
  proteinTarget: z.union([z.literal("auto"), z.number().min(30).max(300)]),
  calorieTarget: z.union([z.literal("auto"), z.number().min(1200).max(4000)]),
  cuisines: z.array(z.string()).min(1),
  maxCookTime: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  meals: z.array(MealSlotSchema).min(1),
  equipment: z.array(z.string()),
  supermarket: z.enum(["aldi", "lidl", "asda", "tesco", "morrisons", "sainsburys"]),
  avoidIngredients: z.array(z.string()).default([]),
});

export type ValidatedPreferences = z.infer<typeof PreferencesSchema>;
