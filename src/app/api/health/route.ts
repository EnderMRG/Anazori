import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRedisHealth } from "@/lib/redis";

export async function GET() {
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (error) {
    console.error("Database health check failed.", error);
  }
  const redis = await checkRedisHealth();
  const status = databaseOk && redis.ok ? "healthy" : databaseOk && !redis.configured ? "degraded" : "unavailable";
  return NextResponse.json(
    { ok: databaseOk, status, service: "civicsense", dependencies: { database: databaseOk ? "ok" : "unavailable", redis: redis.ok ? "ok" : redis.configured ? "unavailable" : "not-configured" } },
    { status: databaseOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
