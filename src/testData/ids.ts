import { faker } from "@faker-js/faker";

/**
 * The marker that proves a record was created by THIS suite.
 *
 * The public demo is shared with everyone, so cleanup may only ever delete
 * what we can PROVE is ours. Every test employee gets an Employee Id shaped:
 *
 *     QAR  +  4-char time stamp  +  3 random chars        (exactly 10 chars)
 *
 * 10 is the server's maximum (an 11-char id is rejected with a 422, verified
 * live). The time stamp lets a pre-run purge tell "left over from a dead run"
 * apart from "being used right now by a run on another machine / CI" - it
 * only touches records old enough that no live test can still own them.
 */
export const TEST_DATA_PREFIX = "QAR";

// Stamp = 5-minute units since 2025-01-01, base 36, 4 chars. 36^4 units of 5
// minutes covers ~16 years (to 2041) - revisit before then.
const EPOCH = Date.UTC(2025, 0, 1);
const UNIT_MS = 5 * 60 * 1000;

/**
 * A record is stale once its stamp is >= 3 units behind "now". Created at the
 * very end of unit U and checked at the very start of unit U+3, it is
 * already 10+ minutes old. A single test is capped at 6 minutes (see
 * playwright.config.ts), so nothing a live run still needs can be that old.
 */
export const STALE_AFTER_UNITS = 3;

const ID_PATTERN = /^QAR([0-9a-z]{4})([0-9a-z]{3})$/;
const issued = new Set<string>();

const unitsAt = (now: number) => Math.floor((now - EPOCH) / UNIT_MS);

/** A fresh, unique-in-this-process, marker-carrying Employee Id. */
export function newEmployeeId(now: number = Date.now()): string {
  const stamp = unitsAt(now).toString(36).padStart(4, "0");
  for (;;) {
    const id = `${TEST_DATA_PREFIX}${stamp}${faker.string.alphanumeric({ length: 3, casing: "lower" })}`;
    if (!issued.has(id)) {
      issued.add(id);
      return id;
    }
  }
}

/** True only for an id that has exactly the shape newEmployeeId() makes. */
export function isTestEmployeeId(id: string | null | undefined): id is string {
  return ID_PATTERN.test(id ?? "");
}

/** How many 5-minute units old a marker id is, or null if it isn't one of ours. */
export function ageInUnits(
  id: string | null | undefined,
  now: number = Date.now(),
): number | null {
  const match = id?.match(ID_PATTERN);
  if (!match) return null;
  return unitsAt(now) - parseInt(match[1], 36);
}

/**
 * Ours AND old enough to be safely abandoned. A stamp from the FUTURE gives a
 * negative age and is never stale: either a clock skew or not really ours -
 * both reasons to leave it alone.
 */
export function isStaleTestEmployeeId(
  id: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const age = ageInUnits(id, now);
  return age !== null && age >= STALE_AFTER_UNITS;
}
