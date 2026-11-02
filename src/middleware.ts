import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const sessionCookie = "civicsense_session";

async function getSessionRole(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.role === "string" ? payload.role : "student";
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const role = await getSessionRole(request);
  const pathname = request.nextUrl.pathname;

  if (!role) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/admin" && role !== "admin") return NextResponse.redirect(new URL("/dashboard", request.url));
  if (pathname === "/dashboard" && role === "admin") return NextResponse.redirect(new URL("/admin", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/admin"],
};
