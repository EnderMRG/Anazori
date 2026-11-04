import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isEvidenceDataUrl } from "@/lib/evidence";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/redis";
import { verifyResolutionToken } from "@/lib/resolution-token";

type RouteContext = { params: Promise<{ id: string }> };

function validImage(value: unknown) {
  return typeof value === "string" && isEvidenceDataUrl(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (await isRateLimited(`complaint-update:${session.id}`, 60, 60)) {
    return NextResponse.json({ error: "Update limit reached. Please try again later." }, { status: 429 });
  }
  const updates = await request.json() as { status?: string; department?: string; priority?: string; resolvedImage?: string; resolvedImageUrl?: string; resolutionNotes?: string; resolutionVerificationToken?: string; adminResponseEn?: string; adminResponseAs?: string };
  const existing = await prisma.complaint.findUnique({ where: { publicId: id } });
  if (!existing || existing.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found in your campus queue." }, { status: 404 });
  const root = existing.masterId ? await prisma.complaint.findUnique({ where: { id: existing.masterId } }) : existing;
  if (!root) return NextResponse.json({ error: "Master complaint not found." }, { status: 404 });
  const status = updates.status || existing.status;
  if (!["Submitted", "In progress", "Resolved"].includes(status)) return NextResponse.json({ error: "Unsupported complaint status." }, { status: 400 });
  const resolvedImageUrl = updates.resolvedImageUrl || updates.resolvedImage;
  const evidenceImage = resolvedImageUrl || existing.resolvedImageUrl || root.resolvedImageUrl || "";
  const existingEvidence = evidenceImage === existing.resolvedImageUrl || evidenceImage === root.resolvedImageUrl;
  if (status === "Resolved" && !root.resolvedImageUrl && !validImage(resolvedImageUrl)) return NextResponse.json({ error: "An after photo is required before resolving this complaint." }, { status: 400 });
  if (evidenceImage && !validImage(evidenceImage) && !existingEvidence) return NextResponse.json({ error: "The after photo must be a supported image smaller than 3 MB." }, { status: 400 });
  const verificationMode = status === "Resolved" && evidenceImage && updates.resolutionVerificationToken
    ? verifyResolutionToken(updates.resolutionVerificationToken, id, evidenceImage)
    : null;
  if (status === "Resolved" && !verificationMode) return NextResponse.json({ error: "Verify the before and after evidence before resolving this complaint." }, { status: 409 });

  const complaint = await prisma.$transaction(async (tx) => {
    const data = {
      status,
      department: updates.department || undefined,
      priority: updates.priority || undefined,
      resolvedImageUrl: resolvedImageUrl || undefined,
      resolutionNotes: typeof updates.resolutionNotes === "string"
        ? [updates.resolutionNotes, verificationMode === "manual" ? "Manual evidence review confirmed by campus administrator." : ""].filter(Boolean).join(" ").slice(0, 1000)
        : verificationMode === "manual" ? "Manual evidence review confirmed by campus administrator." : undefined,
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
  const { imageUrl: _imageUrl, resolvedImageUrl: _resolvedImageUrl, ...savedComplaint } = complaint;
  return NextResponse.json({ complaint: {
    ...savedComplaint,
    ...(typeof updates.adminResponseEn === "string" ? { adminResponseEn: updates.adminResponseEn } : {}),
    ...(typeof updates.adminResponseAs === "string" ? { adminResponseAs: updates.adminResponseAs } : {}),
  } });
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
  const { imageUrl, resolvedImageUrl, ...complaintDetails } = complaint;
  return NextResponse.json({ complaint: {
    ...complaintDetails,
    image: imageUrl || undefined,
    resolvedImage: resolvedImageUrl || undefined,
    ...(match ? { adminResponseEn: match[1], adminResponseAs: match[2] } : {}),
  } });
}
