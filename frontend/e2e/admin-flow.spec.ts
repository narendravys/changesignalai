import { test, expect } from "@playwright/test";

const unique = `admin-${Date.now()}`;
const orgName = `Admin Org ${unique}`;
const orgSlug = `admin-org-${unique}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
const adminEmail = `admin-${unique}@test.local`;
const adminPassword = "AdminPass123";
const adminFullName = "E2E Admin";

test.describe("Admin flow (first user is org admin)", () => {
  test("register org as admin then see Admin in nav", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.getByLabel(/organization name/i).fill(orgName);
    await page.getByLabel(/organization slug/i).fill(orgSlug);
    await page.getByLabel(/full name/i).fill(adminFullName);
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/intelligence dashboard|dashboard/i).first()).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole("link", { name: /admin/i })).toBeVisible({ timeout: 5000 });
  });

  test("admin dashboard overview loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByRole("link", { name: /admin/i }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/admin dashboard/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/overview|total users|revenue/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin Users tab loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Users" }).click();
    await expect(page.getByText(/search users|user|organization|status|subscription/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin Feedback tab loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Feedback" }).click();
    await expect(page.getByText(/feedback|no feedback yet|user|subject|category|status/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin Activity tab loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByText(/system activity log|activity/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin Configuration tab loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(adminEmail);
    await page.getByPlaceholder("••••••••").fill(adminPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Configuration" }).click();
    await expect(page.getByText(/subscription configuration|trial|monthly price|max competitors/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin URL redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
