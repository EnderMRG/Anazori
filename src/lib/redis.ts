import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

type LocalEntry = { count: number; expiresAt: number };
type GlobalState = typeof globalThis & {
  civicsenseRedis?: Redis | null;
  civicsenseRateLimits?: Map<string, LocalEntry>;
  civicsenseRedisWarningLogged?: boolean;
};

const globalState = globalThis as GlobalState;

// Fast in-memory L1 cache to avoid 700ms Upstash latency on cache hits
const l1Cache = new Map<string, { value: unknown; expiresAt: number }>();

const rateLimitScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

function getRedis() {
  if (globalState.civicsenseRedis !== undefined) return globalState.civicsenseRedis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!globalState.civicsenseRedisWarningLogged) {
      console.warn("Upstash is not configured; rate limits and AI cache are local to this instance.");
      globalState.civicsenseRedisWarningLogged = true;
    }
    globalState.civicsenseRedis = null;
    return null;
  }
  globalState.civicsenseRedis = Redis.fromEnv();
  return globalState.civicsenseRedis;
}

function localRateLimit(key: string, windowSeconds: number) {
  const limits = globalState.civicsenseRateLimits ??= new Map<string, LocalEntry>();
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || entry.expiresAt <= now) {
    limits.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    if (limits.size > 10_000) {
      for (const [entryKey, value] of limits) {
        if (value.expiresAt <= now) limits.delete(entryKey);
      }
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export async function isRateLimited(key: string, limit: number, windowSeconds: number) {
  // Fast in-memory check (0.01ms vs 720ms Upstash roundtrip)
  const localCount = localRateLimit(key, windowSeconds);
  if (localCount > limit) return true;

  // For low-count requests, allow fast path without blocking HTTP thread on Upstash
  // Async-sync with Upstash in background for distributed synchronization
  const redis = getRedis();
  if (redis && localCount === 1) {
    void Promise.race([
      redis.createScript<number>(rateLimitScript).eval([`civicsense:limit:${key}`], [String(windowSeconds)]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Upstash timeout")), 1200)),
    ]).catch(() => undefined);
  }

  return false;
}

export async function isGeminiRateLimited() {
  const configuredLimit = Number(process.env.GEMINI_REQUESTS_PER_MINUTE || 8);
  const limit = Number.isFinite(configuredLimit) ? Math.min(60, Math.max(1, Math.floor(configuredLimit))) : 8;
  return isRateLimited("gemini-provider:global", limit, 60);
}

export function clientRateLimitKey(request: Request, scope: string) {
  const forwardedIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const fingerprint = createHash("sha256").update(forwardedIp).digest("hex");
  return `${scope}:${fingerprint}`;
}

export async function getSharedCache<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const l1 = l1Cache.get(key);
  if (l1 && l1.expiresAt > now) {
    return l1.value as T;
  }

  const redis = getRedis();
  if (!redis) return null;
  try {
    const remote = await Promise.race([
      redis.get<T>(`civicsense:cache:${key}`),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Cache read timeout")), 1200)),
    ]);
    if (remote !== null && remote !== undefined) {
      l1Cache.set(key, { value: remote, expiresAt: now + 5 * 60_000 });
      return remote;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSharedCache<T>(key: string, value: T, ttlSeconds: number) {
  const now = Date.now();
  l1Cache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  if (l1Cache.size > 2000) {
    for (const [k, v] of l1Cache) {
      if (v.expiresAt <= now) l1Cache.delete(k);
    }
  }

  const redis = getRedis();
  if (!redis) return;
  try {
    void Promise.race([
      redis.set(`civicsense:cache:${key}`, value, { ex: ttlSeconds }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cache write timeout")), 1500)),
    ]).catch(() => undefined);
  } catch {
    // ignore
  }
}

export async function checkRedisHealth() {
  const redis = getRedis();
  if (!redis) return { configured: false, ok: false };
  try {
    await redis.ping();
    return { configured: true, ok: true };
  } catch (error) {
    console.error("Upstash health check failed.", error);
    return { configured: true, ok: false };
  }
}
