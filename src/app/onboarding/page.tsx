"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { Button, Card, Chip, Input, Label, Progress } from "@/components/ui";
import { AVOIDABLE_IDS, getIngredient } from "@/data/ingredients";
import { useApp } from "@/lib/store";
import type { Cuisine, Diet, Equipment, Goal, MealSlot, Preferences } from "@/lib/types";
import { DEFAULT_PREFERENCES } from "@/data/demo";

const GOALS: Array<{ id: Goal; label: string }> = [
  { id: "high-protein", label: "💪 High protein" },
  { id: "lower-calorie", label: "🔥 Lower calorie" },
  { id: "balanced", label: "⚖️ Balanced nutrition" },
  { id: "muscle", label: "🏋️ Muscle building" },
  { id: "weight", label: "🎯 Weight management" },
  { id: "save-money", label: "💷 Save money" },
  { id: "save-time", label: "⏱️ Save cooking time" },
  { id: "less-waste", label: "♻️ Reduce food waste" },
];

const CUISINES: Cuisine[] = ["Indian", "British", "Italian", "Mediterranean", "Mexican", "Asian", "Middle Eastern", "Mixed"];

const DIETS: Array<{ id: Diet; label: string; hint: string }> = [
  { id: "vegetarian", label: "🥦 Vegetarian", hint: "No meat or fish" },
  { id: "vegan", label: "🌱 Vegan", hint: "Plants only" },
  { id: "pescatarian", label: "🐟 Pescatarian", hint: "Veggie + fish" },
  { id: "omnivore", label: "🍗 Omnivore", hint: "Everything" },
];

const EQUIPMENT: Array<{ id: Equipment; label: string }> = [
  { id: "hob", label: "🔥 Hob" },
  { id: "oven", label: "♨️ Oven" },
  { id: "microwave", label: "📻 Microwave" },
  { id: "air-fryer", label: "🌪️ Air fryer" },
  { id: "rice-cooker", label: "🍚 Rice cooker" },
  { id: "pressure-cooker", label: "⏲️ Pressure cooker" },
  { id: "slow-cooker", label: "🐌 Slow cooker" },
  { id: "blender", label: "🌀 Blender" },
];

const SLOTS: Array<{ id: MealSlot; label: string }> = [
  { id: "breakfast", label: "🌅 Breakfast" },
  { id: "lunch", label: "🥪 Lunch" },
  { id: "dinner", label: "🌙 Dinner" },
  { id: "snack", label: "🍎 Snacks" },
];

const STEP_TITLES = [
  "Who are we feeding?",
  "What's your weekly budget?",
  "How do you eat?",
  "What matters to you?",
  "Daily targets",
  "What do you love eating?",
  "Time & meals",
  "Your kitchen kit",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>({ ...DEFAULT_PREFERENCES, goals: ["high-protein", "balanced"] });
  const [customBudget, setCustomBudget] = useState("");
  const [customProtein, setCustomProtein] = useState("120");
  const [customCalories, setCustomCalories] = useState("2000");
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<Preferences>) => setPrefs((cur) => ({ ...cur, ...p }));
  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const validate = (): string | null => {
    if (step === 1 && (prefs.budget < 15 || prefs.budget > 500)) return "Pick a budget between £15 and £500.";
    if (step === 3 && prefs.goals.length === 0) return "Pick at least one goal.";
    if (step === 5 && prefs.cuisines.length === 0) return "Pick at least one cuisine.";
    if (step === 6 && prefs.meals.length === 0) return "Choose at least one meal to plan.";
    return null;
  };

  const next = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (step < STEP_TITLES.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding(prefs);
      router.push("/ingredients?welcome=1");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="text-xs font-semibold text-ink-soft">
          Step {step + 1} of {STEP_TITLES.length}
        </span>
      </div>
      <Progress value={step + 1} max={STEP_TITLES.length} label="Onboarding progress" className="mb-8" />

      <h1 className="font-display mb-6 text-2xl font-bold text-ink sm:text-3xl">{STEP_TITLES[step]}</h1>

      <div className="flex-1">
        {step === 0 && (
          <Card className="p-6">
            <Label htmlFor="people">How many people?</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Number of people">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Chip key={n} selected={prefs.people === n} onClick={() => patch({ people: n })} className="min-w-13 justify-center">
                  {n}
                </Chip>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-soft">Every recipe and shopping quantity scales to this.</p>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Weekly budget">
              {[40, 50, 60, 70].map((b) => (
                <Chip key={b} selected={prefs.budget === b && !customBudget} onClick={() => { patch({ budget: b }); setCustomBudget(""); }}>
                  £{b}
                </Chip>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="custom-budget">Or a custom amount (£/week)</Label>
              <Input
                id="custom-budget"
                type="number"
                inputMode="numeric"
                min={15}
                max={500}
                placeholder="e.g. 45"
                value={customBudget}
                onChange={(e) => {
                  setCustomBudget(e.target.value);
                  const v = Number(e.target.value);
                  if (v > 0) patch({ budget: v });
                }}
              />
            </div>
            <p className="mt-4 text-sm text-ink-soft">MealMate keeps your basket under this — and offers cheaper swaps when it can&apos;t.</p>
          </Card>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            {DIETS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={prefs.diet === d.id}
                onClick={() => patch({ diet: d.id })}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  prefs.diet === d.id ? "border-basil bg-basil-soft" : "border-sand bg-surface hover:border-basil/40"
                }`}
              >
                <div>
                  <p className="font-semibold text-ink">{d.label}</p>
                  <p className="text-sm text-ink-soft">{d.hint}</p>
                </div>
                {prefs.diet === d.id && <span className="text-basil-bright" aria-hidden="true">✓</span>}
              </button>
            ))}
            <Card className="mt-2 p-5">
              <Label>Anything you avoid? (optional)</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Ingredients to avoid">
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
              <p className="mt-3 text-sm text-ink-soft">Recipes with these never make it into your plan.</p>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Goals">
            {GOALS.map((g) => (
              <Chip key={g.id} selected={prefs.goals.includes(g.id)} onClick={() => patch({ goals: toggle(prefs.goals, g.id) })}>
                {g.label}
              </Chip>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <Card className="p-5">
              <Label>Protein target</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Chip selected={prefs.proteinTarget === "auto"} onClick={() => patch({ proteinTarget: "auto" })}>
                  ✨ Automatic
                </Chip>
                <Chip selected={prefs.proteinTarget !== "auto"} onClick={() => patch({ proteinTarget: Number(customProtein) || 120 })}>
                  Custom
                </Chip>
                {prefs.proteinTarget !== "auto" && (
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Protein target in grams per day"
                      type="number"
                      className="w-24"
                      min={30}
                      max={300}
                      value={customProtein}
                      onChange={(e) => {
                        setCustomProtein(e.target.value);
                        const v = Number(e.target.value);
                        if (v >= 30 && v <= 300) patch({ proteinTarget: v });
                      }}
                    />
                    <span className="text-sm text-ink-soft">g/day</span>
                  </div>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <Label>Calorie target</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Chip selected={prefs.calorieTarget === "auto"} onClick={() => patch({ calorieTarget: "auto" })}>
                  ✨ Automatic
                </Chip>
                <Chip selected={prefs.calorieTarget !== "auto"} onClick={() => patch({ calorieTarget: Number(customCalories) || 2000 })}>
                  Custom
                </Chip>
                {prefs.calorieTarget !== "auto" && (
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Calorie target per day"
                      type="number"
                      className="w-28"
                      min={1200}
                      max={4000}
                      value={customCalories}
                      onChange={(e) => {
                        setCustomCalories(e.target.value);
                        const v = Number(e.target.value);
                        if (v >= 1200 && v <= 4000) patch({ calorieTarget: v });
                      }}
                    />
                    <span className="text-sm text-ink-soft">kcal/day</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-ink-soft">Guideline targets for planning only — not medical advice.</p>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cuisines">
            {CUISINES.map((c) => (
              <Chip key={c} selected={prefs.cuisines.includes(c)} onClick={() => patch({ cuisines: toggle(prefs.cuisines, c) })}>
                {c}
              </Chip>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-4">
            <Card className="p-5">
              <Label>Maximum cooking time per meal</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Maximum cooking time">
                {([15, 30, 45, 60] as const).map((t) => (
                  <Chip key={t} selected={prefs.maxCookTime === t} onClick={() => patch({ maxCookTime: t })}>
                    {t === 15 ? "Under 15 min" : `${t - 15}–${t} min`}
                  </Chip>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <Label>Which meals should we plan?</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Meals to plan">
                {SLOTS.map((s) => (
                  <Chip key={s.id} selected={prefs.meals.includes(s.id)} onClick={() => patch({ meals: toggle(prefs.meals, s.id) })}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cooking equipment">
            {EQUIPMENT.map((e) => (
              <Chip key={e.id} selected={prefs.equipment.includes(e.id)} onClick={() => patch({ equipment: toggle(prefs.equipment, e.id) })}>
                {e.label}
              </Chip>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-terra-soft px-4 py-2.5 text-sm font-semibold text-terra">
            {error}
          </p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}>
          ← Back
        </Button>
        <Button size="lg" onClick={next}>
          {step === STEP_TITLES.length - 1 ? "Finish setup ✓" : "Continue →"}
        </Button>
      </div>
    </div>
  );
}
