"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Skeleton } from "@/components/ui";
import { type AuthUser, useAuth } from "@/lib/auth";
import { type SyncStatus, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}

export function SignInButton({
  size = "md",
  label = "Continue with Google",
  className,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const { status, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  if (status === "disabled" || status === "signed-in") return null;
  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      disabled={busy || status === "loading"}
      onClick={async () => {
        setBusy(true);
        try {
          await signInWithGoogle();
        } finally {
          setBusy(false);
        }
      }}
    >
      <GoogleGlyph />
      {busy ? "Opening Google…" : label}
    </Button>
  );
}

const SYNC_LABELS: Record<SyncStatus, { icon: string; text: string; tone: string }> = {
  local: { icon: "📱", text: "Saved on this device", tone: "text-ink-soft" },
  loading: { icon: "☁️", text: "Loading your kitchen…", tone: "text-ink-soft" },
  saving: { icon: "☁️", text: "Saving…", tone: "text-ink-soft" },
  saved: { icon: "☁️", text: "Saved to your account", tone: "text-basil-bright" },
  error: { icon: "⚠️", text: "Not saved — cloud unreachable", tone: "text-terra" },
};

export function SyncBadge({ className }: { className?: string }) {
  const { sync } = useApp();
  const { icon, text, tone } = SYNC_LABELS[sync];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", tone, className)} role="status">
      <span aria-hidden="true">{icon}</span>
      {text}
    </span>
  );
}

export function Avatar({ user, size = 32 }: { user: AuthUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      // Plain <img>: a static export has no image optimiser, and Google avatar
      // URLs are external anyway.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-full bg-basil font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-basil"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-sand bg-surface p-2 shadow-[var(--shadow-lift)] animate-fade-up"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            {user.email && <p className="truncate text-xs text-ink-soft">{user.email}</p>}
            <SyncBadge className="mt-2" />
          </div>
          <Link
            role="menuitem"
            href="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-card"
          >
            ⚙️ Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-terra hover:bg-terra-soft"
          >
            Sign out
          </button>
          <p className="px-3 pb-1 pt-2 text-[11px] text-ink-soft">Signing out clears your kitchen from this device.</p>
        </div>
      )}
    </div>
  );
}

/** Shown under the header whenever cloud saves are failing. */
export function SyncErrorBanner() {
  const { sync, syncError, retrySync } = useApp();
  if (sync !== "error") return null;
  return (
    <div role="alert" className="border-b border-terra/30 bg-terra-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-terra sm:px-6">
        <span>
          ⚠️ Changes aren&apos;t being saved — {syncError ?? "couldn't reach your cloud kitchen."}
        </span>
        <Button size="sm" variant="danger" onClick={retrySync}>
          Try again
        </Button>
      </div>
    </div>
  );
}

/** Account section for the Settings page. */
export function AccountCard() {
  const { status, user, signOut } = useAuth();
  return (
    <Card className="p-5">
      <h2 className="font-display mb-3 text-lg font-semibold text-ink sm:text-xl">Account</h2>
      {status === "disabled" && (
        <p className="text-sm text-ink-soft">
          Cloud sync isn&apos;t set up on this deployment, so your kitchen is saved in this browser only.
          The README explains how to connect Supabase and Google sign-in.
        </p>
      )}
      {status === "loading" && <Skeleton className="h-12" />}
      {status === "signed-out" && (
        <div className="grid gap-3">
          <p className="text-sm text-ink-soft">
            You&apos;re in guest mode — everything is saved on this device only. Sign in to keep your kitchen in
            your account and pick it up on your phone.
          </p>
          <SignInButton className="justify-self-start" />
        </div>
      )}
      {status === "signed-in" && user && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar user={user} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{user.name}</p>
              {user.email && <p className="truncate text-sm text-ink-soft">{user.email}</p>}
              <SyncBadge className="mt-1" />
            </div>
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
          <p className="text-xs text-ink-soft">
            Signing out clears MealMate from this device. Your kitchen stays safe in your account.
          </p>
        </div>
      )}
    </Card>
  );
}
