import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { isEvidenceDataUrl } from "@/lib/evidence";
import { analyseIssue, analyseIssueWithProvider, improveBilingualSummaries, type IssueAnalysis } from "@/lib/issue-analysis";
import { getSharedCache, isGeminiRateLimited, setSharedCache } from "@/lib/redis";

export const runtime = "nodejs";

const cache = new Map<string, { expires: number; result: IssueAnalysis }>();

function requestKey(input: { title: string; description: string; location: string; image?: string }) {
  return createHash("sha256").update(`${input.title}\n${input.description}\n${input.location}\n${input.image || ""}`).digest("hex");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json() as { title?: string; description?: string; location?: string; image?: string };
    const image = typeof body.image === "string" ? body.image : undefined;
    if (image && !isEvidenceDataUrl(image)) return NextResponse.json({ error: "Evidence must be a supported image smaller than 3 MB." }, { status: 400 });
    const input = { title: String(body.title || "").trim().slice(0, 180), description: String(body.description || "").trim().slice(0, 4000), location: String(body.location || "").trim().slice(0, 180), image };
    if (!input.title || !input.description || !input.location) return NextResponse.json({ error: "Title, description and location are required." }, { status: 400 });
    const fallback = analyseIssue({ ...input, image: input.image ? "uploaded evidence" : undefined });
    const key = requestKey(input);
    const cached = cache.get(key);
    const sharedCached = await getSharedCache<IssueAnalysis>(key);
    if (sharedCached) return NextResponse.json({ ...sharedCached, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", provider: "cache", translationProvider: "cached" });
    if (cached && cached.expires > Date.now()) return NextResponse.json({ ...cached.result, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", provider: "cache", translationProvider: "cached" });
    if (process.env.GEMINI_API_KEY && await isGeminiRateLimited()) return NextResponse.json({ ...fallback, model: "CivicSense local triage", provider: "rate-limited-fallback", warning: "The shared Gemini request limit was reached; local triage was used." });
    const analysisInput = { ...input, image };
    try {
      const result = await analyseIssueWithProvider(analysisInput, analyseIssue(analysisInput));
      if (result.provider === "gemini") {
        const now = Date.now();
        for (const [cacheKey, entry] of cache) {
          if (entry.expires <= now) cache.delete(cacheKey);
        }
        while (cache.size >= 1000) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey === undefined) break;
          cache.delete(oldestKey);
        }
        cache.set(key, { expires: Date.now() + 10 * 60_000, result: result.result });
        await setSharedCache(key, result.result, 10 * 60);
        return NextResponse.json({ ...result.result, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", provider: "gemini", translationProvider: "IndicTrans2" });
      }
    } catch (error) {
      console.error("Gemini analysis unavailable; using local triage.", error);
    }
    const localizedFallback = await improveBilingualSummaries(analysisInput, analyseIssue(analysisInput));
    return NextResponse.json({ ...localizedFallback, model: "CivicSense local triage", provider: "local", translationProvider: "IndicTrans2" });
  } catch {
    return NextResponse.json({ error: "Unable to analyse this report." }, { status: 400 });
  }
}
