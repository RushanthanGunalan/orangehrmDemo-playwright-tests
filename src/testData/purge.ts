import type { EmployeeSummary } from "../api/OrangeHrmApi";
import {
  TEST_DATA_PREFIX,
  isStaleTestEmployeeId,
  isTestEmployeeId,
} from "./ids";

/** The two API calls cleanup needs - a seam so the purge logic can be tested
 * against a fake, with no network and nothing real to delete. */
export interface EmployeeStore {
  findEmployees(nameOrId: string): Promise<EmployeeSummary[]>;
  deleteEmployees(empNumbers: number[]): Promise<void>;
}

export type PurgeResult = {
  /** Stale test employees deleted. */
  deleted: number;
  /** Ours, but too recent to touch - possibly in use by a run happening right now. */
  keptFresh: number;
  /** Stale candidates found but NOT deleted because there were suspiciously many. */
  refused: number;
};

/** More stale matches than this means the pattern is probably wrong. */
export const DEFAULT_PURGE_CAP = 100;

/**
 * Deletes employees left behind by earlier runs (a crashed worker, a failed
 * teardown, a Ctrl-C). Three independent guards, because this deletes things
 * on a SHARED server:
 *
 *   1. The server-side search is only a substring match, so it also returns
 *      other people's records that merely contain "QAR" - every hit is
 *      re-checked against the exact id pattern and anything else is ignored.
 *   2. Only records old enough that no live run can own them are deleted.
 *   3. If more than `cap` qualify, delete NOTHING and report it: a result that
 *      big means something is wrong with the match, not that we really made
 *      that much garbage.
 */
export async function purgeStaleTestData(
  store: EmployeeStore,
  options: { now?: number; cap?: number } = {},
): Promise<PurgeResult> {
  const now = options.now ?? Date.now();
  const cap = options.cap ?? DEFAULT_PURGE_CAP;

  const ours = (await store.findEmployees(TEST_DATA_PREFIX)).filter((e) =>
    isTestEmployeeId(e.employeeId),
  );
  const stale = ours.filter((e) => isStaleTestEmployeeId(e.employeeId, now));
  const keptFresh = ours.length - stale.length;

  if (stale.length > cap) {
    return { deleted: 0, keptFresh, refused: stale.length };
  }
  if (stale.length > 0) {
    await store.deleteEmployees(stale.map((e) => e.empNumber));
  }
  return { deleted: stale.length, keptFresh, refused: 0 };
}
