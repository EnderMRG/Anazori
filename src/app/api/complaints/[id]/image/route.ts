import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "before";

  try {
    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [{ publicId: id }, { id }],
      },
      select: {
        imageUrl: type === "before",
        resolvedImageUrl: type === "after",
      },
    });

    if (!complaint) {
      return new NextResponse(null, { status: 404 });
    }

    const dataUrl = type === "after" ? complaint.resolvedImageUrl : complaint.imageUrl;
    if (!dataUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Handle data:image/jpeg;base64,...
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      if (dataUrl.startsWith("data:image/svg+xml")) {
        const svgContent = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;utf8,/, ""));
        return new NextResponse(svgContent, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
      return new NextResponse(null, { status: 404 });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Image fetch failed:", error);
    return new NextResponse(null, { status: 500 });
  }
}

