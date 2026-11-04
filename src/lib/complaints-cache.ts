type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function getCachedComplaintsList<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedComplaintsList(key: string, data: unknown, ttlSeconds = 15): void {
  // Keep cache size bounded
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expiresAt <= now) cache.delete(k);
    }
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateComplaintsCache(campusName?: string): void {
  if (campusName) {
    for (const key of cache.keys()) {
      if (key.includes(campusName)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

