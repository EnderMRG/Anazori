import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/redis";
import { escalatedPriority, type IssuePriority } from "@/lib/issue-analysis";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required to upvote." }, { status: 401 });
  }

  // Rate limit upvotes to 30 per minute per user to prevent abuse
  if (await isRateLimited(`upvote:${session.id}`, 30, 60)) {
    return NextResponse.json({ error: "Too many votes. Please wait a moment." }, { status: 429 });
  }

  let action: "add" | "remove" = "add";
  try {
    const body = await request.json();
    if (body?.action === "remove") {
      action = "remove";
    }
  } catch {
    // If no body or non-JSON, default to "add"
  }

  const existing = await prisma.complaint.findFirst({
    where: {
      OR: [{ publicId: id }, { id }],
      campusName: session.campusName,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Complaint not found in your campus." }, { status: 404 });
  }

  const nextUpvotes =
    action === "remove"
      ? Math.max(0, existing.upvotes - 1)
      : existing.upvotes + 1;

  const nextPriority =
    action === "remove"
      ? nextUpvotes >= 15
        ? "Critical"
        : nextUpvotes >= 5
        ? "High"
        : existing.priority === "Critical" || existing.priority === "High"
        ? "Medium"
        : existing.priority
      : escalatedPriority(nextUpvotes, existing.priority as IssuePriority);

  const priorityChanged = nextPriority !== existing.priority;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.complaint.update({
      where: { id: existing.id },
      data: {
        upvotes: nextUpvotes,
        ...(priorityChanged ? { priority: nextPriority } : {}),
      },
      select: {
        id: true,
        publicId: true,
        upvotes: true,
        priority: true,
      },
    });

    if (existing.masterId) {
      await tx.complaint.update({
        where: { id: existing.masterId },
        data: {
          upvotes: nextUpvotes,
          ...(priorityChanged ? { priority: nextPriority } : {}),
        },
      });
    }

    return item;
  });

  return NextResponse.json({
    success: true,
    id: updated.publicId,
    upvotes: updated.upvotes,
    priority: updated.priority,
    action,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required to upvote." }, { status: 401 });
  }

  if (await isRateLimited(`upvote:${session.id}`, 30, 60)) {
    return NextResponse.json({ error: "Too many votes. Please wait a moment." }, { status: 429 });
  }

  const existing = await prisma.complaint.findFirst({
    where: {
      OR: [{ publicId: id }, { id }],
      campusName: session.campusName,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Complaint not found in your campus." }, { status: 404 });
  }

  const nextUpvotes = Math.max(0, existing.upvotes - 1);
  const nextPriority =
    nextUpvotes >= 15
      ? "Critical"
      : nextUpvotes >= 5
      ? "High"
      : existing.priority === "Critical" || existing.priority === "High"
      ? "Medium"
      : existing.priority;

  const priorityChanged = nextPriority !== existing.priority;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.complaint.update({
      where: { id: existing.id },
      data: {
        upvotes: nextUpvotes,
        ...(priorityChanged ? { priority: nextPriority } : {}),
      },
      select: {
        id: true,
        publicId: true,
        upvotes: true,
        priority: true,
      },
    });

    if (existing.masterId) {
      await tx.complaint.update({
        where: { id: existing.masterId },
        data: {
          upvotes: nextUpvotes,
          ...(priorityChanged ? { priority: nextPriority } : {}),
        },
      });
    }

    return item;
  });

  return NextResponse.json({
    success: true,
    id: updated.publicId,
    upvotes: updated.upvotes,
    priority: updated.priority,
    action: "remove",
  });
}
