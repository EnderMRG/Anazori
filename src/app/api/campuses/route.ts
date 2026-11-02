import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ campuses });
  } catch (error) {
    console.error("Campus list failed", error);
    return NextResponse.json({ error: "Unable to load campuses." }, { status: 500 });
  }
}
