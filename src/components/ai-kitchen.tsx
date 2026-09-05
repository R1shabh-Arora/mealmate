"use client";

import { useState } from "react";
import { Badge, Button, Card, Chip, Input, SectionTitle } from "@/components/ui";
import { AiKitchenError, askAiKitchen, isAiAvailable } from "@/lib/ai/ai-kitchen";
import type { AiKitchenResponse, AiTask } from "@/lib/ai/schemas";
import { useApp } from "@/lib/store";
import { gbp } from "@/lib/utils";

/**
 * The AI layer sits beside the deterministic planner, never in front of it.
 *
 * The local engine plans the week — it holds budget and protein targets
 * reliably, for free. What it cannot do is see a pantry item no recipe mentions,
 * improvise a substitution, or answer a question. That's all this is for.
 */

function SuggestionCard({ suggestion }: { suggestion: AiKitchenResponse["suggestions"][number] }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-ink">{suggestion.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="neutral">⏱ {suggestion.timeMins}m</Badge>
          <Badge variant="neutral">🍽 {suggestion.servings}</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{suggestion.description}</p>

      <p className="mt-2 rounded-xl bg-basil-soft px-3 py-2 text-xs font-medium text-basil-bright">
        💡 {suggestion.why}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "kcal", value: String(Math.round(suggestion.approxCalories)) },
          { label: "protein", value: `${Math.round(suggestion.approxProtein)}g` },
          { label: "cost", value: gbp(suggestion.approxCostGbp) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface px-2 py-1.5">
            <p className="text-sm font-bold tabular-nums text-ink">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">{stat.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[10px] text-ink-soft">Per serving · AI estimates, not measured</p>

      {suggestion.usesFromPantry.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink">Uses what you have</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestion.usesFromPantry.map((name) => (
              <Badge key={name} variant="neutral">
                ✓ {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {suggestion.needToBuy.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-ink">Still need</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestion.needToBuy.map((name) => (
              <Badge key={name} variant="amber">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer text-sm font-semibold text-basil-bright hover:underline">
          Show method
        </summary>
        <ul className="mt-2 grid gap-1 text-xs text-ink-soft">
          {suggestion.ingredients.map((ing) => (
            <li key={ing.name} className="flex justify-between gap-3">
              <span>{ing.name}</span>
              <span className="shrink-0 tabular-nums">{ing.qty}</span>
            </li>
          ))}
        </ul>
        <ol className="mt-3 grid gap-2 text-sm text-ink-soft">
          {suggestion.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-basil text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}

export function AiKitchenPanel() {
  const { state } = useApp();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<AiTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiKitchenResponse | null>(null);

  if (!isAiAvailable()) return null;

  const expiringSoon = state.pantry.filter((p) => p.expiryDate).length > 0;

  const run = async (task: AiTask, q?: string) => {
    setBusy(task);
    setError(null);
    try {
      const response = await askAiKitchen({
        task,
        pantry: state.pantry,
        preferences: state.preferences,
        question: q,
      });
      setResult(response);
    } catch (e) {
      setResult(null);
      setError(e instanceof AiKitchenError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const emptyPantry = state.pantry.length === 0;

  return (
    <section className="grid gap-3">
      <SectionTitle>✨ Ask your kitchen</SectionTitle>

      <Card className="p-4">
        <p className="text-sm text-ink-soft">
          The week planner works from MealMate&apos;s own recipes. This asks an AI instead — it can use
          anything you&apos;ve added, including things no recipe covers, and improvise around what&apos;s missing.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null || emptyPantry} onClick={() => void run("suggest")}>
            {busy === "suggest" ? "Thinking…" : "🍳 What can I make?"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null || !expiringSoon}
            onClick={() => void run("rescue")}
          >
            {busy === "rescue" ? "Thinking…" : "♻️ Use up what's going off"}
          </Button>
        </div>

        {emptyPantry && (
          <p className="mt-2 text-xs text-ink-soft">Add something to your kitchen first.</p>
        )}

        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const q = question.trim();
            if (q) void run("ask", q);
          }}
        >
          <Input
            className="min-w-0 flex-1 basis-48"
            placeholder="Or ask… e.g. what can I do with leftover rice?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="Ask a question about your kitchen"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={busy !== null || !question.trim()}>
            {busy === "ask" ? "Thinking…" : "Ask"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-terra-soft px-3 py-2 text-sm font-semibold text-terra">
            {error}
          </p>
        )}
      </Card>

      {result && (
        <div className="grid gap-3">
          {result.answer && (
            <Card className="p-4">
              <p className="whitespace-pre-wrap text-sm text-ink">{result.answer}</p>
            </Card>
          )}

          {result.warnings.length > 0 && (
            <Card className="border-l-4 border-l-terra p-4">
              <ul className="grid gap-1 text-sm text-terra">
                {result.warnings.map((w, i) => (
                  <li key={i}>⚠️ {w}</li>
                ))}
              </ul>
            </Card>
          )}

          {result.substitutions.length > 0 && (
            <Card className="p-4">
              <h3 className="font-display text-base font-semibold text-ink">Swaps that work</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {result.substitutions.map((s, i) => (
                  <li key={i}>
                    <span className="font-semibold text-ink">{s.missing}</span>
                    <span className="text-ink-soft"> → </span>
                    <span className="font-semibold text-basil-bright">{s.useInstead}</span>
                    <p className="text-xs text-ink-soft">{s.note}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.suggestions.map((s) => (
            <SuggestionCard key={s.title} suggestion={s} />
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Chip className="px-3 py-1.5 text-xs" onClick={() => setResult(null)}>
              ✕ Clear
            </Chip>
            <p className="text-xs text-ink-soft">
              AI-generated — check quantities and cooking times before you rely on them.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
