"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { AccountMenu, SignInButton, SyncBadge, SyncErrorBanner } from "@/components/account";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/meal-plan", label: "Meal Plan" },
  { href: "/groceries", label: "Groceries" },
  { href: "/meal-prep", label: "Meal Prep" },
  { href: "/recipes", label: "Recipes" },
  { href: "/ingredients", label: "My Ingredients" },
];

const MOBILE_LINKS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/meal-plan", label: "Plan", icon: "🗓️" },
  { href: "/groceries", label: "Groceries", icon: "🛒" },
  { href: "/meal-prep", label: "Prep", icon: "🍳" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-bold text-ink", className)}>
      <span
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-basil text-base text-white shadow-[var(--shadow-soft)]"
        aria-hidden="true"
      >
        🥗
      </span>
      MealMate
    </span>
  );
}

/** Right-hand header slot: account avatar when signed in, sign-in when not. */
function HeaderAccount({ compact }: { compact?: boolean }) {
  const { status } = useAuth();
  if (status === "signed-in") return <AccountMenu />;
  if (status === "signed-out") return <SignInButton size="sm" label={compact ? "Sign in" : "Sign in with Google"} />;
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/" || pathname.startsWith("/onboarding");
  const [moreOpen, setMoreOpen] = useState(false);
  const { status } = useAuth();

  if (bare) return <>{children}</>;

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <div className="min-h-dvh">
      {/* Desktop / tablet top nav */}
      <header className="sticky top-0 z-40 hidden border-b border-sand/70 bg-cream/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/dashboard" aria-label="MealMate home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {DESKTOP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive(link.href) ? "bg-basil-soft text-basil-bright" : "text-ink-soft hover:bg-sand/50 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <HeaderAccount />
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={isActive("/settings") ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-lg transition-colors",
                isActive("/settings") ? "bg-basil-soft" : "hover:bg-sand/50"
              )}
            >
              ⚙️
            </Link>
          </div>
        </div>
        <SyncErrorBanner />
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 md:hidden">
        <div className="flex h-14 items-center justify-between border-b border-sand/70 bg-cream/90 px-4 backdrop-blur">
          <Link href="/dashboard" aria-label="MealMate home">
            <Logo className="text-lg" />
          </Link>
          <div className="flex items-center gap-1.5">
            <HeaderAccount compact />
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand/50"
            >
              ⚙️
            </Link>
          </div>
        </div>
        <SyncErrorBanner />
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-12">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sand/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {MOBILE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold",
                isActive(link.href) ? "text-basil-bright" : "text-ink-soft"
              )}
            >
              <span className="text-lg" aria-hidden="true">
                {link.icon}
              </span>
              {link.label}
              {isActive(link.href) && <span className="h-1 w-1 rounded-full bg-basil" aria-hidden="true" />}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="More pages"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-ink-soft"
          >
            <span className="text-lg" aria-hidden="true">
              ☰
            </span>
            More
          </button>
        </div>
        {moreOpen && (
          <div className="border-t border-sand/70 bg-card px-4 py-3 animate-fade-up">
            {status !== "disabled" && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2">
                <SyncBadge />
                {status === "signed-out" && <SignInButton size="sm" label="Sign in" />}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: "/recipes", label: "Recipes", icon: "📖" },
                { href: "/ingredients", label: "Ingredients", icon: "🧺" },
                { href: "/settings", label: "Settings", icon: "⚙️" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 rounded-xl bg-cream py-3 text-xs font-semibold text-ink"
                >
                  <span className="text-xl" aria-hidden="true">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
