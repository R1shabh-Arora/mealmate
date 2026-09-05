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
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // No optimiser without a server; images are served exactly as authored.
    unoptimized: true,
  },
};

export default nextConfig;
