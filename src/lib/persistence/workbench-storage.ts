import { z } from "zod";

const FLOWTALK_WORKBENCH_STORAGE_KEY = "flowtalk/workbench/v1";

const persistedWorkbenchStateSchema = z.object({
  processText: z.string(),
  refinementText: z.string(),
  source: z.string(),
  lastValidSource: z.string(),
  hasGeneratedFlow: z.boolean(),
  savedAt: z.string(),
});

export type PersistedWorkbenchState = z.infer<
  typeof persistedWorkbenchStateSchema
>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadPersistedWorkbenchState() {
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(FLOWTALK_WORKBENCH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return persistedWorkbenchStateSchema.parse(JSON.parse(rawValue));
  } catch {
    window.localStorage.removeItem(FLOWTALK_WORKBENCH_STORAGE_KEY);
    return null;
  }
}

export function savePersistedWorkbenchState(state: PersistedWorkbenchState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    FLOWTALK_WORKBENCH_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export function clearPersistedWorkbenchState() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(FLOWTALK_WORKBENCH_STORAGE_KEY);
}
