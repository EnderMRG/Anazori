CREATE TABLE IF NOT EXISTS "Campus" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Campus network',
  "description" TEXT NOT NULL DEFAULT 'A connected space for the campus community.',
  "accent" TEXT NOT NULL DEFAULT '#2b8f85',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Campus_name_key" ON "Campus"("name");

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'student',
  "campusName" TEXT NOT NULL DEFAULT 'Dibrugarh University',
  "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Complaint" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "campusName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Submitted',
  "location" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "resolvedImageUrl" TEXT,
  "resolutionNotes" TEXT,
  "summaryEn" TEXT NOT NULL,
  "summaryAs" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "upvotes" INTEGER NOT NULL DEFAULT 1,
  "masterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Complaint_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "resolvedImageUrl" TEXT;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "upvotes" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "masterId" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Complaint_masterId_fkey') THEN
    ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Complaint_publicId_key" ON "Complaint"("publicId");
CREATE INDEX IF NOT EXISTS "Complaint_userId_createdAt_idx" ON "Complaint"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX IF NOT EXISTS "Complaint_campusName_idx" ON "Complaint"("campusName");
CREATE INDEX IF NOT EXISTS "Complaint_campusName_createdAt_id_idx" ON "Complaint"("campusName", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "Complaint_masterId_idx" ON "Complaint"("masterId");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "complaintId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
