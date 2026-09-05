import { getRecipe } from "@/data/recipes";
import type {
  MealPlan,
  MealPrepPlan,
  PrepBatchTask,
  PrepTimelineEntry,
} from "@/lib/types";
import { DAY_SHORT, SLOT_LABELS } from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * Groups the week's batchable components (rice, dal, ragù…) into one prep
 * session and lays them out on a timeline where active work on one component
 * overlaps another's passive simmer/roast time.
 */
export function generateMealPrepSchedule(plan: MealPlan): MealPrepPlan {
  const grouped = new Map<string, { active: number[]; passive: number[]; feeds: string[] }>();

  for (const meal of plan.meals) {
    if (meal.isLeftover) continue;
    const recipe = getRecipe(meal.recipeId);
    if (!recipe.components) continue;
    const label = `${DAY_SHORT[meal.day]} ${SLOT_LABELS[meal.slot].toLowerCase()} — ${recipe.name}`;
    for (const component of recipe.components) {
      const entry = grouped.get(component.name) ?? { active: [], passive: [], feeds: [] };
      entry.active.push(component.activeMins);
      entry.passive.push(component.passiveMins);
      entry.feeds.push(label);
      grouped.set(component.name, entry);
    }
  }

  const tasks: PrepBatchTask[] = [...grouped.entries()].map(([name, data]) => ({
    id: uid("prep"),
    component: name,
    // Batching several portions adds a little active time, not a multiple of it.
    activeMins: Math.max(...data.active) + Math.max(0, data.feeds.length - 1) * 2,
    passiveMins: Math.max(...data.passive),
    feeds: data.feeds,
  }));

  // Start long passive tasks first so their simmer time absorbs later active work.
  tasks.sort((a, b) => b.passiveMins - a.passiveMins || b.feeds.length - a.feeds.length);

  const timeline: PrepTimelineEntry[] = [];
  let clock = 0;
  let overallEnd = 0;

  for (const task of tasks) {
    const activeEnd = clock + task.activeMins;
    timeline.push({
      startMin: clock,
      endMin: activeEnd,
      label: task.component,
      kind: "active",
    });
    if (task.passiveMins > 0) {
      timeline.push({
        startMin: activeEnd,
        endMin: activeEnd + task.passiveMins,
        label: `${task.component} — unattended`,
        kind: "passive",
      });
    }
    overallEnd = Math.max(overallEnd, activeEnd + task.passiveMins);
    clock = activeEnd;
  }
  overallEnd = Math.max(overallEnd, clock);

  const activeMins = tasks.reduce((sum, t) => sum + t.activeMins, 0);
  // Unattended simmer/roast time — it overlaps active work, so it isn't
  // simply (total − active).
  const passiveMins = tasks.reduce((sum, t) => sum + t.passiveMins, 0);

  return {
    totalMins: overallEnd,
    activeMins,
    passiveMins,
    tasks,
    timeline,
  };
}
