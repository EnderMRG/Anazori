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
    const {
      name,
      email,
      password,
      role = "student",
      campusName = "",
      campusCity = "",
      institutionType = "",
      aisheCode = "",
      websiteUrl = "",
      designation = "",
      department = "",
      staffId = "",
      phone = "",
      adminSignupCode = "",
      authorizedAffirmation = false,
    } = await request.json();

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanName.length < 2) return NextResponse.json({ error: "Please enter your full legal name." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (String(password || "").length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (role !== "student" && role !== "admin") return NextResponse.json({ error: "Choose a valid account type." }, { status: 400 });

    const cleanCampusName = String(campusName || "").trim();
    if (cleanCampusName.length < 3) return NextResponse.json({ error: "Please enter a valid campus or university name." }, { status: 400 });

    let institutionalDesc = "A connected space for the campus community.";
    let finalCity = "Campus network";

    if (role === "admin") {
      const cleanDesignation = String(designation || "").trim();
      const cleanStaffId = String(staffId || "").trim();
      const cleanDepartment = String(department || "").trim();
      const cleanCity = String(campusCity || "").trim();
      const cleanWebsite = String(websiteUrl || "").trim();
      const cleanAishe = String(aisheCode || "").trim().toUpperCase();
      const cleanType = String(institutionType || "").trim();

      if (cleanDesignation.length < 2) {
        return NextResponse.json({ error: "Please provide your official administrative designation / title." }, { status: 400 });
      }
      if (cleanStaffId.length < 2) {
        return NextResponse.json({ error: "Please provide your official staff / employee ID number." }, { status: 400 });
      }
      if (cleanDepartment.length < 2) {
        return NextResponse.json({ error: "Please specify your administrative wing or department." }, { status: 400 });
      }
      if (cleanCity.length < 2) {
        return NextResponse.json({ error: "Please enter the campus city and state location." }, { status: 400 });
      }
      if (!cleanWebsite || !cleanWebsite.includes(".")) {
        return NextResponse.json({ error: "Please enter a valid official university web portal (e.g. https://dibru.ac.in)." }, { status: 400 });
      }
      if (!authorizedAffirmation) {
        return NextResponse.json({ error: "You must certify that you are an authorized official representative of this institution." }, { status: 400 });
      }

      const expectedCode = process.env.ADMIN_SIGNUP_CODE;
      if (!expectedCode && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Administrator signup is not configured. Contact the deployment owner." }, { status: 503 });
      }
      if (expectedCode) {
        const supplied = Buffer.from(String(adminSignupCode || "").trim());
        const expected = Buffer.from(expectedCode.trim());
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
          return NextResponse.json({ error: "Invalid campus administrative authorization key. Contact IT administration or use demo key: 221232." }, { status: 403 });
        }
      }

      finalCity = cleanCity;
      institutionalDesc = [
        cleanType || "Accredited University",
        cleanCity ? `Campus: ${cleanCity}` : "",
        cleanAishe ? `AISHE: ${cleanAishe}` : "",
        cleanWebsite ? `Portal: ${cleanWebsite}` : "",
        `Verified Administrative Contact: ${cleanName} (${cleanDesignation}, ${cleanDepartment} · ID: ${cleanStaffId}).`,
      ].filter(Boolean).join(" · ");
    } else {
      // Student signup: verify campus is already registered
      const existingCampus = await prisma.campus.findUnique({ where: { name: cleanCampusName } });
      if (!existingCampus) {
        return NextResponse.json({ error: "That campus is not registered yet. Ask a campus administrator to register it first." }, { status: 400 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    if (role === "admin") {
      await prisma.campus.upsert({
        where: { name: cleanCampusName },
        update: {
          city: finalCity,
          description: institutionalDesc,
        },
        create: {
          name: cleanCampusName,
          city: finalCity,
          description: institutionalDesc,
          accent: "#2b8f85",
        },
      });
    }

    const formattedUserName = role === "admin" && designation ? `${cleanName} · ${String(designation).trim()}` : cleanName;

    const created = await prisma.user.create({
      data: {
        name: formattedUserName,
        email: cleanEmail,
        passwordHash: await bcrypt.hash(String(password), 12),
        role,
        campusName: cleanCampusName,
      },
    });

    const user = { id: created.id, name: created.name, email: created.email, role: created.role as "student" | "admin", campusName: created.campusName };
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(sessionCookie(await createSession(user)));
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Unable to create your account. Please try again." }, { status: 500 });
  }
}
