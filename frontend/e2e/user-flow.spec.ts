import { test, expect } from "@playwright/test";

const unique = `e2e-${Date.now()}`;
const orgName = `Test Org ${unique}`;
const orgSlug = `test-org-${unique}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
const userEmail = `user-${unique}@test.local`;
const userPassword = "TestPass123";
const userFullName = "E2E User";

test.describe("User flow (register, dashboard, main pages)", () => {
  test("landing page loads and has Get Started", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /get started|sign in/i })).toBeVisible();
    await expect(page.getByText(/ChangeSignal AI/i).first()).toBeVisible();
  });

  test("login page has Sign In and Sign Up tabs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
  });

  test("register new organization and reach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.getByLabel(/organization name/i).fill(orgName);
    await page.getByLabel(/organization slug/i).fill(orgSlug);
    await page.getByLabel(/full name/i).fill(userFullName);
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/intelligence dashboard|dashboard/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("dashboard loads for logged-in user", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await expect(page.getByText(/intelligence dashboard|dashboard/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("navigate to Competitors page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /competitors/i }).first().click();
    await expect(page).toHaveURL(/\/competitors/);
    await expect(page.getByText(/competitors|add competitor/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Monitoring page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /monitoring/i }).first().click();
    await expect(page).toHaveURL(/\/monitoring/);
    await expect(page.getByText(/monitoring|monitored pages/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Changes page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /changes/i }).first().click();
    await expect(page).toHaveURL(/\/changes/);
    await expect(page.getByText(/changes|detected/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Analytics page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /analytics/i }).first().click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByText(/analytics|insights|trends/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Settings page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /settings/i }).first().click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText(/settings|profile|notification/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Subscription page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /subscription/i }).first().click();
    await expect(page).toHaveURL(/\/subscription/);
    await expect(page.getByText(/subscription|plan|trial/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("logout works", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(userEmail);
    await page.getByPlaceholder("••••••••").fill(userPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
