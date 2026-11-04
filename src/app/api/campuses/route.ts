import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let cachedCampuses: any[] | null = null;
let cachedAt = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedCampuses && now - cachedAt < 300_000) {
      return NextResponse.json(
        { campuses: cachedCampuses },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
            "X-Cache": "HIT",
          },
        }
      );
    }

    const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });
    cachedCampuses = campuses;
    cachedAt = now;

    return NextResponse.json(
      { campuses },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
          "X-Cache": "MISS",
        },
      }
    );
  } catch (error) {
    console.error("Campus list failed", error);
    if (cachedCampuses) {
      return NextResponse.json({ campuses: cachedCampuses });
    }
    return NextResponse.json({ error: "Unable to load campuses." }, { status: 500 });
  }
}
