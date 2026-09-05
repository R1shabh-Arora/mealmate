"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { absoluteUrl, withBasePath } from "./base-path";
import { LocalStateStore } from "./persistence";
import { clearStoredSession, getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

/**
 * disabled   — no Supabase configured; guest mode only, no sign-in offered
 * loading    — working out whether there's a session
 * signed-out — sign-in available
 * signed-in  — `user` is set
 */
export type AuthStatus = "disabled" | "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Drop the stored session and the local kitchen, then start over signed out. */
function forceLocalSignOut() {
  clearStoredSession();
  LocalStateStore.clear();
  window.location.assign(withBasePath("/"));
}

function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "You";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  return { id: user.id, email: user.email ?? null, name, avatarUrl };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (isSupabaseConfigured() ? "loading" : "disabled"));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("disabled");
      return;
    }
    let settled = false;
    const apply = (session: Session | null) => {
      settled = true;
      setUser(session ? toAuthUser(session.user) : null);
      setStatus(session ? "signed-in" : "signed-out");
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    // If the initial session event never arrives (blocked storage), don't hang on skeletons.
    const timer = setTimeout(() => {
      if (!settled) setStatus("signed-out");
    }, 4000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: absoluteUrl("/auth/callback/") },
    });
    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      // supabase-js asks the server to revoke the session before clearing it
      // locally, so an unreachable cloud would leave this device signed in.
      // Locking the device matters more: drop the stored session and the
      // local copy of the kitchen ourselves, then start fresh.
      forceLocalSignOut();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, signInWithGoogle, signOut }),
    [status, user, error, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
