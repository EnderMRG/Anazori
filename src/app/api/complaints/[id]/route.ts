import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const updates = await request.json();
  const existing = await prisma.complaint.findUnique({ where: { publicId: id } });
  if (!existing || existing.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found in your campus queue." }, { status: 404 });
  const complaint = await prisma.complaint.update({ where: { publicId: id }, data: { status: updates.status, department: updates.department, priority: updates.priority }, include: { user: { select: { name: true } } } });

  return NextResponse.json({
    complaint,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const complaint = await prisma.complaint.findUnique({ where: { publicId: id }, include: { user: { select: { name: true } } } });
  if (!complaint || complaint.campusName !== session.campusName) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  return NextResponse.json({ complaint });
}
