import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

type LocalEntry = { count: number; expiresAt: number };
type GlobalState = typeof globalThis & {
  civicsenseRedis?: Redis | null;
  civicsenseRateLimits?: Map<string, LocalEntry>;
  civicsenseRedisWarningLogged?: boolean;
};

const globalState = globalThis as GlobalState;
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
  const redis = getRedis();
  let count: number;
  if (redis) {
    try {
      count = Number(await redis.createScript<number>(rateLimitScript).eval([`civicsense:limit:${key}`], [String(windowSeconds)]));
    } catch (error) {
      console.error("Upstash rate-limit request failed; using the instance-local limiter.", error);
      count = localRateLimit(key, windowSeconds);
    }
  } else {
    count = localRateLimit(key, windowSeconds);
  }
  return count > limit;
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

export async function getSharedCache<T>(key: string) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(`civicsense:cache:${key}`);
  } catch (error) {
    console.error("Upstash cache read failed.", error);
    return null;
  }
}

export async function setSharedCache<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`civicsense:cache:${key}`, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("Upstash cache write failed.", error);
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
