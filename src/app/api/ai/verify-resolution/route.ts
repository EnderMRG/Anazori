import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isEvidenceDataUrl } from "@/lib/evidence";
import { prisma } from "@/lib/prisma";
import { isGeminiRateLimited, isRateLimited } from "@/lib/redis";
import { createResolutionToken } from "@/lib/resolution-token";

export const runtime = "nodejs";

function imagePart(image: string) {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || !isEvidenceDataUrl(image)) return null;
  return { inline_data: { mime_type: match[1], data: match[2] } };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (await isRateLimited(`resolution-verification:${session.id}`, 20, 60)) {
    return NextResponse.json({ error: "Verification limit reached. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json() as { complaintId?: string; after?: string; manualReviewConfirmed?: boolean };
    const complaintId = String(body.complaintId || "").trim();
    if (!complaintId || !body.after || !isEvidenceDataUrl(body.after)) return NextResponse.json({ error: "A supported after photo smaller than 3 MB and complaint ID are required." }, { status: 400 });
    const complaint = await prisma.complaint.findUnique({ where: { publicId: complaintId } });
    if (!complaint || complaint.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found in your campus queue." }, { status: 404 });
    const before = complaint.imageUrl && isEvidenceDataUrl(complaint.imageUrl) ? imagePart(complaint.imageUrl) : null;
    const after = imagePart(body.after);
    const key = process.env.GEMINI_API_KEY;
    if (!key || !before || await isGeminiRateLimited()) return NextResponse.json({
      verified: false,
      manualReviewRequired: true,
      provider: "manual-review-required",
      ...(body.manualReviewConfirmed ? { verificationToken: createResolutionToken(complaintId, body.after, "manual") } : {}),
      message: !before
        ? "No usable before photo is available for automated comparison. An administrator must compare the evidence manually."
        : "Automated image verification is unavailable. An administrator must compare the before and after photos manually.",
    });
    if (!after) return NextResponse.json({ error: "The evidence images must each be supported and smaller than 3 MB." }, { status: 400 });
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `Compare the before and after campus evidence images. Return only JSON with verified (boolean), sameScene (boolean), issueAddressed (boolean), and message (short explanation). The original issue was: ${complaint.description}. Reject unrelated images, different scenes, or an unresolved issue.` }, before, after] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`Gemini verification failed with ${response.status}`);
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
      const result = JSON.parse(text) as { verified?: boolean; sameScene?: boolean; issueAddressed?: boolean; message?: string };
      const verified = Boolean(result.verified && result.sameScene !== false && result.issueAddressed !== false);
      return NextResponse.json({
        verified,
        provider: "gemini",
        ...(verified ? { verificationToken: createResolutionToken(complaintId, body.after, "ai") } : {}),
        message: String(result.message || "Evidence comparison completed.").slice(0, 300),
      });
    } catch (error) {
      console.error("Automated evidence verification failed; requiring manual review.", error);
      return NextResponse.json({
        verified: false,
        manualReviewRequired: true,
        provider: "manual-review-required",
        ...(body.manualReviewConfirmed ? { verificationToken: createResolutionToken(complaintId, body.after, "manual") } : {}),
        message: "Automated image verification failed. An administrator must inspect the before and after photos manually.",
      });
    }
  } catch (error) {
    console.error("Resolution verification failed", error);
    return NextResponse.json({ error: "Unable to verify the resolution evidence." }, { status: 502 });
  }
}
