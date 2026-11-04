import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { isEvidenceDataUrl } from "@/lib/evidence";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/redis";
import {
  getCachedComplaintsList,
  setCachedComplaintsList,
  invalidateComplaintsCache,
} from "@/lib/complaints-cache";
import {
  analyseIssue,
  escalatedPriority,
  improveBilingualSummaries,
  type IssueAnalysis,
} from "@/lib/issue-analysis";

type ComplaintWithUser = Prisma.ComplaintGetPayload<{
  include: { user: { select: { name: true } } };
}>;

function toClientComplaint(complaint: ComplaintWithUser, includeEvidence = false) {
  const rawLat = (complaint as Record<string, unknown>).latitude;
  const rawLng = (complaint as Record<string, unknown>).longitude;
  const latitude = typeof rawLat === "number" && Number.isFinite(rawLat) ? rawLat : undefined;
  const longitude = typeof rawLng === "number" && Number.isFinite(rawLng) ? rawLng : undefined;

  let image: string | undefined = undefined;
  let resolvedImage: string | undefined = undefined;

  if (complaint.imageUrl) {
    if (complaint.imageUrl.startsWith("data:image/svg+xml") || includeEvidence) {
      image = complaint.imageUrl;
    } else {
      image = `/api/complaints/${complaint.publicId}/image?type=before`;
    }
  }

  if (complaint.resolvedImageUrl) {
    if (complaint.resolvedImageUrl.startsWith("data:image/svg+xml") || includeEvidence) {
      resolvedImage = complaint.resolvedImageUrl;
    } else {
      resolvedImage = `/api/complaints/${complaint.publicId}/image?type=after`;
    }
  }

  return {
    id: complaint.publicId,
    title: complaint.title,
    description: complaint.description,
    language: complaint.language,
    category: complaint.category,
    priority: complaint.priority,
    department: complaint.department,
    status: complaint.status,
    location: complaint.location,
    latitude,
    longitude,
    image,
    resolvedImage,
    resolutionNotes: complaint.resolutionNotes || undefined,
    tags: complaint.tags,
    upvotes: complaint.upvotes,
    masterId: complaint.masterId || undefined,
    summaryEn: complaint.summaryEn,
    summaryAs: complaint.summaryAs,
    createdAt: complaint.createdAt.toLocaleString(),
    reporter: complaint.user.name,
    campusName: complaint.campusName,
  };
}

function publicId() {
  return `CS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function validImage(value: unknown) {
  return typeof value !== "string" || value === "" || isEvidenceDataUrl(value);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  if (await isRateLimited(`complaint-list:${session.id}`, 180, 60)) {
    return NextResponse.json(
      { error: "Report list request limit reached. Please try again later." },
      { status: 429 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedLimit = Number(searchParams.get("limit") || 25);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, Math.floor(requestedLimit)))
    : 25;
  const cursor = searchParams.get("cursor");
  if (cursor && !/^[a-z0-9]+$/i.test(cursor)) {
    return NextResponse.json({ error: "Invalid page cursor." }, { status: 400 });
  }

  const search = (searchParams.get("search") || "").trim().slice(0, 120);
  const requestedStatus = searchParams.get("status");
  const status = ["Submitted", "In progress", "Resolved"].includes(String(requestedStatus))
    ? requestedStatus
    : undefined;
  const includeEvidence = searchParams.get("includeEvidence") === "true";
  const campusName = session.campusName;

  // Check in-memory L1 cache for instant response (<2ms)
  const cacheKey = `${campusName}:${limit}:${cursor || ""}:${status || ""}:${search}:${includeEvidence}`;
  const cached = getCachedComplaintsList<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    });
  }

  const where: Prisma.ComplaintWhereInput = {
    campusName,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { publicId: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const complaints = await prisma.complaint.findMany({
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      include: {
        user: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const hasMore = complaints.length > limit;
    const page = complaints.slice(0, limit);

    const result = {
      complaints: page.map((complaint) => toClientComplaint(complaint, includeEvidence)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
      endpoints: { create: "POST /api/complaints", update: "PATCH /api/complaints/:id" },
    };

    // Store in cache for 15 seconds
    setCachedComplaintsList(cacheKey, result, 15);

    return NextResponse.json(result, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch (error) {
    console.error("Failed to load complaints:", error);
    return NextResponse.json({ error: "Unable to load reports right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  if (await isRateLimited(`complaint-create:${session.id}`, 20, 60 * 60)) {
    return NextResponse.json(
      { error: "Report submission limit reached. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title || "Campus issue").trim().slice(0, 180);
    const description = String(body.description || "").trim().slice(0, 5000);
    const location = String(body.location || "Campus").trim().slice(0, 180);
    const image = typeof body.image === "string" ? body.image : "";
    const rawLat =
      typeof body.latitude === "number" ? body.latitude : body.latitude ? Number(body.latitude) : null;
    const rawLng =
      typeof body.longitude === "number"
        ? body.longitude
        : body.longitude
        ? Number(body.longitude)
        : null;
    const latitude = typeof rawLat === "number" && Number.isFinite(rawLat) ? rawLat : null;
    const longitude = typeof rawLng === "number" && Number.isFinite(rawLng) ? rawLng : null;

    if (!description || !location) {
      return NextResponse.json(
        { error: "Description and location are required." },
        { status: 400 }
      );
    }
    if (!validImage(image)) {
      return NextResponse.json(
        { error: "Evidence must be a supported image smaller than 3 MB." },
        { status: 400 }
      );
    }

    const fallback = analyseIssue({ title, description, location, image });
    let analysis: IssueAnalysis = {
      ...fallback,
      category: typeof body.category === "string" ? body.category : fallback.category,
      department: typeof body.department === "string" ? body.department : fallback.department,
      priority: ["Critical", "High", "Medium", "Low"].includes(String(body.priority))
        ? (String(body.priority) as IssueAnalysis["priority"])
        : fallback.priority,
      language: ["en", "as", "mixed"].includes(String(body.language))
        ? (String(body.language) as IssueAnalysis["language"])
        : fallback.language,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 4)
        : fallback.tags,
      summaryEn:
        typeof body.summaryEn === "string" ? body.summaryEn.slice(0, 500) : fallback.summaryEn,
      summaryAs:
        typeof body.summaryAs === "string" ? body.summaryAs.slice(0, 500) : fallback.summaryAs,
    };

    if (typeof body.summaryEn !== "string" || typeof body.summaryAs !== "string") {
      analysis = await improveBilingualSummaries({ title, description, location, image }, analysis);
    }

    const duplicateOf = typeof body.duplicateOf === "string" ? body.duplicateOf.trim() : "";
    const master = duplicateOf
      ? await prisma.complaint.findFirst({
          where: {
            publicId: duplicateOf,
            campusName: session.campusName,
            status: { not: "Resolved" },
            masterId: null,
          },
        })
      : null;

    if (duplicateOf && !master) {
      return NextResponse.json(
        { error: "That suggested report is no longer open. Please check for similar reports again." },
        { status: 409 }
      );
    }

    const complaint = await prisma.$transaction(async (tx) => {
      if (master) {
        const upvotes = master.upvotes + 1;
        const updatedMaster = await tx.complaint.update({
          where: { id: master.id },
          data: {
            upvotes,
            priority: escalatedPriority(upvotes, master.priority as IssueAnalysis["priority"]),
          },
        });
        await tx.complaint.create({
          data: {
            publicId: publicId(),
            userId: session.id,
            campusName: session.campusName,
            title,
            description,
            language: analysis.language,
            category: analysis.category,
            priority: analysis.priority,
            department: analysis.department,
            status: "Submitted",
            location,
            latitude,
            longitude,
            imageUrl: image || null,
            summaryEn: analysis.summaryEn,
            summaryAs: analysis.summaryAs,
            tags: analysis.tags,
            upvotes: 0,
            masterId: updatedMaster.id,
          },
        });
        await tx.notification.create({
          data: {
            userId: master.userId,
            title: "Another student reported this issue",
            body: `Your report ${master.publicId} now has ${upvotes} affected students.`,
            complaintId: master.id,
          },
        });
        return tx.complaint.findUniqueOrThrow({
          where: { id: master.id },
          include: { user: { select: { name: true } } },
        });
      }
      return tx.complaint.create({
        data: {
          publicId: publicId(),
          userId: session.id,
          campusName: session.campusName,
          title,
          description,
          language: analysis.language,
          category: analysis.category,
          priority: analysis.priority,
          department: analysis.department,
          status: "Submitted",
          location,
          latitude,
          longitude,
          imageUrl: image || null,
          summaryEn: analysis.summaryEn,
          summaryAs: analysis.summaryAs,
          tags: analysis.tags,
          upvotes: 1,
        },
        include: { user: { select: { name: true } } },
      });
    });

    // Invalidate list cache so user sees new complaint immediately
    invalidateComplaintsCache(session.campusName);

    return NextResponse.json(
      {
        complaint: toClientComplaint(complaint, false),
        clustered: Boolean(master),
        masterId: master?.publicId || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Complaint creation failed", error);
    return NextResponse.json({ error: "Unable to save the report." }, { status: 500 });
  }
}
