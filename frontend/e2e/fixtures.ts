import { test as base } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const API_URL = process.env.PLAYWRIGHT_API_URL || "http://localhost:8001";

export const test = base.extend<{
  apiUrl: string;
  baseUrl: string;
}>({
  baseUrl: async ({}, use) => {
    await use(BASE_URL);
  },
  apiUrl: async ({}, use) => {
    await use(API_URL);
  },
});

export { expect } from "@playwright/test";
