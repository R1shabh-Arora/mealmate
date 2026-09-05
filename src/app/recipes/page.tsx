"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MacroPills, MealVisual } from "@/components/meal-visual";
import { Badge, Card, Chip, EmptyState, Input } from "@/components/ui";
import { RECIPES } from "@/data/recipes";
import { recipeCostPerServing } from "@/lib/engine/cost";
import { useApp } from "@/lib/store";
import type { Cuisine, MealSlot } from "@/lib/types";
import { SLOT_LABELS } from "@/lib/types";
import { gbp } from "@/lib/utils";

const CUISINE_FILTERS: Array<Cuisine | "All"> = ["All", "Indian", "British", "Italian", "Mediterranean", "Mexican", "Asian", "Middle Eastern"];
const SLOT_FILTERS: Array<MealSlot | "All"> = ["All", "breakfast", "lunch", "dinner", "snack"];

export default function RecipesPage() {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<Cuisine | "All">("All");
  const [slot, setSlot] = useState<MealSlot | "All">("All");
  const [quickOnly, setQuickOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECIPES.filter((r) => {
      if (cuisine !== "All" && r.cuisine !== cuisine) return false;
      if (slot !== "All" && !r.mealType.includes(slot)) return false;
      if (quickOnly && r.totalTime > 15) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, cuisine, slot, quickOnly]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Recipes</h1>
        <p className="mt-1 text-sm text-ink-soft">{RECIPES.length} vegetarian-friendly recipes with UK cost estimates.</p>
      </div>

      <div className="grid gap-3">
        <Input
          type="search"
          aria-label="Search recipes"
          placeholder="🔍 Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cuisine filter">
          {CUISINE_FILTERS.map((c) => (
            <Chip key={c} selected={cuisine === c} onClick={() => setCuisine(c)} className="px-3 py-1.5 text-xs">
              {c}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Meal type filter">
          {SLOT_FILTERS.map((s) => (
            <Chip key={s} selected={slot === s} onClick={() => setSlot(s)} className="px-3 py-1.5 text-xs">
              {s === "All" ? "All meals" : SLOT_LABELS[s]}
            </Chip>
          ))}
          <Chip selected={quickOnly} onClick={() => setQuickOnly(!quickOnly)} className="px-3 py-1.5 text-xs">
            ⚡ 15 min or less
          </Chip>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="No recipes match those filters"
          body="Try clearing the search or widening the cuisine and time filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
                <MealVisual recipe={recipe} className="h-32 w-full" emojiClass="text-5xl" />
                <div className="p-4">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="neutral">{recipe.cuisine}</Badge>
                    {recipe.totalTime <= 15 && <Badge variant="amber">⚡ Quick</Badge>}
                    {recipe.tags.includes("batch") && <Badge>🍳 Batch</Badge>}
                  </div>
                  <p className="font-semibold text-ink group-hover:text-basil-bright">{recipe.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{recipe.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <MacroPills calories={recipe.calories} protein={recipe.protein} time={recipe.totalTime} />
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-basil-bright">
                    ~{gbp(recipeCostPerServing(recipe, state.preferences.supermarket))}/serving est.
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
