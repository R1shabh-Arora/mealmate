"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountMenu, SignInButton } from "@/components/account";
import { Logo } from "@/components/app-shell";
import { GeneratingOverlay, PLAN_STAGES, useStagedTask } from "@/components/generating";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

const STEPS = [
  { emoji: "🧺", title: "What I have", body: "Tell MealMate what's in your pantry, fridge and freezer." },
  { emoji: "🗓️", title: "What to eat", body: "Get a 7-day plan tuned to your protein, calories and budget." },
  { emoji: "🛒", title: "What to buy", body: "One consolidated list — minus what you already own." },
  { emoji: "💷", title: "What it costs", body: "Estimated UK prices, with one tap to bring it under budget." },
  { emoji: "🍳", title: "How to prep", body: "A batch-cooking schedule that overlaps the boring bits." },
  { emoji: "♻️", title: "Zero waste", body: "Leftovers planned in, expiring food used up first." },
];

export default function LandingPage() {
  const router = useRouter();
  const { state, hydrated, startDemo } = useApp();
  const { status, error: authError } = useAuth();
  const { stage, busy, run } = useStagedTask();

  const signedIn = status === "signed-in";
  const hasKitchen = hydrated && state.onboarded;

  const handleDemo = () =>
    run(PLAN_STAGES, async () => {
      await startDemo();
      router.push("/dashboard");
    });

  return (
    <div className="min-h-dvh">
      <GeneratingOverlay stage={stage} />
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          {signedIn ? <AccountMenu /> : <SignInButton size="sm" label="Sign in" />}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-10 pt-10 text-center sm:pt-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-basil-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-basil-bright">
          Vegetarian · High protein · UK budgets
        </p>
        <h1 className="font-display mx-auto max-w-2xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Your week of food, sorted in one tap
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft sm:text-lg">
          MealMate plans 7 days of meals around what&apos;s already in your kitchen, builds the grocery list,
          keeps you under budget, and hands you a batch-prep schedule.
        </p>

        {/* Every route past this page needs an account, so a signed-out
            visitor is offered the one thing that works. Showing the demo or
            onboarding here would just walk them into the sign-in wall. */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!signedIn ? (
            status === "disabled" ? (
              <p className="rounded-xl bg-terra-soft px-4 py-2.5 text-sm font-semibold text-terra">
                Accounts aren&apos;t configured on this build.
              </p>
            ) : (
              <SignInButton size="lg" />
            )
          ) : hasKitchen ? (
            <Link href="/dashboard">
              <Button size="lg">Open my kitchen →</Button>
            </Link>
          ) : (
            <>
              <Button size="lg" onClick={handleDemo} disabled={busy}>
                ✨ Try the demo
              </Button>
              <Link href="/onboarding">
                <Button size="lg" variant="outline">
                  Set up my own week
                </Button>
              </Link>
            </>
          )}
        </div>

        {authError && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-terra-soft px-4 py-2.5 text-sm font-semibold text-terra">
            {authError}
          </p>
        )}

        <p className="mt-3 text-xs text-ink-soft">
          {signedIn
            ? hasKitchen
              ? "Your kitchen is saved to your account and follows you to any device."
              : "The demo loads a 2-person vegetarian kitchen and generates a full example week."
            : "Your kitchen is private to your account — only you can ever read or change it."}
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} className="p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="text-3xl" aria-hidden="true">
              {step.emoji}
            </span>
            <h2 className="font-display mt-3 text-lg font-semibold text-ink">{step.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t border-sand/70 py-6 text-center text-xs text-ink-soft">
        MealMate · demo build · grocery prices are estimates, not live supermarket data
      </footer>
    </div>
  );
}
