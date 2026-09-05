"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/app-shell";
import { SignInButton } from "@/components/account";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/**
 * MealMate is sign-in only: every page that shows or stores a kitchen requires
 * a Google account.
 *
 * This gate is a front door, not a lock. The exported HTML and JavaScript are
 * public files on GitHub Pages and always will be — what it protects is the
 * *data*, and that protection lives in Postgres, where Row Level Security
 * refuses any row whose user_id isn't the caller's. Someone bypassing this
 * component in devtools reaches an empty app, not somebody's kitchen.
 */

/** The landing page is the way in, and the callback is mid-sign-in. */
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/auth");
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <Logo />
      <Card className="w-full max-w-md p-8 text-center">{children}</Card>
    </main>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();

  if (isPublicPath(pathname)) return <>{children}</>;

  // Resolving a stored session takes a moment; showing the wall first would
  // flash "signed out" at someone who is signed in.
  if (status === "loading") {
    return (
      <Centered>
        <div className="mx-auto flex h-12 w-12 items-center justify-center" aria-hidden="true">
          <span className="absolute h-12 w-12 animate-spin rounded-full border-4 border-sand border-t-basil-bright" />
          <span className="text-xl">🥗</span>
        </div>
        <p className="mt-4 text-sm text-ink-soft" role="status">
          Checking your account…
        </p>
      </Centered>
    );
  }

  // No Supabase in this build, so there is no sign-in to offer. Say so plainly
  // rather than showing a button that cannot work.
  if (status === "disabled") {
    return (
      <Centered>
        <span className="text-4xl" aria-hidden="true">
          🔌
        </span>
        <h1 className="font-display mt-3 text-xl font-semibold text-ink">Accounts aren&apos;t configured</h1>
        <p className="mt-2 text-sm text-ink-soft">
          This build has no Supabase connection, so there&apos;s nothing to sign in to. The README covers
          setting the two <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_*</code> values.
        </p>
      </Centered>
    );
  }

  if (status === "signed-out") {
    return (
      <Centered>
        <span className="text-4xl" aria-hidden="true">
          🔒
        </span>
        <h1 className="font-display mt-3 text-xl font-semibold text-ink">Sign in to open your kitchen</h1>
        <p className="mt-2 text-sm text-ink-soft">
          MealMate keeps your pantry, plans and grocery list in your Google account, so they follow you to any
          device — and stay yours alone.
        </p>
        <SignInButton className="mt-5" size="lg" />
      </Centered>
    );
  }

  return <>{children}</>;
}
