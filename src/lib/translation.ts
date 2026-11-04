import { createHash } from "node:crypto";
import { getSharedCache, isRateLimited, setSharedCache } from "@/lib/redis";

type TranslationLanguage = "as" | "en";

type CachedTranslation = { expires: number; value: string };

const cache = new Map<string, CachedTranslation>();

function cacheKey(text: string, from: TranslationLanguage, to: TranslationLanguage) {
  return createHash("sha256").update(`${from}:${to}:${text}`).digest("hex");
}

export async function translateText(text: string, from: TranslationLanguage, to: TranslationLanguage) {
  const source = text.trim();
  if (!source || from === to) return source;
  const key = cacheKey(source, from, to);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const sharedCached = await getSharedCache<string>(`translation:${key}`);
  if (sharedCached) return sharedCached;
  const configuredLimit = Number(process.env.TRANSLATION_REQUESTS_PER_MINUTE || 30);
  const requestLimit = Number.isFinite(configuredLimit) ? Math.min(300, Math.max(1, Math.floor(configuredLimit))) : 30;
  if (await isRateLimited("translation-api:global", requestLimit, 60)) return null;

  const endpoint = process.env.TRANSLATION_API_URL || "https://api.dharun.dev/v1/translate";
  const params = new URLSearchParams({ from, to, text: source.slice(0, 1900) });
  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      console.error(`Translation provider returned status ${response.status}.`);
      return null;
    }
    const payload = await response.json() as { data?: { translation?: string } };
    const translation = payload.data?.translation?.trim();
    if (!translation || translation.includes("�")) return null;
    await setSharedCache(`translation:${key}`, translation, 60 * 60);
    while (cache.size >= 200) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      cache.delete(oldestKey);
    }
    cache.set(key, { expires: Date.now() + 60 * 60_000, value: translation });
    return translation;
  } catch (error) {
    console.error("Translation provider request failed.", error);
    return null;
  }
}
