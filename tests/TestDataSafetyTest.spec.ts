import { test, expect } from "@playwright/test";
import type { EmployeeSummary, NewEmployee } from "../src/api/OrangeHrmApi";
import {
  STALE_AFTER_UNITS,
  isStaleTestEmployeeId,
  isTestEmployeeId,
  newEmployeeId,
} from "../src/testData/ids";
import { DEFAULT_PURGE_CAP, purgeStaleTestData } from "../src/testData/purge";
import { TestData, type TestDataStore } from "../src/testData/TestData";

/**
 * Tests for the code that decides what the suite is allowed to DELETE on a
 * shared public demo. No browser, no network, nothing real to harm: they run
 * against an in-memory fake. They import `test` from Playwright directly (not
 * ./fixtures), so they don't even log in to the demo.
 *
 * If one of these fails, treat the cleanup as unsafe until it's understood.
 */

const UNIT_MS = 5 * 60 * 1000; // one stamp unit - mirrors ids.ts
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

/** An in-memory stand-in for the server: substring search, delete by number. */
class FakeStore implements TestDataStore {
  employees: EmployeeSummary[] = [];
  deleteCalls: number[][] = [];
  failDeletes = false;
  private next = 1000;

  add(employeeId: string | null, lastName = "Name"): EmployeeSummary {
    const e = { empNumber: this.next++, employeeId, firstName: "F", lastName };
    this.employees.push(e);
    return e;
  }

  async createEmployee(n: NewEmployee): Promise<EmployeeSummary> {
    return this.add(n.employeeId, n.lastName);
  }

  async findEmployees(q: string): Promise<EmployeeSummary[]> {
    // Like the real API: a CONTAINS match on id or name, not an exact one.
    return this.employees.filter((e) => (e.employeeId ?? "").includes(q) || e.lastName.includes(q));
  }

  async deleteEmployees(ids: number[]): Promise<void> {
    this.deleteCalls.push(ids);
    if (this.failDeletes) throw new Error("server said no");
    this.employees = this.employees.filter((e) => !ids.includes(e.empNumber));
  }

  ids() {
    return this.employees.map((e) => e.employeeId);
  }
}

test.describe("Test Data Safety (no browser)", () => {
  test("TC_TDS_001: A Generated Employee Id Is Valid, Recognised As Ours, And Fresh", async () => {
    let id = "";
    await test.step("Act: generate an Employee Id", async () => {
      id = newEmployeeId(NOW);
    });
    await test.step("Assert: exactly 10 chars (the server limit), ours, and not stale", async () => {
      expect(id).toHaveLength(10);
      expect(isTestEmployeeId(id)).toBe(true);
      expect(isStaleTestEmployeeId(id, NOW)).toBe(false);
    });
  });

  test("TC_TDS_002: An Id Becomes Stale Exactly At The Age Threshold, Not Before", async () => {
    const justUnder = newEmployeeId(NOW - (STALE_AFTER_UNITS - 1) * UNIT_MS);
    const atThreshold = newEmployeeId(NOW - STALE_AFTER_UNITS * UNIT_MS);
    await test.step("Assert: one unit under the threshold is NOT stale", async () => {
      expect(isStaleTestEmployeeId(justUnder, NOW)).toBe(false);
    });
    await test.step("Assert: exactly at the threshold IS stale", async () => {
      expect(isStaleTestEmployeeId(atThreshold, NOW)).toBe(true);
    });
  });

  test("TC_TDS_003: Ids That Are Not Ours Are Never Recognised", async () => {
    const notOurs = [
      "0444", "0444BdH", "", null, undefined, // ordinary / missing ids
      "QAR", "QAR123456", "QAR12345678", // wrong length
      "qar1234abc", "QAr1234abc", // wrong case of the prefix
      "QAR1234ABC", // upper-case in the suffix
      "XQAR123456", " QAR123456", // not at the start
    ];
    await test.step("Assert: none of them is treated as a test id or as stale", async () => {
      for (const id of notOurs) {
        expect(isTestEmployeeId(id), `isTestEmployeeId(${JSON.stringify(id)})`).toBe(false);
        expect(isStaleTestEmployeeId(id, NOW), `isStale(${JSON.stringify(id)})`).toBe(false);
      }
    });
  });

  test("TC_TDS_004: Generated Ids Are Unique", async () => {
    const ids = new Set<string>();
    await test.step("Act: generate 500 ids within the same time unit", async () => {
      for (let i = 0; i < 500; i++) ids.add(newEmployeeId(NOW));
    });
    await test.step("Assert: all 500 are distinct", async () => {
      expect(ids.size).toBe(500);
    });
  });

  test("TC_TDS_005: An Id Stamped In The Future Is Never Treated As Stale", async () => {
    const future = newEmployeeId(NOW + 100 * UNIT_MS);
    await test.step("Assert: it is recognised as a test id but never stale (clock skew or not ours - leave it)", async () => {
      expect(isTestEmployeeId(future)).toBe(true);
      expect(isStaleTestEmployeeId(future, NOW)).toBe(false);
    });
  });

  test("TC_TDS_006: Purge Deletes Only Stale Test Employees", async () => {
    const store = new FakeStore();
    const stale = store.add(newEmployeeId(NOW - 5 * UNIT_MS));
    const fresh = store.add(newEmployeeId(NOW));
    const someoneElses = store.add("0442");
    const lookalikeName = store.add("EMP-9", "Qarasu-QAR-Smith"); // contains QAR, but isn't ours
    const noId = store.add(null, "QARnoid");

    await test.step("Act: purge", async () => {
      const result = await purgeStaleTestData(store, { now: NOW });
      expect(result).toEqual({ deleted: 1, keptFresh: 1, refused: 0 });
    });
    await test.step("Assert: only the stale one is gone; everything else survives", async () => {
      expect(store.ids()).not.toContain(stale.employeeId);
      for (const keep of [fresh, someoneElses, lookalikeName, noId]) {
        expect(store.employees).toContainEqual(keep);
      }
    });
  });

  test("TC_TDS_007: Purge Refuses To Delete Anything When There Are Suspiciously Many Matches", async () => {
    const store = new FakeStore();
    await test.step("Arrange: more stale employees than the safety cap", async () => {
      for (let i = 0; i < DEFAULT_PURGE_CAP + 1; i++) store.add(newEmployeeId(NOW - 5 * UNIT_MS));
    });
    await test.step("Act + Assert: nothing is deleted, and the refusal is reported", async () => {
      const result = await purgeStaleTestData(store, { now: NOW });
      expect(result.deleted).toBe(0);
      expect(result.refused).toBe(DEFAULT_PURGE_CAP + 1);
      expect(store.deleteCalls).toEqual([]);
      expect(store.employees).toHaveLength(DEFAULT_PURGE_CAP + 1);
    });
  });

  test("TC_TDS_008: Cleanup Deletes Only What This Test Created", async () => {
    const store = new FakeStore();
    const data = new TestData(store);
    const mine = await data.createEmployee();
    const otherRun = store.add(newEmployeeId(NOW)); // another test's / run's employee, also marked
    const someoneElses = store.add("0442");

    await test.step("Act: clean up", async () => {
      const result = await data.cleanup();
      expect(result).toEqual({ deleted: 1, leaked: [] });
    });
    await test.step("Assert: only the employee this test created is gone", async () => {
      expect(store.ids()).not.toContain(mine.employeeId);
      expect(store.employees).toContainEqual(otherRun);
      expect(store.employees).toContainEqual(someoneElses);
    });
  });

  test("TC_TDS_009: Cleanup Is Safe When There Is Nothing To Delete, And Safe To Run Twice", async () => {
    const store = new FakeStore();
    const data = new TestData(store);
    data.employeeId(); // issued but never used - e.g. the test failed before saving
    const mine = await data.createEmployee();

    await test.step("Act: clean up twice", async () => {
      expect(await data.cleanup()).toEqual({ deleted: 1, leaked: [] });
      expect(await data.cleanup()).toEqual({ deleted: 0, leaked: [] });
    });
    await test.step("Assert: nothing left", async () => {
      expect(store.ids()).not.toContain(mine.employeeId);
    });
  });

  test("TC_TDS_010: A Failing Cleanup Never Throws, And Reports What It Could Not Remove", async () => {
    const store = new FakeStore();
    const data = new TestData(store);
    const mine = await data.createEmployee();
    store.failDeletes = true;

    await test.step("Act: clean up while every delete fails", async () => {
      const result = await data.cleanup(2);
      expect(result.deleted).toBe(0);
      expect(result.leaked).toEqual([mine.employeeId]);
    });
    await test.step("Assert: it retried, and the employee is still there for the next run's purge", async () => {
      expect(store.deleteCalls.length).toBeGreaterThan(1);
      expect(store.ids()).toContain(mine.employeeId);
    });
  });
});
