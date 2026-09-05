import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PREFERENCES } from "@/data/demo";
import { RECIPE_MAP } from "@/data/recipes";
import type { GroceryItem, MealPlan, PantryItem, Preferences } from "./types";

export interface AppState {
  onboarded: boolean;
  demo: boolean;
  preferences: Preferences;
  pantry: PantryItem[];
  plan: MealPlan | null;
  grocery: GroceryItem[];
  planSeed: number;
}

export const INITIAL_STATE: AppState = {
  onboarded: false,
  demo: false,
  preferences: DEFAULT_PREFERENCES,
  pantry: [],
  plan: null,
  grocery: [],
  planSeed: 1,
};

export const LOCAL_STORAGE_KEY = "mealmate-state-v1";

/**
 * Turns whatever was persisted — by an older version of the app, in the
 * browser or in the cloud — into a state the current app can run on.
 */
export function normalizeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<AppState>;
  if (!parsed.preferences || typeof parsed.preferences !== "object") return null;

  // Preference fields added after the user first saved fall back to defaults.
  const preferences: Preferences = { ...DEFAULT_PREFERENCES, ...parsed.preferences };

  // A plan that references a recipe we no longer ship is dropped rather than
  // crashing the app; the user regenerates.
  let plan = parsed.plan ?? null;
  let grocery = Array.isArray(parsed.grocery) ? parsed.grocery : [];
  if (plan && (!Array.isArray(plan.meals) || plan.meals.some((m) => !RECIPE_MAP.has(m.recipeId)))) {
    plan = null;
    grocery = grocery.filter((g) => g.custom);
  }

  return {
    ...INITIAL_STATE,
    ...parsed,
    preferences,
    plan,
    grocery,
    pantry: Array.isArray(parsed.pantry) ? parsed.pantry : [],
  };
}

/** Where a kitchen is kept: this browser, or a signed-in user's row in Supabase. */
export interface StateStore {
  /** "local", or the user id the cloud row belongs to. */
  readonly scope: string;
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}

export class LocalStateStore implements StateStore {
  readonly scope = "local";

  async load(): Promise<AppState | null> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked — the session still works in memory.
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export class SupabaseStateStore implements StateStore {
  constructor(
    private readonly client: SupabaseClient,
    readonly scope: string
  ) {}

  async load(): Promise<AppState | null> {
    const { data, error } = await this.client
      .from("user_state")
      .select("state")
      .eq("user_id", this.scope)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalizeState(data.state) : null;
  }

  async save(state: AppState): Promise<void> {
    const { error } = await this.client
      .from("user_state")
      .upsert(
        { user_id: this.scope, state, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(error.message);
  }
}

/**
 * What to show the moment someone signs in. Their cloud kitchen wins; failing
 * that, a kitchen they built as a guest on this device is adopted so nothing
 * they just did is lost.
 */
export function chooseStateOnSignIn(
  cloud: AppState | null,
  local: AppState | null
): { state: AppState; adoptLocal: boolean } {
  if (cloud) return { state: cloud, adoptLocal: false };
  if (local?.onboarded) return { state: local, adoptLocal: true };
  return { state: INITIAL_STATE, adoptLocal: false };
}
