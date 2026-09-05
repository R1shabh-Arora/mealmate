/**
 * Supabase is optional. Without these two public env vars MealMate runs in
 * guest mode — everything saved in the browser, no sign-in offered.
 * NEXT_PUBLIC_ values are inlined at build time, so they must be referenced
 * by their full names here (no dynamic lookups).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
