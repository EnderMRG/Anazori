import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type ResolutionMode = "ai" | "manual";
type TokenPayload = { complaintId: string; evidenceHash: string; expiresAt: number; mode: ResolutionMode };

function signingSecret() {
  const value = process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-only-secret-change-me");
  if (!value) throw new Error("AUTH_SECRET must be configured to sign resolution verification.");
  return value;
}

function evidenceHash(image: string) {
  return createHash("sha256").update(image).digest("hex");
}

export function createResolutionToken(complaintId: string, image: string, mode: ResolutionMode) {
  const payload: TokenPayload = {
    complaintId,
    evidenceHash: evidenceHash(image),
    expiresAt: Date.now() + 5 * 60_000,
    mode,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyResolutionToken(token: string, complaintId: string, image: string) {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const expectedSignature = createHmac("sha256", signingSecret()).update(encoded).digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    if (payload.complaintId !== complaintId || payload.evidenceHash !== evidenceHash(image) || payload.expiresAt <= Date.now()) return null;
    if (payload.mode !== "ai" && payload.mode !== "manual") return null;
    return payload.mode;
  } catch {
    return null;
  }
}
