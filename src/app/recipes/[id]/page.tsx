import { RECIPES } from "@/data/recipes";
import RecipeDetailClient from "./recipe-client";

/**
 * A static export has no server, so every recipe URL is prerendered at build
 * time. The interactive page itself stays a client component.
 */
export function generateStaticParams() {
  return RECIPES.map((recipe) => ({ id: recipe.id }));
}

export default function RecipeDetailPage() {
  return <RecipeDetailClient />;
}
