import { NextResponse } from "next/server";
import { analyseIssue, analyseIssueWithProvider, type IssueAnalysis } from "@/lib/issue-analysis";

export const runtime = "nodejs";

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
    try {
      const result = await analyseIssueWithProvider(input, fallback);
      return NextResponse.json({ ...result.result, model: result.provider === "gemini" ? process.env.GEMINI_MODEL || "gemini-2.0-flash" : "CivicSense local triage", provider: result.provider });
    } catch (error) {
      console.error("Gemini analysis unavailable; using local triage.", error);
    }
    return NextResponse.json({ ...fallback, model: "CivicSense local triage", provider: "local" });
  } catch {
    return NextResponse.json({ error: "Unable to analyse this report." }, { status: 400 });
  }
}
