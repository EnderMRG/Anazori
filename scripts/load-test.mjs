const baseUrl = process.env.LOAD_TEST_BASE_URL;
const email = process.env.LOAD_TEST_EMAIL;
const password = process.env.LOAD_TEST_PASSWORD;

if (!baseUrl || !email || !password) {
  throw new Error("Set LOAD_TEST_BASE_URL, LOAD_TEST_EMAIL, and LOAD_TEST_PASSWORD.");
}

const parsedBaseUrl = new URL(baseUrl);
if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
  throw new Error("LOAD_TEST_BASE_URL must use HTTP or HTTPS.");
}

const requestedConcurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 100);
const concurrency = Number.isFinite(requestedConcurrency)
  ? Math.min(500, Math.max(1, Math.floor(requestedConcurrency)))
  : 100;

const signIn = await fetch(new URL("/api/auth/signin", parsedBaseUrl), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
  signal: AbortSignal.timeout(15_000),
});

if (!signIn.ok) {
  throw new Error(`Load-test sign-in failed with HTTP ${signIn.status}.`);
}

const cookie = signIn.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("The sign-in response did not include a session cookie.");

const results = await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
  const path = index % 5 === 0 ? "/api/notifications" : "/api/complaints?limit=50";
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, parsedBaseUrl), {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(30_000),
    });
    await response.arrayBuffer();
    return { status: response.status, durationMs: performance.now() - startedAt };
  } catch {
    return { status: 0, durationMs: performance.now() - startedAt };
  }
}));

const durations = results.map((result) => result.durationMs).sort((a, b) => a - b);
const failures = results.filter((result) => result.status < 200 || result.status >= 300).length;
const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1);
const statusCounts = new Map();
for (const result of results) statusCounts.set(result.status, (statusCounts.get(result.status) || 0) + 1);

console.log(`Concurrent users: ${concurrency}`);
console.log(`Requests: ${results.length}; failures: ${failures} (${((failures / results.length) * 100).toFixed(2)}%)`);
console.log(`Latency p95: ${durations[p95Index].toFixed(0)} ms`);
console.log(`HTTP status counts: ${[...statusCounts].map(([status, count]) => `${status}: ${count}`).join(", ")}`);

if (failures > 0) process.exitCode = 1;
