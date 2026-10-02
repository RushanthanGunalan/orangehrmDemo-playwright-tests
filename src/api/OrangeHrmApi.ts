import { APIRequestContext, request } from "@playwright/test";

/**
 * A small client for the few OrangeHRM internal API calls the test-data
 * layer needs (create / find / delete employees). Used for SETUP and CLEANUP
 * only - the tests themselves still drive the UI. Going through the API for
 * those is faster, and it means a bug in one screen (say, the Add Employee
 * form) can't fail the Edit/Delete/Search/User tests that merely need an
 * employee to exist.
 *
 * It signs in with its own HTTP session instead of borrowing the browser's:
 * several tests log out or log in as a different user, which would leave a
 * shared session unable to clean up afterwards.
 *
 * Endpoints, payloads and the login handshake were verified live against the
 * public demo (see ARCHITECTURE.md §11).
 */

export type EmployeeSummary = {
  empNumber: number;
  employeeId: string | null;
  firstName: string;
  lastName: string;
};

export type NewEmployee = {
  firstName: string;
  middleName?: string;
  lastName: string;
  /** Max 10 characters - the server answers 422 above that. */
  employeeId: string;
};

export type Credentials = { username: string; password: string };

/** An HTTP answer we got but won't retry (a 4xx): the request itself is wrong. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The login page embeds its CSRF token in an HTML attribute (verified live).
const LOGIN_TOKEN = /:token="&quot;([^&]+)&quot;"/;
const PAGE_SIZE = 50;
const MAX_PAGES = 40; // hard stop so a paging bug can never loop forever
const DELETE_BATCH = 20;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OrangeHrmApi {
  private constructor(
    private session: APIRequestContext,
    private readonly origin: string,
    private readonly credentials: Credentials,
    private readonly timeout: number,
  ) {}

  static async login(
    origin: string,
    credentials: Credentials,
    timeout: number,
  ): Promise<OrangeHrmApi> {
    const session = await OrangeHrmApi.openSession(origin, credentials, timeout);
    return new OrangeHrmApi(session, origin, credentials, timeout);
  }

  private static async openSession(
    origin: string,
    credentials: Credentials,
    timeout: number,
  ): Promise<APIRequestContext> {
    const session = await request.newContext({ baseURL: origin, timeout });
    try {
      const loginPage = await session.get("/web/index.php/auth/login");
      const token = (await loginPage.text()).match(LOGIN_TOKEN)?.[1];
      if (!token) {
        throw new Error(
          "Could not find the login CSRF token - has the login page markup changed?",
        );
      }
      const res = await session.post("/web/index.php/auth/validate", {
        form: { _token: token, ...credentials },
        maxRedirects: 0,
      });
      const location = res.headers()["location"] ?? "";
      if (res.status() !== 302 || location.includes("/auth/login")) {
        throw new Error(
          `API login failed (HTTP ${res.status()} -> ${location || "no redirect"})`,
        );
      }
      return session;
    } catch (error) {
      await session.dispose();
      throw error;
    }
  }

  /**
   * One place for retry policy: network errors and 5xx are retried with a
   * short back-off (the shared demo has slow spells); an expired session is
   * re-established once; any other 4xx is a real error and surfaces at once.
   */
  private async call<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    data?: unknown,
  ): Promise<T> {
    let lastError: unknown;
    let relogged = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await this.session.fetch(path, { method, data });
        if (res.status() === 401 && !relogged) {
          relogged = true;
          await this.session.dispose();
          this.session = await OrangeHrmApi.openSession(
            this.origin,
            this.credentials,
            this.timeout,
          );
          attempt--; // re-login doesn't count against the retry budget
          continue;
        }
        if (res.status() >= 500) {
          throw new Error(`${method} ${path} -> HTTP ${res.status()}`);
        }
        if (!res.ok()) {
          throw new ApiError(res.status(), `${method} ${path} -> HTTP ${res.status()}: ${await res.text()}`);
        }
        return (await res.json()) as T;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        lastError = error;
        await sleep(attempt * 1000);
      }
    }
    throw lastError;
  }

  async createEmployee(employee: NewEmployee): Promise<EmployeeSummary> {
    const body = await this.call<{ data: EmployeeSummary }>(
      "POST",
      "/web/index.php/api/v2/pim/employees",
      {
        firstName: employee.firstName,
        middleName: employee.middleName ?? "",
        lastName: employee.lastName,
        empPicture: null,
        employeeId: employee.employeeId,
      },
    );
    return body.data;
  }

  /**
   * Every employee whose name OR employee id CONTAINS `nameOrId` (verified
   * live: it is a substring match, not exact) - callers must post-filter if
   * they need an exact match. Includes terminated employees, and pages
   * through all results.
   */
  async findEmployees(nameOrId: string): Promise<EmployeeSummary[]> {
    const found: EmployeeSummary[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        model: "detailed",
        nameOrId,
        includeEmployees: "currentAndPast",
        sortField: "employee.firstName",
        sortOrder: "ASC",
      });
      const body = await this.call<{ data: EmployeeSummary[] }>(
        "GET",
        `/web/index.php/api/v2/pim/employees?${query}`,
      );
      found.push(...body.data);
      if (body.data.length < PAGE_SIZE) break;
    }
    return found;
  }

  /**
   * Deleting an employee also removes their system user (verified live), so
   * this is all cleanup needs. An employee that is already gone is fine -
   * cleanup must be safe to run twice.
   */
  async deleteEmployees(empNumbers: number[]): Promise<void> {
    for (let i = 0; i < empNumbers.length; i += DELETE_BATCH) {
      const ids = empNumbers.slice(i, i + DELETE_BATCH);
      try {
        await this.call("DELETE", "/web/index.php/api/v2/pim/employees", { ids });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    }
  }

  async dispose(): Promise<void> {
    await this.session.dispose();
  }
}
