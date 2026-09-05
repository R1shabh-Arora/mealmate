"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, CheckCircle, EmptyState, Input, Modal, Progress, Select, Skeleton, Stepper } from "@/components/ui";
import { CATEGORY_ORDER } from "@/lib/engine/grocery";
import { getMealPlannerService } from "@/lib/services/meal-planner-service";
import { useApp } from "@/lib/store";
import type { BudgetOptimisation, GroceryCategory, MealPlan, Supermarket } from "@/lib/types";
import { DAY_SHORT, SUPERMARKETS } from "@/lib/types";
import { cn, formatQty, gbp } from "@/lib/utils";

const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  "Fruit & Vegetables": "🥕",
  Protein: "💪",
  "Dairy & Eggs": "🥛",
  Grains: "🌾",
  "Tinned & Jarred": "🥫",
  Frozen: "🧊",
  Pantry: "🧺",
  "Spices & Sauces": "🌶️",
};

export default function GroceriesPage() {
  const {
    state,
    hydrated,
    toggleGroceryPurchased,
    removeGroceryItem,
    setGroceryPacks,
    addCustomGroceryItem,
    setPreferences,
    applyPlan,
  } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [optimising, setOptimising] = useState(false);
  const [proposal, setProposal] = useState<{ plan: MealPlan; result: BudgetOptimisation } | null>(null);

  const { grocery, preferences, plan, pantry } = state;

  const total = useMemo(
    () => Math.round(grocery.reduce((sum, g) => sum + g.estCost, 0) * 100) / 100,
    [grocery]
  );
  const purchasedCost = useMemo(
    () => Math.round(grocery.filter((g) => g.purchased).reduce((s, g) => s + g.estCost, 0) * 100) / 100,
    [grocery]
  );
  const remaining = Math.round((preferences.budget - total) * 100) / 100;
  const overBy = Math.round((total - preferences.budget) * 100) / 100;

  const grouped = useMemo(() => {
    const map = new Map<GroceryCategory, typeof grocery>();
    for (const cat of CATEGORY_ORDER) {
      const items = grocery.filter((g) => g.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [grocery]);

  const runOptimise = async () => {
    if (!plan) return;
    setOptimising(true);
    try {
      const outcome = await getMealPlannerService().optimiseBudget(plan, pantry, preferences);
      setProposal(outcome);
    } finally {
      setOptimising(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (grocery.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="No shopping list yet"
        body="Generate your meal plan to create your shopping list — it consolidates every ingredient and skips what you already have."
        action={
          <Link href="/meal-plan">
            <Button>Go to Meal Plan</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-2xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Groceries</h1>
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="supermarket" className="text-xs font-semibold text-ink-soft">
            Shop at
          </label>
          <Select
            id="supermarket"
            className="h-9 w-32 text-xs"
            value={preferences.supermarket}
            onChange={(e) => setPreferences({ ...preferences, supermarket: e.target.value as Supermarket })}
          >
            {Object.entries(SUPERMARKETS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Budget summary */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Estimated total</p>
            <p className="font-display text-3xl font-bold text-ink">
              {gbp(total)} <span className="text-base font-medium text-ink-soft">/ {gbp(preferences.budget)}</span>
            </p>
          </div>
          <div className="text-right">
            {overBy > 0 ? (
              <Badge variant="terra" className="text-sm">Over budget by {gbp(overBy)}</Badge>
            ) : (
              <Badge variant="green" className="text-sm">{gbp(remaining)} remaining</Badge>
            )}
            <p className="mt-1 text-xs text-ink-soft">{gbp(purchasedCost)} ticked off</p>
          </div>
        </div>
        <Progress className="mt-3" value={total} max={preferences.budget} tone={overBy > 0 ? "terra" : "basil"} label="Budget used" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-ink-soft">
            Estimated prices for {SUPERMARKETS[preferences.supermarket].name} — not live supermarket data.
          </p>
          {overBy > 0 && (
            <Button variant="danger" size="sm" onClick={runOptimise} disabled={optimising}>
              {optimising ? "Finding savings…" : "💷 Make it cheaper"}
            </Button>
          )}
        </div>
      </Card>

      {/* Item groups */}
      {[...grouped.entries()].map(([category, items]) => (
        <section key={category} aria-label={category}>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wide text-ink-soft">
            <span aria-hidden="true">{CATEGORY_EMOJI[category]}</span>
            {category}
            <span className="font-medium normal-case">· {items.length}</span>
          </h2>
          <Card className="divide-y divide-sand/60">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap sm:gap-3 sm:p-3.5",
                  item.purchased && "opacity-55"
                )}
              >
                <CheckCircle
                  checked={item.purchased}
                  onToggle={() => toggleGroceryPurchased(item.id)}
                  label={`Mark ${item.name} as purchased`}
                />
                <div className="min-w-0 flex-1 basis-[calc(100%-2.75rem)] sm:basis-auto">
                  <p className={cn("truncate text-sm font-semibold text-ink", item.purchased && "line-through")}>
                    {item.name}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {item.custom ? (
                      "Added by you"
                    ) : (
                      <>
                        Buy {formatQty(item.needQty, item.unit)}
                        {item.haveQty > 0 && (
                          <span className="text-basil-bright"> more · you have {formatQty(item.haveQty, item.unit)}</span>
                        )}{" "}
                        · {item.packs} × {item.packLabel}
                      </>
                    )}
                  </p>
                </div>
                {!item.custom && (
                  <Stepper
                    value={item.packs}
                    onChange={(v) => setGroceryPacks(item.id, v)}
                    label={`packs of ${item.name}`}
                  />
                )}
                <p className="ml-auto shrink-0 text-right text-sm font-bold tabular-nums text-ink sm:ml-0">
                  {gbp(item.estCost)}
                </p>
                <button
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeGroceryItem(item.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft/60 hover:bg-terra-soft hover:text-terra"
                >
                  ✕
                </button>
              </div>
            ))}
          </Card>
        </section>
      ))}

      <Button variant="outline" onClick={() => setAddOpen(true)}>
        ＋ Add item
      </Button>

      {/* Add custom item */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add an item">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const cost = Number(newCost);
            if (!newName.trim() || Number.isNaN(cost) || cost < 0) return;
            addCustomGroceryItem(newName.trim(), cost);
            setNewName("");
            setNewCost("");
            setAddOpen(false);
          }}
        >
          <div>
            <label htmlFor="item-name" className="mb-1.5 block text-sm font-semibold text-ink">
              Item
            </label>
            <Input id="item-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Kitchen roll" required />
          </div>
          <div>
            <label htmlFor="item-cost" className="mb-1.5 block text-sm font-semibold text-ink">
              Estimated cost (£)
            </label>
            <Input
              id="item-cost"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              placeholder="1.50"
              required
            />
          </div>
          <Button type="submit">Add to list</Button>
        </form>
      </Modal>

      {/* Budget optimisation proposal */}
      <Modal open={proposal !== null} onClose={() => setProposal(null)} title="Cheaper week found" wide>
        {proposal && (
          <div className="grid gap-4">
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-basil-soft p-4">
              <span className="font-display text-xl font-bold text-ink-soft line-through">{gbp(proposal.result.before)}</span>
              <span aria-hidden="true" className="text-basil-bright">→</span>
              <span className="font-display text-2xl font-bold text-basil-bright">{gbp(proposal.result.after)}</span>
              <Badge variant="green">saves {gbp(proposal.result.before - proposal.result.after)}</Badge>
            </div>
            {proposal.result.changes.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No swaps found that keep your nutrition on track. Try trimming items manually or raising the budget slightly.
              </p>
            ) : (
              <ul className="grid gap-2">
                {proposal.result.changes.map((change, i) => (
                  <li key={i} className="rounded-xl border border-sand bg-surface p-3 text-sm">
                    <p className="font-semibold text-ink">
                      {DAY_SHORT[change.day]} {change.slot}: {change.from} → {change.to}
                    </p>
                    <p className="text-xs text-basil-bright">Saves ~{gbp(change.saving)} · similar protein and calories</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={proposal.result.changes.length === 0}
                onClick={() => {
                  applyPlan(proposal.plan);
                  setProposal(null);
                }}
              >
                Apply swaps ✓
              </Button>
              <Button variant="ghost" onClick={() => setProposal(null)}>
                Keep current plan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
