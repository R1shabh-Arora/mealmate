"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountCard } from "@/components/account";
import { Button, Card, Chip, Input, Label, SectionTitle, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { AVOIDABLE_IDS, getIngredient } from "@/data/ingredients";
import { useApp } from "@/lib/store";
import type { Cuisine, Diet, Equipment, Goal, MealSlot, Preferences, Supermarket } from "@/lib/types";
import { SUPERMARKETS } from "@/lib/types";

const GOALS: Array<{ id: Goal; label: string }> = [
  { id: "high-protein", label: "💪 High protein" },
  { id: "lower-calorie", label: "🔥 Lower calorie" },
  { id: "balanced", label: "⚖️ Balanced" },
  { id: "muscle", label: "🏋️ Muscle building" },
  { id: "weight", label: "🎯 Weight management" },
  { id: "save-money", label: "💷 Save money" },
  { id: "save-time", label: "⏱️ Save time" },
  { id: "less-waste", label: "♻️ Less waste" },
];

const CUISINES: Cuisine[] = ["Indian", "British", "Italian", "Mediterranean", "Mexican", "Asian", "Middle Eastern", "Mixed"];
const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
const EQUIPMENT: Array<{ id: Equipment; label: string }> = [
  { id: "hob", label: "Hob" },
  { id: "oven", label: "Oven" },
  { id: "microwave", label: "Microwave" },
  { id: "air-fryer", label: "Air fryer" },
  { id: "rice-cooker", label: "Rice cooker" },
  { id: "pressure-cooker", label: "Pressure cooker" },
  { id: "slow-cooker", label: "Slow cooker" },
  { id: "blender", label: "Blender" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { state, hydrated, setPreferences, resetAll } = useApp();
  const { status: authStatus } = useAuth();
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!hydrated) return <Skeleton className="h-96" />;

  const prefs = draft ?? state.preferences;
  const patch = (p: Partial<Preferences>) => {
    setDraft({ ...prefs, ...p });
    setSaved(false);
  };
  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const save = () => {
    if (prefs.meals.length === 0 || prefs.cuisines.length === 0) return;
    setPreferences(prefs);
    setDraft(null);
    setSaved(true);
  };

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-2xl gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Changes apply to the next plan you generate.</p>
      </div>

      <AccountCard />

      <Card className="grid gap-5 p-5">
        <SectionTitle className="mb-0">Household & budget</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="s-people">People</Label>
            <Select id="s-people" value={prefs.people} onChange={(e) => patch({ people: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="s-budget">Weekly budget (£)</Label>
            <Input
              id="s-budget"
              type="number"
              min={15}
              max={500}
              value={prefs.budget}
              onChange={(e) => patch({ budget: Number(e.target.value) || prefs.budget })}
            />
          </div>
          <div>
            <Label htmlFor="s-diet">Diet</Label>
            <Select id="s-diet" value={prefs.diet} onChange={(e) => patch({ diet: e.target.value as Diet })}>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="omnivore">Omnivore</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Ingredients I avoid</Label>
            <div className="flex flex-wrap gap-2">
              {AVOIDABLE_IDS.map((id) => (
                <Chip
                  key={id}
                  selected={prefs.avoidIngredients.includes(id)}
                  onClick={() => patch({ avoidIngredients: toggle(prefs.avoidIngredients, id) })}
                  className="px-3 py-1.5 text-xs"
                >
                  {prefs.avoidIngredients.includes(id) ? "🚫 " : ""}
                  {getIngredient(id).name}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">Recipes containing these are never planned or suggested.</p>
          </div>
          <div>
            <Label htmlFor="s-market">Supermarket</Label>
            <Select id="s-market" value={prefs.supermarket} onChange={(e) => patch({ supermarket: e.target.value as Supermarket })}>
              {Object.entries(SUPERMARKETS).map(([id, s]) => (
                <option key={id} value={id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="grid gap-5 p-5">
        <SectionTitle className="mb-0">Nutrition targets</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="s-protein">Protein (g/day)</Label>
            <Input
              id="s-protein"
              type="number"
              min={30}
              max={300}
              placeholder="auto"
              value={prefs.proteinTarget === "auto" ? "" : prefs.proteinTarget}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ proteinTarget: e.target.value === "" ? "auto" : v >= 30 && v <= 300 ? v : prefs.proteinTarget });
              }}
            />
            <p className="mt-1 text-xs text-ink-soft">Leave blank for automatic.</p>
          </div>
          <div>
            <Label htmlFor="s-cal">Calories (kcal/day)</Label>
            <Input
              id="s-cal"
              type="number"
              min={1200}
              max={4000}
              placeholder="auto"
              value={prefs.calorieTarget === "auto" ? "" : prefs.calorieTarget}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ calorieTarget: e.target.value === "" ? "auto" : v >= 1200 && v <= 4000 ? v : prefs.calorieTarget });
              }}
            />
            <p className="mt-1 text-xs text-ink-soft">Guidelines only — not medical advice.</p>
          </div>
        </div>
        <div>
          <Label>Goals</Label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g.id} selected={prefs.goals.includes(g.id)} onClick={() => patch({ goals: toggle(prefs.goals, g.id) })} className="px-3 py-1.5 text-xs">
                {g.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card className="grid gap-5 p-5">
        <SectionTitle className="mb-0">Cooking</SectionTitle>
        <div>
          <Label>Cuisines</Label>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => (
              <Chip key={c} selected={prefs.cuisines.includes(c)} onClick={() => patch({ cuisines: toggle(prefs.cuisines, c) })} className="px-3 py-1.5 text-xs">
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>Max cooking time</Label>
          <div className="flex flex-wrap gap-2">
            {([15, 30, 45, 60] as const).map((t) => (
              <Chip key={t} selected={prefs.maxCookTime === t} onClick={() => patch({ maxCookTime: t })} className="px-3 py-1.5 text-xs">
                ≤ {t} min
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>Meals per day</Label>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <Chip key={s} selected={prefs.meals.includes(s)} onClick={() => patch({ meals: toggle(prefs.meals, s) })} className="px-3 py-1.5 text-xs capitalize">
                {s}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>Equipment</Label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <Chip key={e.id} selected={prefs.equipment.includes(e.id)} onClick={() => patch({ equipment: toggle(prefs.equipment, e.id) })} className="px-3 py-1.5 text-xs">
                {e.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={save} disabled={!draft || prefs.meals.length === 0 || prefs.cuisines.length === 0}>
          Save changes
        </Button>
        {saved && <p className="text-sm font-semibold text-basil-bright" role="status">✓ Saved — regenerate your week to apply</p>}
        {draft && prefs.meals.length === 0 && <p className="text-sm text-terra">Pick at least one meal.</p>}
        {draft && prefs.cuisines.length === 0 && <p className="text-sm text-terra">Pick at least one cuisine.</p>}
      </div>

      <Card className="p-5">
        <p className="font-semibold text-ink">Danger zone</p>
        <p className="mt-1 text-sm text-ink-soft">
          Wipes your pantry, plan, groceries and preferences
          {authStatus === "signed-in" ? " from your account" : " from this browser"}.
        </p>
        {confirmReset ? (
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                router.push("/");
              }}
            >
              Yes, erase everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" className="mt-3" onClick={() => setConfirmReset(true)}>
            Reset MealMate
          </Button>
        )}
      </Card>
    </div>
  );
}
