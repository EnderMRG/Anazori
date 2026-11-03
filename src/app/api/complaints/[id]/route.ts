import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function validImage(value: unknown) {
  return typeof value === "string" && value.startsWith("data:image/") && value.length <= 12 * 1024 * 1024;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const updates = await request.json() as { status?: string; department?: string; priority?: string; resolvedImage?: string; resolvedImageUrl?: string; resolutionNotes?: string; adminResponseEn?: string; adminResponseAs?: string };
  const existing = await prisma.complaint.findUnique({ where: { publicId: id } });
  if (!existing || existing.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found in your campus queue." }, { status: 404 });
  const root = existing.masterId ? await prisma.complaint.findUnique({ where: { id: existing.masterId } }) : existing;
  if (!root) return NextResponse.json({ error: "Master complaint not found." }, { status: 404 });
  const status = updates.status || existing.status;
  if (!["Submitted", "In progress", "Resolved"].includes(status)) return NextResponse.json({ error: "Unsupported complaint status." }, { status: 400 });
  const resolvedImageUrl = updates.resolvedImageUrl || updates.resolvedImage;
  if (status === "Resolved" && !root.resolvedImageUrl && !validImage(resolvedImageUrl)) return NextResponse.json({ error: "An after photo is required before resolving this complaint." }, { status: 400 });
  if (resolvedImageUrl && !validImage(resolvedImageUrl)) return NextResponse.json({ error: "The after photo must be a supported image smaller than 8 MB." }, { status: 400 });

  const complaint = await prisma.$transaction(async (tx) => {
    const data = {
      status,
      department: updates.department || undefined,
      priority: updates.priority || undefined,
      resolvedImageUrl: resolvedImageUrl || undefined,
      resolutionNotes: typeof updates.resolutionNotes === "string" ? updates.resolutionNotes.slice(0, 1000) : undefined,
    };
    const updated = await tx.complaint.update({ where: { publicId: id }, data, include: { user: { select: { name: true } } } });
    if (root.id !== existing.id) await tx.complaint.update({ where: { id: root.id }, data });
    if (status !== root.status) {
      const affected = await tx.complaint.findMany({ where: { OR: [{ id: root.id }, { masterId: root.id }] }, select: { userId: true } });
      const userIds = Array.from(new Set(affected.map((item) => item.userId)));
      if (userIds.length) await tx.notification.createMany({ data: userIds.map((userId) => ({ userId, title: status === "Resolved" ? "Issue resolved" : "Issue status updated", body: status === "Resolved" ? `${root.publicId} was resolved with a submitted after photo.` : `${root.publicId} is now ${status.toLowerCase()}.`, complaintId: root.id })) });
    }
    const responseEn = typeof updates.adminResponseEn === "string" ? updates.adminResponseEn.trim().slice(0, 1000) : "";
    const responseAs = typeof updates.adminResponseAs === "string" ? updates.adminResponseAs.trim().slice(0, 1000) : "";
    if (responseEn || responseAs) {
      const affected = await tx.complaint.findMany({ where: { OR: [{ id: root.id }, { masterId: root.id }] }, select: { userId: true, user: { select: { preferredLanguage: true } } } });
      const recipients = new Map(affected.map((item) => [item.userId, item.user.preferredLanguage]));
      if (recipients.size) await tx.notification.createMany({ data: Array.from(recipients, ([userId, preferredLanguage]) => ({
        userId,
        title: preferredLanguage === "as" ? "কেম্পাছ প্ৰশাসনৰ উত্তৰ" : "Campus administrator responded",
        body: `English response:\n${responseEn}\n\nঅসমীয়া উত্তৰ:\n${responseAs}`,
        complaintId: root.id,
      })) });
    }
    return updated;
  });
  const savedComplaint = {
    ...complaint,
    ...(typeof updates.adminResponseEn === "string" ? { adminResponseEn: updates.adminResponseEn } : {}),
    ...(typeof updates.adminResponseAs === "string" ? { adminResponseAs: updates.adminResponseAs } : {}),
  };
  return NextResponse.json({ complaint: savedComplaint });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const complaint = await prisma.complaint.findUnique({ where: { publicId: id }, include: { user: { select: { name: true } } } });
  if (!complaint || complaint.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  const response = await prisma.notification.findFirst({
    where: { userId: session.id, complaintId: complaint.masterId || complaint.id, title: { in: ["Campus administrator responded", "কেম্পাছ প্ৰশাসনৰ উত্তৰ"] } },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });
  const match = response?.body.match(/^English response:\n([\s\S]*?)\n\nঅসমীয়া উত্তৰ:\n([\s\S]*)$/u);
  return NextResponse.json({ complaint: { ...complaint, ...(match ? { adminResponseEn: match[1], adminResponseAs: match[2] } : {}) } });
}
