import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "civicsense_session";

export type SessionUser = { id: string; name: string; email: string; role: string; campusName: string };

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");
}

export async function createSession(user: SessionUser) {
  return new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.email || !payload.name) return null;
    return { id: String(payload.id), name: String(payload.name), email: String(payload.email), role: String(payload.role || "student"), campusName: String(payload.campusName || "Dibrugarh University") };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
}
