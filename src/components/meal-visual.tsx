"use client";

import React from "react";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Food visual used in place of photography: a warm food-toned gradient keyed
 * to each recipe with its signature emoji. Deterministic, fast, and offline.
 */
export function MealVisual({
  recipe,
  className,
  emojiClass = "text-4xl",
}: {
  recipe: Pick<Recipe, "hue" | "emoji" | "name">;
  className?: string;
  emojiClass?: string;
}) {
  // Deep, saturated food tones — light pastels would glare against the dark UI.
  const from = `hsl(${recipe.hue} 44% 24%)`;
  const to = `hsl(${(recipe.hue + 40) % 360} 34% 15%)`;
  return (
    <div
      role="img"
      aria-label={recipe.name}
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span
        aria-hidden="true"
        className="absolute -right-3 -top-4 select-none text-7xl opacity-25 rotate-12"
      >
        {recipe.emoji}
      </span>
      <span aria-hidden="true" className={cn("select-none drop-shadow-sm", emojiClass)}>
        {recipe.emoji}
      </span>
    </div>
  );
}

export function MacroPills({
  calories,
  protein,
  time,
  className,
}: {
  calories: number;
  protein: number;
  time?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-soft", className)}>
      <span>🔥 {calories} kcal</span>
      <span>💪 {protein}g protein</span>
      {time !== undefined && <span>⏱️ {time}m</span>}
    </div>
  );
}
