import { z } from "zod";

/**
 * The contract between the browser and the AI Kitchen Edge Function.
 *
 * One response shape serves every task. A model answering a question, proposing
 * a recipe for a custom pantry item, or suggesting a substitution all fill in
 * the same fields and leave the rest empty — so adding a task later needs a new
 * `task` value and a prompt, not a new endpoint or a new client parser.
 *
 * Everything here is validated on both sides. A model that returns something
 * unexpected produces a clean error, never a half-rendered screen.
 */

/** What the model may be asked to do. Extend here first when adding a task. */
export const AiTaskSchema = z.enum([
  /** "What can I make right now?" — recipes from what's actually in the kitchen. */
  "suggest",
  /** Free-text question about the kitchen. */
  "ask",
  /** Work around missing ingredients for a specific dish. */
  "substitute",
  /** Prioritise what's about to go off. */
  "rescue",
]);
export type AiTask = z.infer<typeof AiTaskSchema>;

export const AiIngredientSchema = z.object({
  name: z.string(),
  qty: z.string(),
});

export const AiSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  /** Why this dish, for this kitchen, right now. */
  why: z.string(),
  timeMins: z.number(),
  servings: z.number(),
  /** Pantry item names this uses up — drives the "uses what you have" chips. */
  usesFromPantry: z.array(z.string()),
  needToBuy: z.array(z.string()),
  approxCalories: z.number(),
  approxProtein: z.number(),
  approxCostGbp: z.number(),
  equipment: z.array(z.string()),
  ingredients: z.array(AiIngredientSchema),
  steps: z.array(z.string()),
});
export type AiSuggestion = z.infer<typeof AiSuggestionSchema>;

export const AiSubstitutionSchema = z.object({
  missing: z.string(),
  useInstead: z.string(),
  note: z.string(),
});
export type AiSubstitution = z.infer<typeof AiSubstitutionSchema>;

export const AiKitchenResponseSchema = z.object({
  /** Prose reply. Always present — it's the whole answer for `ask`. */
  answer: z.string(),
  suggestions: z.array(AiSuggestionSchema),
  substitutions: z.array(AiSubstitutionSchema),
  /** Anything the cook should know: allergens, an assumption made, a caveat. */
  warnings: z.array(z.string()),
});
export type AiKitchenResponse = z.infer<typeof AiKitchenResponseSchema>;

/** Pantry as the model sees it — names and dates, no internal ids. */
export const AiPantryItemSchema = z.object({
  name: z.string(),
  qty: z.string(),
  location: z.string(),
  daysLeft: z.number().nullable(),
});

export const AiKitchenRequestSchema = z.object({
  task: AiTaskSchema,
  pantry: z.array(AiPantryItemSchema),
  preferences: z.object({
    people: z.number(),
    weeklyBudgetGbp: z.number(),
    diet: z.string(),
    avoid: z.array(z.string()),
    equipment: z.array(z.string()),
    maxCookTimeMins: z.number(),
    proteinTargetG: z.number().nullable(),
    calorieTarget: z.number().nullable(),
  }),
  /** Free text for `ask`; the dish name for `substitute`. */
  question: z.string().optional(),
});
export type AiKitchenRequest = z.infer<typeof AiKitchenRequestSchema>;
