import type { NextConfig } from "next";

/**
 * MealMate is deployed to GitHub Pages, which serves static files only.
 *
 * `output: "export"` produces a plain `out/` folder with no Node server, so
 * there are no server components, route handlers or image optimisation at
 * runtime. Everything the app does — planning, auth, cloud sync — happens in
 * the browser talking directly to Supabase over HTTPS.
 *
 * `trailingSlash` makes every route a real directory with an index.html
 * (`/settings/index.html`), which is how static hosts resolve clean URLs.
 */

/**
 * Where the site is mounted. GitHub serves a project repo under
 * `r1shabh-arora.github.io/mealmate/`, so every asset and link needs that
 * prefix; a custom domain serves the same files at the root and needs none.
 *
 * Build-time only. "/" is the sentinel for "domain root", because a GitHub
 * Actions variable can't be set to an empty string. Next rejects a trailing
 * slash here, hence the trim.
 */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    // No optimiser without a server; images are served exactly as authored.
    unoptimized: true,
  },
};

export default nextConfig;
