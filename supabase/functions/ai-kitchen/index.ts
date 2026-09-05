/**
 * AI Kitchen — the only place MealMate talks to Anthropic.
 *
 * MealMate is a static site on GitHub Pages, so anything in the bundle is
 * public. An API key in the browser would be readable by anyone with devtools
 * and spendable by anyone who found it. This function is the server the site
 * doesn't otherwise have: it holds the key, checks who is calling, meters the
 * spend, and returns validated JSON.
 *
 * It deliberately does NOT plan weeks. The deterministic engine in the app is
 * better at holding a budget and a protein target at once, and it's free and
 * instant. This fills the gaps that engine can't reach: pantry items no recipe
 * knows about, substitutions, invented dishes, and plain questions.
 *
 * Deploy:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   supabase functions deploy ai-kitchen
 */

// Pinned exactly: Deno resolves `npm:` at deploy time, and a floating range
// turns a working deploy into a surprise boot failure later. The SDK versions
// here are the ones that actually expose `messages.parse` + `output_config`;
// zod and supabase-js match what the site itself resolves.
import Anthropic from "npm:@anthropic-ai/sdk@0.124.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.124.0/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2.115.0";
import { z } from "npm:zod@4.5.4";

/* ------------------------------------------------------------------ config */

const MODEL = Deno.env.get("AI_KITCHEN_MODEL") ?? "claude-opus-5";
/** Recipe suggestion is a bounded, well-specified task; it doesn't need deep
 *  reasoning. Raise to "high" if answers feel shallow. */
const EFFORT = Deno.env.get("AI_KITCHEN_EFFORT") ?? "medium";
const DAILY_CALL_LIMIT = Number(Deno.env.get("AI_KITCHEN_DAILY_LIMIT") ?? "40");

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("AI_KITCHEN_ALLOW_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* ----------------------------------------------------------------- schemas */

// Mirrors src/lib/ai/schemas.ts. Kept as its own copy because Edge Functions
// are deployed separately from the site and can't import from it.
const SuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  why: z.string(),
  timeMins: z.number(),
  servings: z.number(),
  usesFromPantry: z.array(z.string()),
  needToBuy: z.array(z.string()),
  approxCalories: z.number(),
  approxProtein: z.number(),
  approxCostGbp: z.number(),
  equipment: z.array(z.string()),
  ingredients: z.array(z.object({ name: z.string(), qty: z.string() })),
  steps: z.array(z.string()),
});

const ResponseSchema = z.object({
  answer: z.string(),
  suggestions: z.array(SuggestionSchema),
  substitutions: z.array(
    z.object({ missing: z.string(), useInstead: z.string(), note: z.string() })
  ),
  warnings: z.array(z.string()),
});

const RequestSchema = z.object({
  task: z.enum(["suggest", "ask", "substitute", "rescue"]),
  pantry: z.array(
    z.object({
      name: z.string(),
      qty: z.string(),
      location: z.string(),
      daysLeft: z.number().nullable(),
    })
  ),
  preferences: z.object({
    people: z.number(),
    weeklyBudgetGbp: z.number(),
    diet: z.string(),
    avoid: z.array(z.string()),
    equipment: z.array(z.string()),
    maxCookTimeMins: z.number(),
    proteinTargetG: z.number().nullable(),
    calorieTarget: z.number().nullable(),
  }),
  question: z.string().max(500).optional(),
});

type KitchenRequest = z.infer<typeof RequestSchema>;

/* ----------------------------------------------------------------- prompts */

/** Per-task instruction. Add a task by adding a branch here and to the enum. */
const TASK_BRIEF: Record<KitchenRequest["task"], string> = {
  suggest:
    "Propose 3 dishes they could cook right now. Favour ones that use the most " +
    "of what they already have, especially anything close to going off. It is " +
    "fine to invent a dish — you are not limited to any recipe book.",
  ask:
    "Answer their question directly and practically. Include recipe suggestions " +
    "only if the question calls for them; an answer alone is often enough.",
  substitute:
    "They want to cook the dish named in the question but are missing things. " +
    "Work out what can stand in from what they actually have, and say what the " +
    "swap costs in taste or texture. Be honest when a swap won't really work.",
  rescue:
    "Focus only on what is closest to expiry. Propose dishes that use those up " +
    "first, and say plainly if something is past saving and should be binned.",
};

function systemPrompt(prefs: KitchenRequest["preferences"]): string {
  return [
    "You are a practical home-cooking assistant for a UK kitchen. You suggest",
    "food someone will actually cook on a weeknight, not restaurant projects.",
    "",
    "Hard constraints — never violate these, they are dietary and equipment",
    "limits, not preferences:",
    `- Diet: ${prefs.diet}.`,
    prefs.avoid.length
      ? `- Never use, in any form or quantity: ${prefs.avoid.join(", ")}.`
      : "",
    `- The only cooking equipment available: ${prefs.equipment.join(", ")}.`,
    "  There is no deep fryer and no shallow frying. Crisping is done in an air",
    "  fryer or oven; everything else is a hob simmer, a microwave, or no cooking.",
    "  A dry tawa or pan for flatbreads is fine — that is not frying.",
    `- Nothing that takes longer than ${prefs.maxCookTimeMins} minutes end to end.`,
    "",
    "Aim for:",
    `- ${prefs.people} ${prefs.people === 1 ? "person" : "people"} per dish.`,
    prefs.proteinTargetG ? `- Around ${prefs.proteinTargetG}g protein per person per day.` : "",
    prefs.calorieTarget ? `- Around ${prefs.calorieTarget} kcal per person per day.` : "",
    `- A weekly food budget of £${prefs.weeklyBudgetGbp}, so keep dishes cheap.`,
    "  Cost estimates are per serving, in GBP, at UK budget-supermarket prices.",
    "",
    "Rules for your answer:",
    "- Use what they already have wherever you can. Every extra thing to buy is",
    "  a reason they won't cook it.",
    "- Anything close to expiry should be used first — say so in `why`.",
    "- Calories, protein and cost are estimates. Do not present them as exact,",
    "  and never invent precision you don't have.",
    "- Steps should be genuinely followable: real quantities, real timings.",
    "- If their kitchen can't support a decent answer, say so in `answer` and",
    "  return no suggestions rather than padding with things they can't cook.",
  ]
    .filter(Boolean)
    .join("\n");
}

function userPrompt(req: KitchenRequest): string {
  const pantry = req.pantry.length
    ? req.pantry
        .map((i) => {
          const expiry =
            i.daysLeft === null
              ? ""
              : i.daysLeft < 0
                ? " — ALREADY EXPIRED"
                : i.daysLeft === 0
                  ? " — use today"
                  : ` — ${i.daysLeft} days left`;
          return `- ${i.name} (${i.qty}, ${i.location})${expiry}`;
        })
        .join("\n")
    : "(nothing recorded)";

  return [
    "In the kitchen right now:",
    pantry,
    "",
    TASK_BRIEF[req.task],
    req.question ? `\nTheir words: "${req.question}"` : "",
  ].join("\n");
}

/* -------------------------------------------------------------------- main */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "AI isn't configured on this deployment." }, 503);
  }

  // 1. Who is calling? The site is sign-in only; this endpoint is too.
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Sign in to use AI Kitchen." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await anon.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Sign in to use AI Kitchen." }, 401);
  }
  const userId = userData.user.id;

  // 2. Validate the request before spending anything on it.
  let req: KitchenRequest;
  try {
    req = RequestSchema.parse(await request.json());
  } catch {
    return json({ error: "That request didn't look right." }, 400);
  }

  // 3. Meter it. Service role so the browser can't reset its own counter.
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: used, error: quotaError } = await admin.rpc("claim_ai_call", {
    p_user_id: userId,
  });
  if (quotaError) {
    console.error("quota check failed", quotaError);
    return json({ error: "Couldn't check your usage. Try again." }, 500);
  }
  if (typeof used === "number" && used > DAILY_CALL_LIMIT) {
    return json(
      { error: `That's ${DAILY_CALL_LIMIT} AI requests today — the daily cap. Try again tomorrow.` },
      429
    );
  }

  // 4. Ask Claude for structured output. `parse` validates against the schema,
  //    so a malformed answer fails here rather than in the user's browser.
  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: EFFORT as "low" | "medium" | "high",
        format: zodOutputFormat(ResponseSchema),
      },
      system: systemPrompt(req.preferences),
      messages: [{ role: "user", content: userPrompt(req) }],
    });

    if (message.stop_reason === "refusal") {
      return json({ error: "That request was declined. Try rewording it." }, 422);
    }
    if (!message.parsed_output) {
      return json({ error: "The model's answer couldn't be read. Try again." }, 502);
    }
    return json(message.parsed_output);
  } catch (e) {
    // Never surface the provider's raw error — it can echo request details.
    console.error("anthropic call failed", e);
    if (e instanceof Anthropic.RateLimitError) {
      return json({ error: "The AI is busy right now. Try again in a moment." }, 429);
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return json({ error: "AI credentials are invalid on this deployment." }, 503);
    }
    return json({ error: "The AI request failed. Try again." }, 502);
  }
});
