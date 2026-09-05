import { twMerge } from "tailwind-merge";
import type { Unit } from "./types";

/**
 * Joins class names, letting a caller-supplied class beat the component's own
 * default. Plain concatenation leaves both in the string and the winner is
 * decided by stylesheet order, so `<Select className="w-32" />` was silently
 * staying `w-full` and forcing the page wider than a phone screen.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function gbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function formatQty(qty: number, unit: Unit): string {
  if (unit === "unit") {
    const rounded = Math.round(qty * 10) / 10;
    return `${rounded}`;
  }
  if (qty >= 1000) {
    const kg = qty / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}${unit === "ml" ? "L" : "kg"}`;
  }
  return `${Math.round(qty)}${unit}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Mulberry32 — small deterministic PRNG so the same inputs make the same plan. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function daysUntil(isoDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const then = new Date(isoDate);
  then.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86400000);
}

export function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatExpiry(isoDate: string): { label: string; urgency: "expired" | "soon" | "ok" } {
  const days = daysUntil(isoDate);
  if (days < 0) return { label: "Expired", urgency: "expired" };
  if (days === 0) return { label: "Use today", urgency: "soon" };
  if (days === 1) return { label: "Use tomorrow", urgency: "soon" };
  if (days <= 3) return { label: `Expires in ${days} days`, urgency: "soon" };
  return { label: `Expires in ${days} days`, urgency: "ok" };
}

export function formatMins(mins: number): string {
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
