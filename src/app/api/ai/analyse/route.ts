import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { analyseIssue, analyseIssueWithProvider, type IssueAnalysis } from "@/lib/issue-analysis";

export const runtime = "nodejs";

const cache = new Map<string, { expires: number; result: IssueAnalysis }>();
let windowStarted = Date.now();
let windowRequests = 0;

function requestKey(input: { title: string; description: string; location: string; image?: string }) {
  return createHash("sha256").update(`${input.title}\n${input.description}\n${input.location}\n${input.image || ""}`).digest("hex");
}

function parseModelResult(value: unknown, fallback: IssueAnalysis): IssueAnalysis {
  if (!value || typeof value !== "object") return fallback;
  const result = value as Record<string, unknown>;
  const priority = ["Critical", "High", "Medium", "Low"].includes(String(result.priority)) ? String(result.priority) as IssueAnalysis["priority"] : fallback.priority;
  const language = ["en", "as", "mixed"].includes(String(result.language)) ? String(result.language) as IssueAnalysis["language"] : fallback.language;
  return {
    ...fallback,
    category: typeof result.category === "string" ? result.category.slice(0, 80) : fallback.category,
    department: typeof result.department === "string" ? result.department.slice(0, 80) : fallback.department,
    priority,
    language,
    tags: Array.isArray(result.tags) ? result.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.startsWith("#") ? tag : `#${tag}`).slice(0, 4) : fallback.tags,
    summaryEn: typeof result.summaryEn === "string" ? result.summaryEn.slice(0, 500) : fallback.summaryEn,
    summaryAs: typeof result.summaryAs === "string" ? result.summaryAs.slice(0, 500) : fallback.summaryAs,
    justification: typeof result.justification === "string" ? result.justification.slice(0, 300) : fallback.justification,
    confidence: typeof result.confidence === "number" ? Math.max(0, Math.min(1, result.confidence)) : fallback.confidence,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string; description?: string; location?: string; image?: string };
    const input = { title: String(body.title || "").trim(), description: String(body.description || "").trim(), location: String(body.location || "").trim(), image: typeof body.image === "string" ? body.image : undefined };
    if (!input.title || !input.description || !input.location) return NextResponse.json({ error: "Title, description and location are required." }, { status: 400 });
    const fallback = analyseIssue(input);
    const key = requestKey(input);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return NextResponse.json({ ...cached.result, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", provider: "cache" });
    if (Date.now() - windowStarted >= 60_000) { windowStarted = Date.now(); windowRequests = 0; }
    const maxRequests = Math.max(1, Number(process.env.GEMINI_REQUESTS_PER_MINUTE || 8));
    if (process.env.GEMINI_API_KEY && windowRequests >= maxRequests) return NextResponse.json({ ...fallback, model: "CivicSense local triage", provider: "rate-limited-fallback", warning: "Gemini request limit reached; local triage was used." });
    try {
      if (process.env.GEMINI_API_KEY) windowRequests += 1;
      const result = await analyseIssueWithProvider(input, fallback);
      if (result.provider === "gemini") {
        cache.set(key, { expires: Date.now() + 10 * 60_000, result: result.result });
        return NextResponse.json({ ...result.result, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", provider: "gemini" });
      }
    } catch (error) {
      console.error("Gemini analysis unavailable; using local triage.", error);
    }
    return NextResponse.json({ ...fallback, model: "CivicSense local triage", provider: "local" });
  } catch {
    return NextResponse.json({ error: "Unable to analyse this report." }, { status: 400 });
  }
}
