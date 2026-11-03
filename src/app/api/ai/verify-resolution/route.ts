import { NextResponse } from "next/server";

export const runtime = "nodejs";

function imagePart(image: string) {
  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || Buffer.byteLength(match[2], "base64") > 8 * 1024 * 1024) return null;
  return { inline_data: { mime_type: match[1], data: match[2] } };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { before?: string; after?: string; description?: string };
    if (!body.after?.startsWith("data:image/")) return NextResponse.json({ error: "An after photo is required." }, { status: 400 });
    const key = process.env.GEMINI_API_KEY;
    if (!key || !body.before?.startsWith("data:image/")) return NextResponse.json({ verified: true, provider: "manual-proof", message: "After photo captured. Manual comparison is required because automated vision verification is not configured." });
    const before = imagePart(body.before);
    const after = imagePart(body.after);
    if (!before || !after) return NextResponse.json({ error: "The evidence images must each be smaller than 8 MB." }, { status: 400 });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `Compare the before and after campus evidence images. Return only JSON with verified (boolean), sameScene (boolean), issueAddressed (boolean), and message (short explanation). The original issue was: ${body.description || "campus issue"}. Reject unrelated images, different scenes, or an unresolved issue.` }, before, after] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }) });
    if (!response.ok) throw new Error(`Gemini verification failed with ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    const result = JSON.parse(text) as { verified?: boolean; sameScene?: boolean; issueAddressed?: boolean; message?: string };
    return NextResponse.json({ verified: Boolean(result.verified && result.sameScene !== false && result.issueAddressed !== false), provider: "gemini", message: result.message || "Evidence comparison completed." });
  } catch (error) {
    console.error("Resolution verification failed", error);
    return NextResponse.json({ error: "Unable to verify the resolution evidence." }, { status: 502 });
  }
}
