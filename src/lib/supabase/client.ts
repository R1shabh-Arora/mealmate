import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** Where supabase-js keeps the session. Cleared on sign-out to lock the device. */
export const AUTH_STORAGE_KEY = "mealmate-auth";

let client: SupabaseClient | null | undefined;

/**
 * The one Supabase client. MealMate is a static site with no server, so the
 * session lives in localStorage rather than cookies, and the PKCE code that
 * Google returns is exchanged in the browser (`detectSessionInUrl`).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  if (!isSupabaseConfigured()) {
    client = null;
    return null;
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return client;
}

/**
 * Remove every trace of the session from this browser. supabase-js asks the
 * server to revoke the token before clearing local state, so if Supabase is
 * unreachable a plain signOut() can leave the device signed in. Locking the
 * device matters more than a clean revocation, so we always clear locally too.
 */
export function clearStoredSession(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === AUTH_STORAGE_KEY || key.startsWith(`${AUTH_STORAGE_KEY}-`)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage blocked; nothing to clear.
  }
}
