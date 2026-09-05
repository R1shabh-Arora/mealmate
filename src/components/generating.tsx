"use client";

import React, { useCallback, useRef, useState } from "react";

export const PLAN_STAGES = [
  "Checking what you already have…",
  "Optimising your meals…",
  "Balancing protein and calories…",
  "Making the grocery list…",
  "Finding ways to save money…",
];

/**
 * Runs an async task while stepping through friendly stage messages, so
 * generation never feels like a frozen UI.
 */
export function useStagedTask() {
  const [stage, setStage] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(async (stages: string[], task: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    try {
      for (const message of stages) {
        setStage(message);
        await new Promise((resolve) => setTimeout(resolve, 420));
      }
      await task();
    } finally {
      running.current = false;
      setStage(null);
    }
  }, []);

  return { stage, busy: stage !== null, run };
}

export function GeneratingOverlay({ stage }: { stage: string | null }) {
  if (!stage) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-sand border-t-basil-bright" aria-hidden="true" />
          <span className="text-2xl" aria-hidden="true">🥗</span>
        </div>
        <p className="font-display text-lg font-semibold text-ink">{stage}</p>
        <p className="text-sm text-ink-soft">Takes a couple of seconds</p>
      </div>
    </div>
  );
}
