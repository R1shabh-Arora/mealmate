"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiKitchenPanel } from "@/components/ai-kitchen";
import { MealVisual } from "@/components/meal-visual";
import { Badge, Button, Card, Chip, EmptyState, Input, Label, Modal, SectionTitle, Select, Skeleton } from "@/components/ui";
import { INGREDIENTS, QUICK_ADD_IDS, getIngredient } from "@/data/ingredients";
import { getRecipe } from "@/data/recipes";
import { suggestUseItUpMeals } from "@/lib/engine/useitup";
import { useApp } from "@/lib/store";
import type { StorageLocation, Unit } from "@/lib/types";
import { cn, formatExpiry, formatQty, isoDateInDays } from "@/lib/utils";

const LOCATIONS: Array<{ id: StorageLocation | "all"; label: string; emoji: string }> = [
  { id: "all", label: "All", emoji: "🧺" },
  { id: "pantry", label: "Pantry", emoji: "🏺" },
  { id: "fridge", label: "Fridge", emoji: "🧊" },
  { id: "freezer", label: "Freezer", emoji: "❄️" },
];

/** Relative shortcuts, for when you know "about a week" but not the date. */
const QUICK_EXPIRY: Array<{ label: string; days: number }> = [
  { label: "Today", days: 0 },
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+1 month", days: 30 },
];

/**
 * Expiry as a real date, with relative shortcuts.
 *
 * The date is what the model has always stored; asking for "expires in N days"
 * just made the user do the arithmetic that's already printed on the packet.
 * Past dates are allowed on purpose — something already out of date is exactly
 * what Use It Up needs to know about.
 *
 * Module scope, not nested in the page: a component defined inside a render is
 * a new type on every keystroke, and React would remount the input and drop
 * focus.
 */
function ExpiryField({
  id,
  value,
  onChange,
}: {
  id: string;
  /** ISO yyyy-mm-dd, or "" for no expiry tracked. */
  value: string;
  onChange: (iso: string) => void;
}) {
  const expiry = value ? formatExpiry(value) : null;
  return (
    <div>
      <Label htmlFor={id}>Expiry date</Label>
      <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_EXPIRY.map((q) => (
          <Chip key={q.label} className="px-2.5 py-1 text-xs" onClick={() => onChange(isoDateInDays(q.days))}>
            {q.label}
          </Chip>
        ))}
        {value && (
          <Chip className="px-2.5 py-1 text-xs" onClick={() => onChange("")}>
            ✕ No date
          </Chip>
        )}
      </div>
      <p className={cn("mt-1.5 text-xs", expiry?.urgency === "expired" ? "text-terra" : "text-ink-soft")}>
        {expiry ? expiry.label : "No expiry tracked — this item is never flagged as running out."}
      </p>
    </div>
  );
}

function IngredientsInner() {
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const { state, hydrated, addPantryItem, quickAddPantry, updatePantryItem, removePantryItem } = useApp();
  const [tab, setTab] = useState<StorageLocation | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  // Add form state
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<Unit>("g");
  const [location, setLocation] = useState<StorageLocation>("fridge");
  const [expiryDate, setExpiryDate] = useState(() => isoDateInDays(7));
  const [formError, setFormError] = useState<string | null>(null);

  // Changing the expiry of something already in the kitchen.
  const [expiryEditId, setExpiryEditId] = useState<string | null>(null);
  const [expiryDraft, setExpiryDraft] = useState("");

  const { pantry, preferences } = state;
  const useItUp = useMemo(() => suggestUseItUpMeals(pantry, preferences), [pantry, preferences]);

  const visible = useMemo(
    () => (tab === "all" ? pantry : pantry.filter((p) => p.location === tab)),
    [pantry, tab]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return INGREDIENTS.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6);
  }, [search]);

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a quantity above zero.");
      return;
    }
    if (!selectedId && !customName.trim()) {
      setFormError("Pick an ingredient or type a custom name.");
      return;
    }
    if (selectedId) {
      const ing = getIngredient(selectedId);
      addPantryItem({
        ingredientId: selectedId,
        name: ing.name,
        category: ing.category,
        qty: amount,
        unit: ing.unit,
        location,
        expiryDate: expiryDate || undefined,
      });
    } else {
      addPantryItem({
        name: customName.trim(),
        category: "Pantry",
        qty: amount,
        unit,
        location,
        expiryDate: expiryDate || undefined,
      });
    }
    setSearch("");
    setSelectedId(null);
    setCustomName("");
    setQty("");
    setExpiryDate(isoDateInDays(7));
    setFormError(null);
    setAddOpen(false);
  };

  const openExpiryEditor = (itemId: string, current?: string) => {
    setExpiryDraft(current ?? "");
    setExpiryEditId(itemId);
  };

  const saveExpiry = () => {
    if (!expiryEditId) return;
    updatePantryItem(expiryEditId, { expiryDate: expiryDraft || undefined });
    setExpiryEditId(null);
  };

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-3xl gap-5">
      {welcome && (
        <Card className="border-l-4 border-l-basil p-4">
          <p className="font-semibold text-ink">🎉 You&apos;re all set up!</p>
          <p className="text-sm text-ink-soft">
            Add what&apos;s already in your kitchen — MealMate plans around it and never asks you to buy what you own.
            Then hit <Link href="/dashboard" className="font-semibold text-basil-bright hover:underline">Generate My Week</Link>.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Ingredients</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
            📷 Scan my fridge
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            ＋ Add ingredient
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Storage location">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            role="tab"
            aria-selected={tab === loc.id}
            onClick={() => setTab(loc.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === loc.id ? "bg-basil text-white shadow-[var(--shadow-soft)]" : "bg-surface text-ink-soft border border-sand hover:text-ink"
            )}
          >
            <span aria-hidden="true">{loc.emoji}</span>
            {loc.label}
            <span className="text-xs opacity-70">
              {loc.id === "all" ? pantry.length : pantry.filter((p) => p.location === loc.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">Quick add</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD_IDS.map((id) => {
            const ing = getIngredient(id);
            return (
              <Chip key={id} onClick={() => quickAddPantry(id)} className="px-3 py-1.5 text-xs" aria-label={`Add ${ing.name}`}>
                ＋ {ing.name}
              </Chip>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="👀"
          title="Your kitchen is looking empty"
          body="Add what you already have and we'll build your week around it — nothing you own ends up on the shopping list."
          action={<Button onClick={() => setAddOpen(true)}>＋ Add your first ingredient</Button>}
        />
      ) : (
        <Card className="divide-y divide-sand/60">
          {visible.map((item) => {
            const expiry = item.expiryDate ? formatExpiry(item.expiryDate) : null;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-lg" aria-hidden="true">
                  {LOCATIONS.find((l) => l.id === item.location)?.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span className="font-semibold tabular-nums">{formatQty(item.qty, item.unit)}</span>
                    <span className="capitalize">{item.location}</span>
                    {/* The date is the thing most likely to be wrong or missing,
                        so it's editable in place rather than delete-and-re-add. */}
                    <button
                      type="button"
                      onClick={() => openExpiryEditor(item.id, item.expiryDate)}
                      aria-label={
                        expiry ? `Change expiry date for ${item.name}` : `Set an expiry date for ${item.name}`
                      }
                      className="rounded-full transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-bright"
                    >
                      {expiry ? (
                        <Badge variant={expiry.urgency === "ok" ? "neutral" : expiry.urgency === "soon" ? "amber" : "terra"}>
                          {expiry.urgency !== "ok" && <span aria-hidden="true">⏳</span>}
                          {expiry.label}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">＋ Add date</Badge>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    aria-label={`Reduce ${item.name}`}
                    onClick={() => {
                      const step = item.unit === "unit" ? 1 : item.unit === "ml" ? 100 : 100;
                      const next = item.qty - step;
                      if (next <= 0) removePantryItem(item.id);
                      else updatePantryItem(item.id, { qty: next });
                    }}
                  >
                    −
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    aria-label={`Increase ${item.name}`}
                    onClick={() => updatePantryItem(item.id, { qty: item.qty + (item.unit === "unit" ? 1 : 100) })}
                  >
                    ＋
                  </Button>
                  <button
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removePantryItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 hover:bg-terra-soft hover:text-terra"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Use it up */}
      <section id="use-it-up">
        <SectionTitle>⏳ Use It Up</SectionTitle>
        {/* Deterministic first: this section is the local engine matching pantry
            items to real recipes. The AI panel below picks up what it can't. */}
        {useItUp.length === 0 ? (
          <Card className="p-5 text-sm text-ink-soft">
            Nothing is close to expiry — nice work keeping waste low. 🌱
          </Card>
        ) : (
          <div className="grid gap-3">
            {useItUp.map((s) => (
              <Card key={s.pantryItemId} className="p-4">
                <p className="font-semibold text-ink">
                  {s.ingredientName}{" "}
                  <span className="text-sm font-medium text-terra">
                    — use within {s.daysLeft === 0 ? "today" : s.daysLeft === 1 ? "1 day" : `${s.daysLeft} days`}
                  </span>
                </p>
                {s.recipeIds.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {s.recipeIds.map((rid) => {
                      const recipe = getRecipe(rid);
                      return (
                        <Link key={rid} href={`/recipes/${rid}`} className="group">
                          <div className="flex items-center gap-2.5 rounded-xl border border-sand p-2 transition-colors hover:border-basil">
                            <MealVisual recipe={recipe} className="h-10 w-10 shrink-0 rounded-lg" emojiClass="text-xl" />
                            <span className="text-xs font-semibold text-ink group-hover:text-basil-bright">{recipe.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-soft">No matching recipes — use it as a side or freeze it.</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <AiKitchenPanel />

      {/* Add ingredient modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add ingredient">
        <form className="grid gap-4" onSubmit={submitAdd}>
          <div>
            <Label htmlFor="ing-search">Search ingredients</Label>
            <Input
              id="ing-search"
              type="search"
              placeholder="e.g. paneer, oats, spinach…"
              value={selectedId ? getIngredient(selectedId).name : search}
              onChange={(e) => {
                setSelectedId(null);
                setSearch(e.target.value);
              }}
            />
            {searchResults.length > 0 && !selectedId && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {searchResults.map((ing) => (
                  <Chip
                    key={ing.id}
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      setSelectedId(ing.id);
                      setUnit(ing.unit);
                      setLocation(ing.defaultLocation);
                      setExpiryDate(isoDateInDays(Math.min(ing.shelfLifeDays, 365)));
                      setQty(String(ing.packSize));
                    }}
                  >
                    {ing.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>
          {!selectedId && (
            <div>
              <Label htmlFor="ing-custom">Or a custom name</Label>
              <Input id="ing-custom" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Kimchi" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ing-qty">Quantity</Label>
              <Input id="ing-qty" type="number" inputMode="decimal" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ing-unit">Unit</Label>
              <Select id="ing-unit" value={unit} disabled={Boolean(selectedId)} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="g">grams (g)</option>
                <option value="ml">millilitres (ml)</option>
                <option value="unit">items</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ing-loc">Location</Label>
              <Select id="ing-loc" value={location} onChange={(e) => setLocation(e.target.value as StorageLocation)}>
                <option value="pantry">Pantry</option>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
              </Select>
            </div>
          </div>
          <ExpiryField id="ing-expiry" value={expiryDate} onChange={setExpiryDate} />
          {formError && (
            <p role="alert" className="rounded-xl bg-terra-soft px-3 py-2 text-sm font-semibold text-terra">
              {formError}
            </p>
          )}
          <Button type="submit">Add to my kitchen</Button>
        </form>
      </Modal>

      {/* Change the expiry of something already in the kitchen */}
      <Modal
        open={expiryEditId !== null}
        onClose={() => setExpiryEditId(null)}
        title={pantry.find((p) => p.id === expiryEditId)?.name ?? "Expiry date"}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveExpiry();
          }}
        >
          <ExpiryField id="edit-expiry" value={expiryDraft} onChange={setExpiryDraft} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setExpiryEditId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Fridge scanner placeholder — honest about status */}
      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title="Scan my fridge">
        <div className="grid gap-4 text-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-sand bg-surface py-10">
            <span className="text-5xl" aria-hidden="true">📷</span>
            <p className="font-semibold text-ink">Coming soon</p>
            <p className="max-w-xs text-sm text-ink-soft">
              Point your camera at your fridge and MealMate will recognise the ingredients. Image recognition
              isn&apos;t connected in this demo build, so nothing is scanned yet — the flow is ready for a vision
              model to plug in.
            </p>
          </div>
          <Button variant="secondary" onClick={() => { setScanOpen(false); setAddOpen(true); }}>
            Add ingredients manually instead
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function IngredientsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <IngredientsInner />
    </Suspense>
  );
}
