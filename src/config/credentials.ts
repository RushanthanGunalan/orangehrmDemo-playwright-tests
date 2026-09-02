/**
 * Test-account credentials, read from .env.
 *
 * Unlike a real internal app, OrangeHRM's public demo login (`Admin` /
 * `admin123`) is intentionally published by OrangeHRM itself for anyone to
 * use - see https://opensource-demo.orangehrmlive.com/. It's not actually a
 * secret, so these getters fall back to that well-known default instead of
 * throwing when .env is missing - keeps "clone and run" working out of the
 * box for a portfolio project, while still letting anyone point the suite
 * at a different OrangeHRM instance via .env without touching source.
 */
export type AdminCredentials = {
  username: string;
  password: string;
};

export function getAdminCredentials(): AdminCredentials {
  return {
    username: process.env.ADMIN_USERNAME || "Admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
}
