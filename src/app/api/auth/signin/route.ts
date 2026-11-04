import { NextResponse } from "next/server";
import { createSession, sessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientRateLimitKey, isRateLimited } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (await isRateLimited(clientRateLimitKey(request, "signin"), 20, 15 * 60)) {
      return NextResponse.json({ error: "Too many sign-in attempts. Please try again later." }, { status: 429 });
    }
    const cleanEmail = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role as "student" | "admin", campusName: user.campusName };
    const response = NextResponse.json({ user: safeUser });
    response.cookies.set(sessionCookie(await createSession(safeUser)));
    return response;
  } catch (error) {
    console.error("Signin failed", error);
    return NextResponse.json({ error: "Unable to sign in. Check your Neon DATABASE_URL." }, { status: 500 });
  }
}
