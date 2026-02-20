const apiUrl = process.env.PLAYWRIGHT_API_URL || "http://localhost:8001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function globalSetup() {
  try {
    const res = await fetch(`${apiUrl}/health`);
    if (!res.ok) {
      throw new Error(`API health returned ${res.status}`);
    }
  } catch (e) {
    console.error("\n[E2E] Backend API is not reachable at " + apiUrl);
    console.error("       Start the stack first: docker compose up -d");
    console.error("       Then run: npm run test:e2e\n");
    throw e;
  }
  try {
    const res = await fetch(baseURL);
    if (res.status !== 200 && res.status !== 304) {
      throw new Error(`Frontend returned ${res.status}`);
    }
  } catch (e) {
    console.error("\n[E2E] Frontend is not reachable at " + baseURL);
    console.error("       Start the stack: docker compose up -d");
    console.error("       Or run the frontend: npm run dev\n");
    throw e;
  }
}

export default globalSetup;
