export type Unit = "g" | "ml" | "unit";

export type StorageLocation = "pantry" | "fridge" | "freezer";

export type GroceryCategory =
  | "Fruit & Vegetables"
  | "Protein"
  | "Dairy & Eggs"
  | "Grains"
  | "Tinned & Jarred"
  | "Frozen"
  | "Pantry"
  | "Spices & Sauces";

export type Diet = "vegetarian" | "vegan" | "pescatarian" | "omnivore";

export type Cuisine =
  | "Indian"
  | "British"
  | "Italian"
  | "Mediterranean"
  | "Mexican"
  | "Asian"
  | "Middle Eastern"
  | "Mixed";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type Goal =
  | "high-protein"
  | "lower-calorie"
  | "balanced"
  | "muscle"
  | "weight"
  | "save-money"
  | "save-time"
  | "less-waste";

export type Equipment =
  | "hob"
  | "oven"
  | "microwave"
  | "air-fryer"
  | "rice-cooker"
  | "pressure-cooker"
  | "slow-cooker"
  | "blender";

export type Supermarket =
  | "aldi"
  | "lidl"
  | "asda"
  | "tesco"
  | "morrisons"
  | "sainsburys";

export interface CatalogIngredient {
  id: string;
  name: string;
  category: GroceryCategory;
  unit: Unit;
  /** Typical UK pack size in the canonical unit. */
  packSize: number;
  packLabel: string;
  /** Estimated baseline price (budget supermarket), in GBP. */
  packPrice: number;
  defaultLocation: StorageLocation;
  shelfLifeDays: number;
  /** Cheaper substitute (ingredient id), used by budget optimisation hints. */
  swapsTo?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  /** Quantity in the ingredient's canonical unit, for `recipe.servings` servings. */
  qty: number;
  note?: string;
}

export interface PrepComponent {
  name: string;
  activeMins: number;
  passiveMins: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: Cuisine;
  diet: Diet[];
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  /** Per serving. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  mealType: MealSlot[];
  tags: string[];
  storageInstructions: string;
  reheatInstructions: string;
  emoji: string;
  hue: number;
  /** Every listed item is required. */
  equipment?: Equipment[];
  /** At least one listed item is required (e.g. air fryer OR oven). */
  equipmentAnyOf?: Equipment[];
  components?: PrepComponent[];
  makesLeftovers?: boolean;
}

export interface Preferences {
  people: number;
  budget: number;
  diet: Diet;
  goals: Goal[];
  proteinTarget: number | "auto";
  calorieTarget: number | "auto";
  cuisines: Cuisine[];
  maxCookTime: 15 | 30 | 45 | 60;
  meals: MealSlot[];
  equipment: Equipment[];
  supermarket: Supermarket;
  /** Ingredient ids the user won't eat; recipes containing them are never planned. */
  avoidIngredients: string[];
}

export interface PantryItem {
  id: string;
  ingredientId?: string;
  name: string;
  category: GroceryCategory;
  qty: number;
  unit: Unit;
  location: StorageLocation;
  expiryDate?: string; // ISO date
}

export interface PlannedMeal {
  id: string;
  day: number; // 0 = Monday … 6 = Sunday
  slot: MealSlot;
  recipeId: string;
  servings: number;
  isLeftover?: boolean;
  leftoverOf?: { day: number; slot: MealSlot };
  reasons: string[];
}

export interface NutritionSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFibre: number;
  calorieTarget: number;
  proteinTarget: number;
}

export interface GroceryItem {
  id: string;
  ingredientId?: string;
  name: string;
  category: GroceryCategory;
  /** Amount the plan needs beyond what's in the kitchen (canonical unit). */
  needQty: number;
  unit: Unit;
  packs: number;
  buyQty: number;
  packLabel: string;
  estCost: number;
  purchased: boolean;
  custom?: boolean;
  /** Amount covered by pantry stock, for the "already have" hint. */
  haveQty: number;
}

export interface PrepBatchTask {
  id: string;
  component: string;
  activeMins: number;
  passiveMins: number;
  /** Meal descriptions this component feeds, e.g. "Mon lunch — Dal + rice". */
  feeds: string[];
}

export interface PrepTimelineEntry {
  startMin: number;
  endMin: number;
  label: string;
  kind: "active" | "passive";
}

export interface MealPrepPlan {
  totalMins: number;
  activeMins: number;
  passiveMins: number;
  tasks: PrepBatchTask[];
  timeline: PrepTimelineEntry[];
}

export interface MealPlan {
  id: string;
  createdAt: string;
  seed: number;
  meals: PlannedMeal[];
}

export interface BudgetChange {
  from: string;
  to: string;
  day: number;
  slot: MealSlot;
  saving: number;
}

export interface BudgetOptimisation {
  before: number;
  after: number;
  changes: BudgetChange[];
}

export interface SwapAlternative {
  recipeId: string;
  costDelta: number;
  calorieDelta: number;
  proteinDelta: number;
}

export interface UseItUpSuggestion {
  pantryItemId: string;
  ingredientName: string;
  daysLeft: number;
  recipeIds: string[];
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const SUPERMARKETS: Record<Supermarket, { name: string; multiplier: number }> = {
  aldi: { name: "Aldi", multiplier: 1.0 },
  lidl: { name: "Lidl", multiplier: 1.01 },
  asda: { name: "Asda", multiplier: 1.08 },
  tesco: { name: "Tesco", multiplier: 1.12 },
  morrisons: { name: "Morrisons", multiplier: 1.14 },
  sainsburys: { name: "Sainsbury's", multiplier: 1.22 },
};
