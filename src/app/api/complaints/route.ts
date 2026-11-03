import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyseIssue, analyseIssueWithProvider, duplicateScore, escalatedPriority, type IssueAnalysis } from "@/lib/issue-analysis";

type ComplaintWithUser = Prisma.ComplaintGetPayload<{ include: { user: { select: { name: true } } } }>;

function toClientComplaint(complaint: ComplaintWithUser) {
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
    image: complaint.imageUrl || undefined,
    resolvedImage: complaint.resolvedImageUrl || undefined,
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
  return typeof value !== "string" || value === "" || (value.startsWith("data:image/") && value.length <= 12 * 1024 * 1024);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const requestedCampus = new URL(request.url).searchParams.get("campusName");
  const campusName = session.role === "admin" ? (requestedCampus || session.campusName) : session.campusName;
  const complaints = await prisma.complaint.findMany({ where: { campusName }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ complaints: complaints.map(toClientComplaint), endpoints: { create: "POST /api/complaints", update: "PATCH /api/complaints/:id" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = String(body.title || "Campus issue").trim().slice(0, 180);
    const description = String(body.description || "").trim().slice(0, 5000);
    const location = String(body.location || "Campus").trim().slice(0, 180);
    const image = typeof body.image === "string" ? body.image : "";
    if (!description || !location) return NextResponse.json({ error: "Description and location are required." }, { status: 400 });
    if (!validImage(image)) return NextResponse.json({ error: "Evidence must be a supported image smaller than 8 MB." }, { status: 400 });

    const fallback = analyseIssue({ title, description, location, image });
    let providerAnalysis = fallback;
    try {
      providerAnalysis = (await analyseIssueWithProvider({ title, description, location, image }, fallback)).result;
    } catch (error) {
      console.error("Provider analysis unavailable; using local triage.", error);
    }
    const analysis: IssueAnalysis = {
      ...providerAnalysis,
    };

    const activeComplaints = await prisma.complaint.findMany({ where: { campusName: session.campusName, status: { not: "Resolved" }, masterId: null }, orderBy: { createdAt: "desc" }, take: 250 });
    const duplicate = activeComplaints.map((item) => ({ item, score: duplicateScore({ title, description, location, category: analysis.category, tags: analysis.tags }, item) })).sort((a, b) => b.score - a.score)[0];
    const master = duplicate && duplicate.score >= 0.8 ? duplicate.item : null;
    const complaint = await prisma.$transaction(async (tx) => {
      if (master) {
        const upvotes = master.upvotes + 1;
        const updatedMaster = await tx.complaint.update({ where: { id: master.id }, data: { upvotes, priority: escalatedPriority(upvotes, master.priority as IssueAnalysis["priority"]) } });
        await tx.complaint.create({ data: { publicId: publicId(), userId: session.id, campusName: session.campusName, title, description, language: analysis.language, category: analysis.category, priority: analysis.priority, department: analysis.department, status: "Submitted", location, imageUrl: image || null, summaryEn: analysis.summaryEn, summaryAs: analysis.summaryAs, tags: analysis.tags, upvotes: 0, masterId: updatedMaster.id } });
        await tx.notification.create({ data: { userId: master.userId, title: "Another student reported this issue", body: `Your report ${master.publicId} now has ${upvotes} affected students.`, complaintId: master.id } });
        return tx.complaint.findUniqueOrThrow({ where: { id: master.id }, include: { user: { select: { name: true } } } });
      }
      return tx.complaint.create({ data: { publicId: publicId(), userId: session.id, campusName: session.campusName, title, description, language: analysis.language, category: analysis.category, priority: analysis.priority, department: analysis.department, status: "Submitted", location, imageUrl: image || null, summaryEn: analysis.summaryEn, summaryAs: analysis.summaryAs, tags: analysis.tags, upvotes: 1 }, include: { user: { select: { name: true } } } });
    });
    return NextResponse.json({ complaint: toClientComplaint(complaint), clustered: Boolean(master), masterId: master?.publicId || null }, { status: 201 });
  } catch (error) {
    console.error("Complaint creation failed", error);
    return NextResponse.json({ error: "Unable to save the report." }, { status: 500 });
  }
}
