"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Where Google sends the user back to. On a static host there is no server to
 * exchange the PKCE code, so supabase-js does it here in the browser
 * (`detectSessionInUrl`). We just wait for the session to land, then move on.
 */
export default function AuthCallbackPage() {
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      window.location.replace("/");
      return;
    }

    // Google reports a refused consent in the query string; no point waiting.
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      setFailed(oauthError);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // replace() so Back doesn't return to this throwaway page.
      window.location.replace("/dashboard/");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    // Covers the case where the session was already restored before we subscribed.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const timer = setTimeout(() => {
      if (!done) setFailed("Sign-in timed out before a session came back.");
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <Card className="w-full max-w-md p-8 text-center">
        {failed ? (
          <>
            <span className="text-4xl" aria-hidden="true">
              ⚠️
            </span>
            <h1 className="font-display mt-3 text-xl font-semibold text-ink">Sign-in didn&apos;t complete</h1>
            <p className="mt-2 text-sm text-ink-soft">{failed}</p>
            <Link href="/" className="mt-5 inline-block">
              <Button>Back to MealMate</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center" aria-hidden="true">
              <span className="absolute h-14 w-14 animate-spin rounded-full border-4 border-sand border-t-basil-bright" />
              <span className="text-2xl">🥗</span>
            </div>
            <h1 className="font-display mt-4 text-xl font-semibold text-ink" role="status">
              Signing you in…
            </h1>
            <p className="mt-2 text-sm text-ink-soft">Fetching your kitchen from your account.</p>
          </>
        )}
      </Card>
    </main>
  );
}
