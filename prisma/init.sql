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
  "imageUrl" TEXT,
  "summaryEn" TEXT NOT NULL,
  "summaryAs" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Complaint_publicId_key" ON "Complaint"("publicId");
CREATE INDEX IF NOT EXISTS "Complaint_userId_createdAt_idx" ON "Complaint"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX IF NOT EXISTS "Complaint_campusName_idx" ON "Complaint"("campusName");
