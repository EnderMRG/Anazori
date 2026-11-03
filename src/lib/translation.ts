type TranslationLanguage = "as" | "en";

type CachedTranslation = { expires: number; value: string };

const cache = new Map<string, CachedTranslation>();
let windowStarted = Date.now();
let windowRequests = 0;

function cacheKey(text: string, from: TranslationLanguage, to: TranslationLanguage) {
  return `${from}:${to}:${text}`;
}

export async function translateText(text: string, from: TranslationLanguage, to: TranslationLanguage) {
  const source = text.trim();
  if (!source || from === to) return source;
  const key = cacheKey(source, from, to);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  if (Date.now() - windowStarted >= 60_000) {
    windowStarted = Date.now();
    windowRequests = 0;
  }
  const requestLimit = Math.max(1, Number(process.env.TRANSLATION_REQUESTS_PER_MINUTE || 30));
  if (windowRequests >= requestLimit) return null;

  const endpoint = process.env.TRANSLATION_API_URL || "https://api.dharun.dev/v1/translate";
  const params = new URLSearchParams({ from, to, text: source.slice(0, 1900) });
  windowRequests += 1;
  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: { translation?: string } };
    const translation = payload.data?.translation?.trim();
    if (!translation || translation.includes("�")) return null;
    cache.set(key, { expires: Date.now() + 60 * 60_000, value: translation });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return translation;
  } catch {
    return null;
  }
}
