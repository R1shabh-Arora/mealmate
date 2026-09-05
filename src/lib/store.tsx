"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getIngredient } from "@/data/ingredients";
import { buildDemoPantry, DEFAULT_PREFERENCES } from "@/data/demo";
import { buildGroceryList, planIngredientNeeds } from "@/lib/engine/grocery";
import { getMealPlannerService } from "@/lib/services/meal-planner-service";
import type { GroceryItem, MealPlan, PantryItem, PlannedMeal, Preferences } from "@/lib/types";
import { isoDateInDays, uid } from "@/lib/utils";
import { useAuth } from "./auth";
import {
  type AppState,
  INITIAL_STATE,
  LocalStateStore,
  type StateStore,
  SupabaseStateStore,
  chooseStateOnSignIn,
} from "./persistence";
import { getSupabaseBrowserClient } from "./supabase/client";

export type { AppState } from "./persistence";

/**
 * local   — guest mode, saved in this browser
 * loading — fetching the signed-in user's kitchen
 * saving  — a cloud write is pending or in flight
 * saved   — cloud is up to date
 * error   — cloud unreachable; see `syncError`
 */
export type SyncStatus = "local" | "loading" | "saving" | "saved" | "error";

const CLOUD_SAVE_DEBOUNCE_MS = 700;
const CLOUD_LOAD_TIMEOUT_MS = 10_000;
const CLOUD_SAVE_TIMEOUT_MS = 15_000;

/** A hung request must surface as an error (banner + retry), never as a frozen app. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out ${what}.`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

interface AppContextValue {
  state: AppState;
  hydrated: boolean;
  sync: SyncStatus;
  syncError: string | null;
  retrySync: () => void;
  completeOnboarding: (prefs: Preferences) => void;
  setPreferences: (prefs: Preferences) => void;
  startDemo: () => Promise<void>;
  generateWeek: () => Promise<void>;
  addPantryItem: (item: Omit<PantryItem, "id">) => void;
  quickAddPantry: (ingredientId: string) => void;
  updatePantryItem: (id: string, patch: Partial<PantryItem>) => void;
  removePantryItem: (id: string) => void;
  swapMeal: (meal: PlannedMeal, newRecipeId: string) => Promise<void>;
  removeMeal: (mealId: string) => void;
  moveMeal: (mealId: string, targetDay: number) => void;
  applyPlan: (plan: MealPlan) => void;
  toggleGroceryPurchased: (id: string) => void;
  removeGroceryItem: (id: string) => void;
  setGroceryPacks: (id: string, packs: number) => void;
  addCustomGroceryItem: (name: string, estCost: number) => void;
  startNextWeek: () => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Regenerate the grocery list for a plan, keeping purchase ticks and custom rows. */
function rebuildGrocery(plan: MealPlan | null, pantry: PantryItem[], prefs: Preferences, previous: GroceryItem[]): GroceryItem[] {
  if (!plan) return previous.filter((g) => g.custom);
  const fresh = buildGroceryList(plan, pantry, prefs);
  const prevByKey = new Map(previous.map((g) => [g.ingredientId ?? g.name, g]));
  const merged = fresh.map((item) => {
    const prev = prevByKey.get(item.ingredientId ?? item.name);
    return prev ? { ...item, purchased: prev.purchased } : item;
  });
  return [...merged, ...previous.filter((g) => g.custom)];
}

/**
 * Network failures get plain English; anything Supabase itself says (e.g. a
 * missing table or RLS policy) is passed through because it's the fastest
 * clue to a setup mistake.
 */
function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : "";
  if (!raw || /failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return "No connection to your cloud kitchen.";
  }
  return raw;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  /** The store the in-memory state belongs to; null while loading or after a failed cloud load. */
  const storeRef = useRef<StateStore | null>(null);
  const previousScopeRef = useRef<string | null>(null);
  /** JSON of the last state known to be persisted, so an unchanged state isn't re-saved. */
  const lastPersistedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whose kitchen we're looking at: a user's cloud row, this browser, or (while auth resolves) nobody's yet.
  const scope = authStatus === "signed-in" && user ? user.id : authStatus === "loading" ? null : "local";

  /* ---------- Load whenever the scope changes (sign-in, sign-out, first visit) ---------- */
  useEffect(() => {
    if (scope === null) {
      setHydrated(false);
      return;
    }
    let cancelled = false;
    const previous = previousScopeRef.current;
    previousScopeRef.current = scope;
    storeRef.current = null;
    setHydrated(false);

    const run = async () => {
      if (scope === "local") {
        const local = new LocalStateStore();
        // Leaving a signed-in session: this device keeps nothing of that kitchen.
        const leavingAccount = previous !== null && previous !== "local";
        if (leavingAccount) LocalStateStore.clear();
        const loaded = leavingAccount ? null : await local.load();
        if (cancelled) return;
        const next = loaded ?? INITIAL_STATE;
        storeRef.current = local;
        lastPersistedRef.current = JSON.stringify(next);
        setState(next);
        setSync("local");
        setSyncError(null);
        setHydrated(true);
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) return;
      const cloud = new SupabaseStateStore(client, scope);
      setSync("loading");
      try {
        const [cloudState, localState] = await Promise.all([
          withTimeout(cloud.load(), CLOUD_LOAD_TIMEOUT_MS, "loading your kitchen"),
          new LocalStateStore().load(),
        ]);
        if (cancelled) return;
        const { state: chosen, adoptLocal } = chooseStateOnSignIn(cloudState, localState);
        if (adoptLocal) {
          await withTimeout(cloud.save(chosen), CLOUD_SAVE_TIMEOUT_MS, "saving your kitchen");
          if (cancelled) return;
          LocalStateStore.clear();
        }
        storeRef.current = cloud;
        lastPersistedRef.current = JSON.stringify(chosen);
        setState(chosen);
        setSync("saved");
        setSyncError(null);
      } catch (e) {
        if (cancelled) return;
        // Don't let an empty in-memory state overwrite a kitchen we couldn't read:
        // leave storeRef null so nothing is saved until a reload succeeds.
        setState(INITIAL_STATE);
        setSync("error");
        setSyncError(describeError(e));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [scope, retryNonce]);

  /* ---------- Persist on change ---------- */
  const flushSave = useCallback(async () => {
    const store = storeRef.current;
    if (!store || store.scope === "local") return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const snapshot = stateRef.current;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastPersistedRef.current) {
      setSync((s) => (s === "saving" ? "saved" : s));
      return;
    }
    try {
      await withTimeout(store.save(snapshot), CLOUD_SAVE_TIMEOUT_MS, "saving your kitchen");
      lastPersistedRef.current = serialized;
      setSync("saved");
      setSyncError(null);
    } catch (e) {
      setSync("error");
      setSyncError(describeError(e));
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const store = storeRef.current;
    if (!store || store.scope !== scope) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastPersistedRef.current) return;

    if (store.scope === "local") {
      void store.save(state);
      lastPersistedRef.current = serialized;
      return;
    }
    setSync("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), CLOUD_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, hydrated, scope, flushSave]);

  // Don't lose the last edit when the tab is backgrounded or closed mid-debounce.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [flushSave]);

  const retrySync = useCallback(() => {
    if (storeRef.current) void flushSave();
    else setRetryNonce((n) => n + 1);
  }, [flushSave]);

  /* ---------- Actions ---------- */
  const completeOnboarding = useCallback((prefs: Preferences) => {
    setState((s) => ({ ...s, onboarded: true, preferences: prefs }));
  }, []);

  const setPreferences = useCallback((prefs: Preferences) => {
    setState((s) => ({
      ...s,
      preferences: prefs,
      grocery: rebuildGrocery(s.plan, s.pantry, prefs, s.grocery),
    }));
  }, []);

  const generateWeek = useCallback(async () => {
    const s = stateRef.current;
    const plan = await getMealPlannerService().generateMealPlan(s.preferences, s.pantry, s.planSeed);
    setState((cur) => ({
      ...cur,
      plan,
      planSeed: cur.planSeed + 1,
      grocery: rebuildGrocery(plan, cur.pantry, cur.preferences, []),
    }));
  }, []);

  const startDemo = useCallback(async () => {
    const pantry = buildDemoPantry();
    const prefs = DEFAULT_PREFERENCES;
    const plan = await getMealPlannerService().generateMealPlan(prefs, pantry, 7);
    setState({
      onboarded: true,
      demo: true,
      preferences: prefs,
      pantry,
      plan,
      planSeed: 8,
      grocery: rebuildGrocery(plan, pantry, prefs, []),
    });
  }, []);

  const addPantryItem = useCallback((item: Omit<PantryItem, "id">) => {
    setState((s) => {
      const pantry = [...s.pantry, { ...item, id: uid("pantry") }];
      return { ...s, pantry, grocery: rebuildGrocery(s.plan, pantry, s.preferences, s.grocery) };
    });
  }, []);

  const quickAddPantry = useCallback((ingredientId: string) => {
    const ing = getIngredient(ingredientId);
    setState((s) => {
      const existing = s.pantry.find((p) => p.ingredientId === ingredientId);
      const pantry = existing
        ? s.pantry.map((p) => (p.id === existing.id ? { ...p, qty: p.qty + ing.packSize } : p))
        : [
            ...s.pantry,
            {
              id: uid("pantry"),
              ingredientId,
              name: ing.name,
              category: ing.category,
              qty: ing.packSize,
              unit: ing.unit,
              location: ing.defaultLocation,
              expiryDate: isoDateInDays(ing.shelfLifeDays),
            },
          ];
      return { ...s, pantry, grocery: rebuildGrocery(s.plan, pantry, s.preferences, s.grocery) };
    });
  }, []);

  const updatePantryItem = useCallback((id: string, patch: Partial<PantryItem>) => {
    setState((s) => {
      const pantry = s.pantry.map((p) => (p.id === id ? { ...p, ...patch } : p));
      return { ...s, pantry, grocery: rebuildGrocery(s.plan, pantry, s.preferences, s.grocery) };
    });
  }, []);

  const removePantryItem = useCallback((id: string) => {
    setState((s) => {
      const pantry = s.pantry.filter((p) => p.id !== id);
      return { ...s, pantry, grocery: rebuildGrocery(s.plan, pantry, s.preferences, s.grocery) };
    });
  }, []);

  const swapMeal = useCallback(async (meal: PlannedMeal, newRecipeId: string) => {
    const s = stateRef.current;
    if (!s.plan) return;
    const plan = await getMealPlannerService().swapMeal(s.plan, meal, newRecipeId, s.preferences.people);
    setState((cur) => ({
      ...cur,
      plan,
      grocery: rebuildGrocery(plan, cur.pantry, cur.preferences, cur.grocery),
    }));
  }, []);

  const removeMeal = useCallback((mealId: string) => {
    setState((s) => {
      if (!s.plan) return s;
      const removed = s.plan.meals.find((m) => m.id === mealId);
      const plan = {
        ...s.plan,
        meals: s.plan.meals.filter((m) => {
          if (m.id === mealId) return false;
          // A leftover meal can't outlive the dinner that produces it.
          if (
            removed &&
            m.isLeftover &&
            m.leftoverOf?.day === removed.day &&
            m.leftoverOf?.slot === removed.slot
          ) {
            return false;
          }
          return true;
        }),
      };
      return { ...s, plan, grocery: rebuildGrocery(plan, s.pantry, s.preferences, s.grocery) };
    });
  }, []);

  const moveMeal = useCallback((mealId: string, targetDay: number) => {
    setState((s) => {
      if (!s.plan) return s;
      const moving = s.plan.meals.find((m) => m.id === mealId);
      if (!moving) return s;
      const other = s.plan.meals.find((m) => m.day === targetDay && m.slot === moving.slot && m.id !== mealId);
      const meals = s.plan.meals.map((m) => {
        if (m.id === mealId) return { ...m, day: targetDay, isLeftover: false, leftoverOf: undefined };
        if (other && m.id === other.id) return { ...m, day: moving.day, isLeftover: false, leftoverOf: undefined };
        return m;
      });
      return { ...s, plan: { ...s.plan, meals } };
    });
  }, []);

  const applyPlan = useCallback((plan: MealPlan) => {
    setState((s) => ({ ...s, plan, grocery: rebuildGrocery(plan, s.pantry, s.preferences, s.grocery) }));
  }, []);

  const toggleGroceryPurchased = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      grocery: s.grocery.map((g) => (g.id === id ? { ...g, purchased: !g.purchased } : g)),
    }));
  }, []);

  const removeGroceryItem = useCallback((id: string) => {
    setState((s) => ({ ...s, grocery: s.grocery.filter((g) => g.id !== id) }));
  }, []);

  const setGroceryPacks = useCallback((id: string, packs: number) => {
    setState((s) => ({
      ...s,
      grocery: s.grocery.map((g) => {
        if (g.id !== id) return g;
        const clamped = Math.max(1, Math.min(20, packs));
        const unitCost = g.packs > 0 ? g.estCost / g.packs : g.estCost;
        return {
          ...g,
          packs: clamped,
          buyQty: g.packs > 0 ? (g.buyQty / g.packs) * clamped : g.buyQty,
          estCost: Math.round(unitCost * clamped * 100) / 100,
        };
      }),
    }));
  }, []);

  const addCustomGroceryItem = useCallback((name: string, estCost: number) => {
    setState((s) => ({
      ...s,
      grocery: [
        ...s.grocery,
        {
          id: uid("grocery"),
          name,
          category: "Pantry",
          needQty: 1,
          unit: "unit" as const,
          packs: 1,
          buyQty: 1,
          packLabel: "1 item",
          estCost: Math.round(estCost * 100) / 100,
          purchased: false,
          custom: true,
          haveQty: 0,
        },
      ],
    }));
  }, []);

  /**
   * Week reset: purchased groceries land in the pantry, the week's cooking is
   * deducted, and what's left (plus anything frozen) carries into next week.
   */
  const startNextWeek = useCallback(() => {
    setState((s) => {
      if (!s.plan) return s;
      let pantry = [...s.pantry];

      for (const item of s.grocery) {
        if (!item.purchased || !item.ingredientId) continue;
        const ing = getIngredient(item.ingredientId);
        const existing = pantry.find((p) => p.ingredientId === item.ingredientId);
        if (existing) {
          pantry = pantry.map((p) => (p.id === existing.id ? { ...p, qty: p.qty + item.buyQty } : p));
        } else {
          pantry.push({
            id: uid("pantry"),
            ingredientId: item.ingredientId,
            name: ing.name,
            category: ing.category,
            qty: item.buyQty,
            unit: ing.unit,
            location: ing.defaultLocation,
            expiryDate: isoDateInDays(ing.shelfLifeDays),
          });
        }
      }

      const consumed = planIngredientNeeds(s.plan);
      pantry = pantry
        .map((p) => {
          if (!p.ingredientId) return p;
          const used = consumed.get(p.ingredientId) ?? 0;
          if (used <= 0) return p;
          const take = Math.min(p.qty, used);
          consumed.set(p.ingredientId, used - take);
          return { ...p, qty: Math.round((p.qty - take) * 10) / 10 };
        })
        .filter((p) => p.qty > 0.01);

      return { ...s, pantry, plan: null, grocery: [], planSeed: s.planSeed + 1 };
    });
  }, []);

  /** Wipes the kitchen — this browser's, or the signed-in account's. */
  const resetAll = useCallback(() => {
    LocalStateStore.clear();
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      hydrated,
      sync,
      syncError,
      retrySync,
      completeOnboarding,
      setPreferences,
      startDemo,
      generateWeek,
      addPantryItem,
      quickAddPantry,
      updatePantryItem,
      removePantryItem,
      swapMeal,
      removeMeal,
      moveMeal,
      applyPlan,
      toggleGroceryPurchased,
      removeGroceryItem,
      setGroceryPacks,
      addCustomGroceryItem,
      startNextWeek,
      resetAll,
    }),
    [
      state,
      hydrated,
      sync,
      syncError,
      retrySync,
      completeOnboarding,
      setPreferences,
      startDemo,
      generateWeek,
      addPantryItem,
      quickAddPantry,
      updatePantryItem,
      removePantryItem,
      swapMeal,
      removeMeal,
      moveMeal,
      applyPlan,
      toggleGroceryPurchased,
      removeGroceryItem,
      setGroceryPacks,
      addCustomGroceryItem,
      startNextWeek,
      resetAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
