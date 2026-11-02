import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function toClientComplaint(complaint: { publicId: string; title: string; description: string; language: string; category: string; priority: string; department: string; status: string; location: string; imageUrl: string | null; summaryEn: string; summaryAs: string; createdAt: Date; campusName: string; user: { name: string } }) {
  return { id: complaint.publicId, title: complaint.title, description: complaint.description, language: complaint.language, category: complaint.category, priority: complaint.priority, department: complaint.department, status: complaint.status, location: complaint.location, image: complaint.imageUrl || undefined, summaryEn: complaint.summaryEn, summaryAs: complaint.summaryAs, createdAt: complaint.createdAt.toLocaleString(), reporter: complaint.user.name, campusName: complaint.campusName };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const requestedCampus = new URL(request.url).searchParams.get("campusName");
  const campusName = session.role === "admin" ? session.campusName : (requestedCampus || session.campusName);
  const complaints = await prisma.complaint.findMany({ where: { campusName }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ complaints: await Promise.all(complaints.map(toClientComplaint)), endpoints: { create: "POST /api/complaints", update: "PATCH /api/complaints/:id" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json();
  const campusName = session.campusName;
  const complaint = await prisma.complaint.create({
    data: { publicId: body.id || `CS-${Math.floor(1000 + Math.random() * 9000)}`, userId: session.id, campusName, title: String(body.title || "Campus issue"), description: String(body.description || ""), language: body.language || "en", category: body.category || "Other campus issue", priority: body.priority || "Medium", department: body.department || "Campus Administration", status: "Submitted", location: body.location || "Campus", imageUrl: body.image || null, summaryEn: body.summaryEn || "This report is awaiting review.", summaryAs: body.summaryAs || "এই প্ৰতিবেদনটো পৰ্যালোচনাৰ বাবে অপেক্ষা কৰি আছে।" },
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({ complaint: await toClientComplaint(complaint) }, { status: 201 });
}
