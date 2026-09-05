/**
 * The prefix the site is served under — "" on a custom domain,
 * "/mealmate" on GitHub's project URL. Mirrors the normalisation in
 * `next.config.ts`; both read the same build-time variable.
 *
 * `next/link` and the router prefix `basePath` on their own. Raw browser
 * navigations (`window.location.*`) and URLs handed to a third party (the
 * OAuth redirect) do not, so those have to come through here.
 */
const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const BASE_PATH = raw === "/" ? "" : raw.replace(/\/+$/, "");

/** Turns an app-absolute path ("/dashboard/") into one the browser can follow. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Absolute URL for the same, for redirects that leave the origin and come back. */
export function absoluteUrl(path: string): string {
  return `${window.location.origin}${withBasePath(path)}`;
}
