"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-basil text-white hover:bg-basil-hover active:scale-[0.98] shadow-[var(--shadow-soft)]",
  secondary: "bg-basil-soft text-basil-bright hover:bg-basil-soft-hover active:scale-[0.98]",
  ghost: "bg-transparent text-ink-soft hover:bg-sand/60 hover:text-ink",
  outline: "border border-sand bg-surface text-ink hover:border-basil hover:text-basil-bright",
  danger: "bg-terra-soft text-terra hover:bg-terra-soft-hover",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-13 px-7 text-base rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Card ---------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] border border-sand/60",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Badge ---------- */

type BadgeVariant = "default" | "green" | "terra" | "amber" | "neutral";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-basil-soft text-basil-bright",
  green: "bg-basil text-white",
  terra: "bg-terra-soft text-terra",
  amber: "bg-butter text-butter-ink",
  neutral: "bg-sand/70 text-ink",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Form fields ---------- */

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-semibold text-ink mb-1.5", className)} {...props} />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-sand bg-surface px-3.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-basil",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-sand bg-surface px-3 text-sm text-ink focus:border-basil",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Selectable chip (onboarding / filters) ---------- */

export function Chip({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.97]",
        selected
          ? "border-basil bg-basil text-white shadow-[var(--shadow-soft)]"
          : "border-sand bg-surface text-ink-soft hover:border-basil/50 hover:text-ink",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Progress ---------- */

export function Progress({
  value,
  max,
  tone = "basil",
  className,
  label,
}: {
  value: number;
  max: number;
  tone?: "basil" | "terra" | "amber";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 0.001)) * 100));
  const tones = { basil: "bg-basil-bright", terra: "bg-terra", amber: "bg-amber" };
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sand/70", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- Checkbox (big touch target for shopping) ---------- */

export function CheckCircle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
        checked ? "border-basil bg-basil text-white" : "border-sand bg-surface hover:border-basil/60"
      )}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* ---------- Quantity stepper ---------- */

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-sand bg-surface p-0.5">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-ink-soft hover:bg-sand/60"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-ink-soft hover:bg-sand/60"
      >
        +
      </button>
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Read through a ref so `onClose` isn't a dependency below. Callers pass an
  // inline arrow, so its identity changes on every render of the parent.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the dialog once, as it opens. This effect must depend on
    // `open` alone: with `onClose` in the deps it re-ran on every keystroke in
    // a modal form — typing a letter re-rendered the parent, which produced a
    // new onClose, which pulled focus out of the field being typed into.
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-sand/70 bg-card p-5 shadow-[var(--shadow-lift)] outline-none sm:m-4 sm:rounded-3xl animate-fade-up",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-soft)] hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden="true" />;
}

/* ---------- Empty state ---------- */

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-5xl" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

/* ---------- Section heading ---------- */

export function SectionTitle({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">{children}</h2>
      {right}
    </div>
  );
}
