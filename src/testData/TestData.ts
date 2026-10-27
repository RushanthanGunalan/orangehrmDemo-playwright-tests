import { faker } from "@faker-js/faker";
import type {
  EmployeeSummary,
  NewEmployee,
  NewSystemUser,
  SystemUserSummary,
} from "../api/OrangeHrmApi";
import { isTestEmployeeId, newEmployeeId } from "./ids";
import type { EmployeeStore } from "./purge";

export interface TestDataStore extends EmployeeStore {
  createEmployee(employee: NewEmployee): Promise<EmployeeSummary>;
}

/** Optional on purpose: the offline tests' fake stores only need employees. */
export interface UserStore {
  createEssUser(user: NewSystemUser): Promise<SystemUserSummary>;
}

export type EmployeeName = {
  firstName: string;
  middleName: string;
  lastName: string;
};

export type CleanupResult = {
  /** Employees found and deleted (their system users go with them). */
  deleted: number;
  /** Employee ids that could not be confirmed gone - the next run's purge gets them. */
  leaked: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Everything a single test needs for its data, plus the cleanup for it.
 * One instance per test (see tests/fixtures.ts): it remembers every Employee
 * Id it hands out and, when the test ends - passed, failed or timed out -
 * deletes whatever exists under those ids.
 *
 * Tracking IDS rather than "the things I created" is deliberate: a test that
 * fills the Add Employee form through the UI and then fails halfway never
 * learns the employee's empNumber, but the id it typed in is known, and that
 * is enough to find and delete it.
 */
export class TestData {
  private readonly employeeIds = new Set<string>();

  constructor(private readonly store: TestDataStore & Partial<UserStore>) {}

  /** A marker-carrying Employee Id, tracked for cleanup. Use it for ANY employee a test creates. */
  employeeId(): string {
    const id = newEmployeeId();
    this.employeeIds.add(id);
    return id;
  }

  /**
   * The random suffix on the last name makes it unique on a demo that holds
   * hundreds of other people's employees. Without it, a common surname
   * ("Smith") makes a search return several rows and any "exactly one
   * match" assertion - or the delete safety check - fails for no real reason.
   */
  employeeName(): EmployeeName {
    return {
      firstName: faker.person.firstName(),
      middleName: faker.person.middleName(),
      lastName: faker.person.lastName() + faker.string.alpha(4),
    };
  }

  username(): string {
    return "qar_" + faker.string.alphanumeric({ length: 8, casing: "lower" });
  }

  /**
   * The Add Employee / Add User form refuses a password with no digit
   * ("Your password must contain minimum 1 number" - verified live), and
   * faker.internet.password() has none about 30% of the time. This always
   * has one. Other rules (minimum length, character mix) are not verified.
   */
  password(): string {
    return "Aa1" + faker.string.alphanumeric(8);
  }

  /**
   * Creates an employee through the API (no UI) - for tests whose subject is
   * something ELSE and that just need an employee to exist. Tracked for
   * cleanup before the request is sent, so a half-failed call is still swept.
   */
  async createEmployee(
    name: Partial<EmployeeName> = {},
  ): Promise<EmployeeSummary> {
    const { firstName, lastName } = { ...this.employeeName(), ...name };
    return this.store.createEmployee({
      firstName,
      lastName,
      employeeId: this.employeeId(),
    });
  }

  /**
   * Creates an ESS / Enabled user for an employee THIS test created, through
   * the API - for tests that need a user to already exist (e.g. a duplicate
   * username check). It is not tracked separately: it belongs to the
   * employee, and deleting the employee in cleanup() removes it too.
   */
  async createUser(
    employee: EmployeeSummary,
    credentials: { username?: string; password?: string } = {},
  ): Promise<{ username: string; password: string }> {
    if (!this.store.createEssUser) {
      throw new Error("This store cannot create users (it has no createEssUser).");
    }
    const username = credentials.username ?? this.username();
    const password = credentials.password ?? this.password();
    await this.store.createEssUser({ username, password, empNumber: employee.empNumber });
    return { username, password };
  }

  /**
   * True if this employee still exists - for a test that deletes something
   * ELSE (a user) and must prove the employee survived. Matches on the
   * employee number, because the server's search by id is a substring match.
   */
  async employeeExists(employee: EmployeeSummary): Promise<boolean> {
    if (!employee.employeeId) return false;
    const hits = await this.store.findEmployees(employee.employeeId);
    return hits.some((e) => e.empNumber === employee.empNumber);
  }

  /**
   * Deletes every employee this test created and CONFIRMS they are gone
   * (a second look after each delete). Never throws: a cleanup problem must
   * not turn a passing test red or hide the real failure of a failing one -
   * it is reported in the result instead, and the next run's purge retries.
   */
  async cleanup(attempts = 3): Promise<CleanupResult> {
    const pending = new Set(this.employeeIds);
    let deleted = 0;

    for (let attempt = 1; attempt <= attempts && pending.size > 0; attempt++) {
      try {
        const found: EmployeeSummary[] = [];
        for (const id of pending) {
          const hits = await this.store.findEmployees(id);
          // The search is a substring match: keep only the exact id, and
          // only an id that really is one of ours.
          found.push(
            ...hits.filter((e) => e.employeeId === id && isTestEmployeeId(e.employeeId)),
          );
        }
        const stillThere = new Set(found.map((e) => e.employeeId));
        for (const id of [...pending]) {
          if (!stillThere.has(id)) pending.delete(id); // nothing under it: clean
        }
        if (found.length > 0) {
          await this.store.deleteEmployees(found.map((e) => e.empNumber));
          deleted += found.length;
        }
      } catch {
        if (attempt < attempts) await sleep(attempt * 1000);
      }
    }
    return { deleted, leaked: [...pending] };
  }
}
