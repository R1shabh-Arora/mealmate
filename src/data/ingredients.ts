import type { CatalogIngredient, GroceryCategory, StorageLocation, Unit } from "@/lib/types";

function ing(
  id: string,
  name: string,
  category: GroceryCategory,
  unit: Unit,
  packSize: number,
  packLabel: string,
  packPrice: number,
  defaultLocation: StorageLocation,
  shelfLifeDays: number,
  swapsTo?: string
): CatalogIngredient {
  return { id, name, category, unit, packSize, packLabel, packPrice, defaultLocation, shelfLifeDays, swapsTo };
}

/**
 * Demo UK grocery pricing dataset. Prices are ESTIMATES based on typical
 * budget-supermarket prices — clearly labelled as estimates in the UI.
 * A live grocery/product API can replace this via the pricing functions below.
 */
export const INGREDIENTS: CatalogIngredient[] = [
  // Grains
  ing("rice", "Basmati rice", "Grains", "g", 1000, "1kg bag", 1.65, "pantry", 365, undefined),
  ing("oats", "Porridge oats", "Grains", "g", 1000, "1kg bag", 0.9, "pantry", 365),
  ing("pasta", "Penne pasta", "Grains", "g", 500, "500g bag", 0.55, "pantry", 365),
  ing("wraps", "Wholemeal wraps", "Grains", "unit", 8, "pack of 8", 0.85, "pantry", 10),
  ing("bread", "Wholemeal bread", "Grains", "g", 800, "800g loaf", 0.75, "pantry", 5),
  ing("quinoa", "Quinoa", "Grains", "g", 300, "300g pouch", 1.85, "pantry", 365, "rice"),
  ing("couscous", "Couscous", "Grains", "g", 500, "500g box", 0.9, "pantry", 365),
  ing("gram-flour", "Gram flour (besan)", "Grains", "g", 1000, "1kg bag", 2.2, "pantry", 365),
  ing("pitta", "Wholemeal pitta", "Grains", "unit", 6, "pack of 6", 0.65, "pantry", 5),
  ing("naan", "Naan bread", "Grains", "unit", 2, "pack of 2", 0.85, "pantry", 5),
  // Roti flour. A 1.5kg bag is ~30 rotis, so it works out cheaper per meal than
  // rice and far cheaper than shop-bought naan, and it keeps for months.
  ing("atta", "Atta (chapati flour)", "Grains", "g", 1500, "1.5kg bag", 1.75, "pantry", 240),

  // Protein
  ing("paneer", "Paneer", "Protein", "g", 226, "226g block", 2.29, "fridge", 14, "tofu"),
  ing("tofu", "Firm tofu", "Protein", "g", 396, "396g block", 1.85, "fridge", 21),
  ing("soya-chunks", "Soya chunks", "Protein", "g", 300, "300g bag", 1.5, "pantry", 365),
  ing("halloumi", "Halloumi", "Protein", "g", 225, "225g block", 2.15, "fridge", 30, "tofu"),
  ing("red-lentils", "Red lentils", "Protein", "g", 500, "500g bag", 1.35, "pantry", 365),
  ing("moong-dal", "Moong dal", "Protein", "g", 500, "500g bag", 1.9, "pantry", 365),
  ing("peanut-butter", "Peanut butter", "Protein", "g", 340, "340g jar", 1.39, "pantry", 180),
  ing("hummus", "Hummus", "Protein", "g", 200, "200g tub", 0.79, "fridge", 5),

  // Dairy & Eggs
  ing("eggs", "Eggs", "Dairy & Eggs", "unit", 12, "box of 12", 2.29, "fridge", 21),
  ing("greek-yoghurt", "Greek yoghurt", "Dairy & Eggs", "g", 1000, "1kg tub", 2.09, "fridge", 10),
  ing("milk", "Semi-skimmed milk", "Dairy & Eggs", "ml", 2272, "4-pint bottle", 1.45, "fridge", 7),
  ing("cheddar", "Mature cheddar", "Dairy & Eggs", "g", 400, "400g block", 2.79, "fridge", 30),
  ing("cottage-cheese", "Cottage cheese", "Dairy & Eggs", "g", 300, "300g tub", 1.15, "fridge", 8),
  ing("feta", "Feta-style cheese", "Dairy & Eggs", "g", 200, "200g block", 1.35, "fridge", 21),
  ing("butter", "Butter", "Dairy & Eggs", "g", 250, "250g block", 1.89, "fridge", 60),

  // Fruit & Vegetables
  ing("onions", "Onions", "Fruit & Vegetables", "g", 1000, "1kg bag", 0.89, "pantry", 21),
  ing("garlic", "Garlic", "Fruit & Vegetables", "g", 250, "250g pack", 0.79, "pantry", 30),
  ing("ginger", "Fresh ginger", "Fruit & Vegetables", "g", 200, "200g pack", 1.1, "fridge", 21),
  ing("tomatoes", "Tomatoes", "Fruit & Vegetables", "g", 500, "500g pack", 0.85, "fridge", 7),
  ing("spinach", "Spinach", "Fruit & Vegetables", "g", 240, "240g bag", 1.19, "fridge", 4, "frozen-spinach"),
  ing("peppers", "Mixed peppers", "Fruit & Vegetables", "unit", 3, "pack of 3", 1.45, "fridge", 7),
  ing("cauliflower", "Cauliflower", "Fruit & Vegetables", "unit", 1, "1 head", 0.99, "fridge", 7),
  ing("mushrooms", "Mushrooms", "Fruit & Vegetables", "g", 300, "300g pack", 1.09, "fridge", 5),
  ing("courgette", "Courgettes", "Fruit & Vegetables", "g", 500, "500g pack", 1.25, "fridge", 7),
  ing("cucumber", "Cucumber", "Fruit & Vegetables", "unit", 1, "1 whole", 0.89, "fridge", 7),
  ing("carrots", "Carrots", "Fruit & Vegetables", "g", 1000, "1kg bag", 0.65, "fridge", 14),
  ing("potatoes", "Potatoes", "Fruit & Vegetables", "g", 2000, "2kg bag", 1.19, "pantry", 21),
  ing("sweet-potato", "Sweet potatoes", "Fruit & Vegetables", "g", 1000, "1kg bag", 0.95, "pantry", 21),
  ing("broccoli", "Broccoli", "Fruit & Vegetables", "g", 350, "1 head (350g)", 0.69, "fridge", 5),
  ing("bananas", "Bananas", "Fruit & Vegetables", "unit", 5, "pack of 5", 0.78, "pantry", 5),
  ing("lemons", "Lemons", "Fruit & Vegetables", "unit", 4, "pack of 4", 1.15, "fridge", 14),
  ing("coriander", "Fresh coriander", "Fruit & Vegetables", "g", 30, "30g bunch", 0.55, "fridge", 4),
  ing("salad-leaves", "Salad leaves", "Fruit & Vegetables", "g", 120, "120g bag", 0.75, "fridge", 4),

  // Tinned & Jarred
  ing("chickpeas", "Chickpeas", "Tinned & Jarred", "g", 400, "400g tin", 0.45, "pantry", 730),
  ing("kidney-beans", "Kidney beans", "Tinned & Jarred", "g", 400, "400g tin", 0.5, "pantry", 730),
  ing("black-beans", "Black beans", "Tinned & Jarred", "g", 400, "400g tin", 0.6, "pantry", 730),
  ing("butter-beans", "Butter beans", "Tinned & Jarred", "g", 400, "400g tin", 0.55, "pantry", 730),
  ing("green-lentils", "Green lentils (tinned)", "Tinned & Jarred", "g", 400, "400g tin", 0.55, "pantry", 730),
  ing("chopped-tomatoes", "Chopped tomatoes", "Tinned & Jarred", "g", 400, "400g tin", 0.47, "pantry", 730),
  ing("coconut-milk", "Coconut milk", "Tinned & Jarred", "ml", 400, "400ml tin", 0.95, "pantry", 730),
  ing("sweetcorn", "Sweetcorn", "Tinned & Jarred", "g", 325, "325g tin", 0.55, "pantry", 730),
  ing("passata", "Passata", "Tinned & Jarred", "g", 500, "500g carton", 0.42, "pantry", 365),

  // Frozen
  ing("frozen-spinach", "Frozen spinach", "Frozen", "g", 900, "900g bag", 1.55, "freezer", 365),
  ing("frozen-veg", "Frozen mixed vegetables", "Frozen", "g", 1000, "1kg bag", 1.19, "freezer", 365),
  ing("frozen-peas", "Frozen peas", "Frozen", "g", 900, "900g bag", 1.15, "freezer", 365),
  ing("frozen-berries", "Frozen berries", "Frozen", "g", 400, "400g bag", 2.19, "freezer", 365, "bananas"),

  // Spices & Sauces
  ing("cumin", "Ground cumin", "Spices & Sauces", "g", 100, "100g pot", 1.15, "pantry", 365),
  ing("turmeric", "Turmeric", "Spices & Sauces", "g", 100, "100g pot", 1.05, "pantry", 365),
  ing("garam-masala", "Garam masala", "Spices & Sauces", "g", 100, "100g pot", 1.25, "pantry", 365),
  ing("chilli-flakes", "Chilli flakes", "Spices & Sauces", "g", 50, "50g pot", 0.85, "pantry", 365),
  ing("smoked-paprika", "Smoked paprika", "Spices & Sauces", "g", 50, "50g pot", 0.85, "pantry", 365),
  ing("mixed-herbs", "Mixed dried herbs", "Spices & Sauces", "g", 25, "25g pot", 0.65, "pantry", 365),
  ing("curry-powder", "Curry powder", "Spices & Sauces", "g", 100, "100g pot", 1.1, "pantry", 365),
  ing("tikka-paste", "Tikka curry paste", "Spices & Sauces", "g", 280, "280g jar", 1.35, "pantry", 180),
  ing("soy-sauce", "Soy sauce", "Spices & Sauces", "ml", 150, "150ml bottle", 0.85, "pantry", 365),
  ing("olive-oil", "Olive oil", "Spices & Sauces", "ml", 500, "500ml bottle", 3.19, "pantry", 365),
  ing("veg-oil", "Vegetable oil", "Spices & Sauces", "ml", 1000, "1L bottle", 1.79, "pantry", 365),
  ing("honey", "Honey", "Spices & Sauces", "g", 340, "340g squeezy", 1.35, "pantry", 365),
  ing("tomato-puree", "Tomato purée", "Spices & Sauces", "g", 200, "200g tube", 0.45, "pantry", 90),
  ing("stock-cubes", "Vegetable stock cubes", "Spices & Sauces", "unit", 10, "pack of 10", 0.65, "pantry", 365),
];

export const INGREDIENT_MAP: Map<string, CatalogIngredient> = new Map(
  INGREDIENTS.map((i) => [i.id, i])
);

export function getIngredient(id: string): CatalogIngredient {
  const found = INGREDIENT_MAP.get(id);
  if (!found) throw new Error(`Unknown ingredient: ${id}`);
  return found;
}

/** Estimated price for a quantity, pro-rata from pack price (used for per-serving costs). */
export function proRataCost(ingredientId: string, qty: number, multiplier = 1): number {
  const item = getIngredient(ingredientId);
  return (qty / item.packSize) * item.packPrice * multiplier;
}

/** Ingredients people commonly can't or won't eat — offered as "avoid" toggles. */
export const AVOIDABLE_IDS = [
  "mushrooms",
  "eggs",
  "paneer",
  "tofu",
  "soya-chunks",
  "halloumi",
  "feta",
  "cottage-cheese",
  "cheddar",
  "greek-yoghurt",
  "coconut-milk",
  "peanut-butter",
  "cauliflower",
  "courgette",
  "broccoli",
  "sweet-potato",
  "spinach",
  "peppers",
  "chickpeas",
  "kidney-beans",
  "black-beans",
  "butter-beans",
];

/** Ingredients surfaced as one-tap quick-adds on the pantry page. */
export const QUICK_ADD_IDS = [
  "rice",
  "atta",
  "oats",
  "sweet-potato",
  "paneer",
  "tofu",
  "greek-yoghurt",
  "milk",
  "red-lentils",
  "chickpeas",
  "kidney-beans",
  "potatoes",
  "onions",
  "tomatoes",
  "spinach",
  "peppers",
  "frozen-veg",
  "bread",
  "pasta",
];
