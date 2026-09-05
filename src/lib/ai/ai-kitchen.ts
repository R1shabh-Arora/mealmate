import { INGREDIENTS } from "@/data/ingredients";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PantryItem, Preferences } from "@/lib/types";
import { daysUntil, formatQty } from "@/lib/utils";
import { AiKitchenResponseSchema, type AiKitchenResponse, type AiTask } from "./schemas";

/**
 * Client half of AI Kitchen.
 *
 * Nothing here knows an API key exists. It calls the Edge Function with the
 * signed-in user's access token; the key lives server-side and never reaches
 * the browser. The rest of the app doesn't depend on any of this — if the
 * function isn't deployed, `isAiAvailable()` is false and the UI stays hidden.
 */

const FUNCTION_NAME = "ai-kitchen";

export class AiKitchenError extends Error {}

/**
 * Whether to offer AI at all. This only says Supabase is wired up — the
 * function may still not be deployed, which surfaces as a normal error on the
 * first call rather than a broken-looking button.
 */
export function isAiAvailable(): boolean {
  return isSupabaseConfigured();
}

/** Pantry in the shape the model sees: names and dates, no internal ids. */
function toAiPantry(pantry: PantryItem[]) {
  return pantry.map((item) => ({
    name: item.name,
    qty: formatQty(item.qty, item.unit),
    location: item.location,
    daysLeft: item.expiryDate ? daysUntil(item.expiryDate) : null,
  }));
}

/** "auto" means the app derives it; the model should just not be told a number. */
function numericTarget(target: number | "auto"): number | null {
  return typeof target === "number" ? target : null;
}

function toAiPreferences(prefs: Preferences) {
  return {
    people: prefs.people,
    weeklyBudgetGbp: prefs.budget,
    diet: prefs.diet,
    // Stored as catalogue ids ("frozen-peas"); the model needs the words a cook
    // would use, or it can't reliably avoid them.
    avoid: prefs.avoidIngredients.map(
      (id) => INGREDIENTS.find((i) => i.id === id)?.name ?? id
    ),
    equipment: prefs.equipment,
    maxCookTimeMins: prefs.maxCookTime,
    proteinTargetG: numericTarget(prefs.proteinTarget),
    calorieTarget: numericTarget(prefs.calorieTarget),
  };
}

/**
 * Ask the kitchen assistant something.
 *
 * Throws AiKitchenError with a message fit to show the user — the Edge Function
 * is careful never to pass a provider error through, so these are all safe.
 */
export async function askAiKitchen(args: {
  task: AiTask;
  pantry: PantryItem[];
  preferences: Preferences;
  question?: string;
}): Promise<AiKitchenResponse> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AiKitchenError("Cloud sync isn't set up on this deployment.");

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new AiKitchenError("Sign in to use AI Kitchen.");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      task: args.task,
      pantry: toAiPantry(args.pantry),
      preferences: toAiPreferences(args.preferences),
      ...(args.question ? { question: args.question } : {}),
    },
  });

  if (error) {
    // functions.invoke reports a non-2xx as an error with the JSON body on
    // `context`. The function's own message ("Sign in…", "daily cap…") is
    // written for the user; supabase-js's own strings are not.
    const detail = await readErrorMessage(error);
    throw new AiKitchenError(
      detail ?? "Couldn't reach AI Kitchen — it may not be set up on this deployment yet."
    );
  }

  const parsed = AiKitchenResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new AiKitchenError("AI Kitchen sent something unreadable. Try again.");
  }
  return parsed.data;
}

/**
 * Dig the function's own error message out of a FunctionsHttpError.
 *
 * Only the JSON body is trusted. supabase-js's own messages ("Failed to send a
 * request to the Edge Function", "Edge Function returned a non-2xx status code")
 * describe its internals, not anything the cook can act on, so an unreadable
 * failure falls back to our own wording instead.
 */
async function readErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // Not JSON — a gateway or CORS failure, nothing useful to show.
    }
  }
  return null;
}
