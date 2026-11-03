import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const notifications = await prisma.notification.findMany({ where: { userId: session.id }, include: { complaint: { select: { publicId: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ notifications: notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, time: item.createdAt.toLocaleString(), unread: !item.read, complaintId: item.complaint?.publicId })) });
}

export async function PATCH() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
