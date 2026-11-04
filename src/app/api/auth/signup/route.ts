import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSession, sessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientRateLimitKey, isRateLimited } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    if (await isRateLimited(clientRateLimitKey(request, "signup"), 10, 60 * 60)) {
      return NextResponse.json({ error: "Account creation limit reached. Please try again later." }, { status: 429 });
    }
    const { name, email, password, role = "student", campusName = "", adminSignupCode = "" } = await request.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanName.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (String(password || "").length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (role !== "student" && role !== "admin") return NextResponse.json({ error: "Choose a valid account type." }, { status: 400 });
    if (role === "admin") {
      const expectedCode = process.env.ADMIN_SIGNUP_CODE;
      if (!expectedCode && process.env.NODE_ENV === "production") return NextResponse.json({ error: "Administrator signup is not configured. Contact the deployment owner." }, { status: 503 });
      if (expectedCode) {
        const supplied = Buffer.from(String(adminSignupCode));
        const expected = Buffer.from(expectedCode);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Invalid administrator invitation code." }, { status: 403 });
      }
    }
    const cleanCampusName = String(campusName || "").trim();
    if (!cleanCampusName) return NextResponse.json({ error: "Select your campus before creating your account." }, { status: 400 });
    if (role === "student" && !(await prisma.campus.findUnique({ where: { name: cleanCampusName } }))) return NextResponse.json({ error: "That campus is not available yet. Ask a campus administrator to register it first." }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    if (role === "admin") await prisma.campus.upsert({ where: { name: cleanCampusName }, update: {}, create: { name: cleanCampusName } });
    const created = await prisma.user.create({
      data: { name: cleanName, email: cleanEmail, passwordHash: await bcrypt.hash(String(password), 12), role, campusName: cleanCampusName },
    });
    const user = { id: created.id, name: created.name, email: created.email, role: created.role as "student" | "admin", campusName: created.campusName };
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(sessionCookie(await createSession(user)));
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Unable to create your account. Check your Neon DATABASE_URL." }, { status: 500 });
  }
}
