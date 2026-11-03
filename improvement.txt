# CivicSense (PS-04) — Audit, Codebase Limitations & Technical Roadmap

## 1. Executive Summary
This document outlines the current state, limitations, and technical enhancement roadmap for the **CivicSense** platform (`Anazori-26/Anazori`) in relation to problem statement **PS-04: CivicSense - Bilingual AI Smart Campus Issue Management System**.

While the base stack (Next.js, Tailwind/custom CSS, Neon PostgreSQL via Prisma, and JWT authentication) is functional, the AI triage, duplicate detection, bilingual translation, and categorization layers are currently simulated with basic keyword heuristics.

---

## 2. Gap Analysis: Requirements vs. Current Implementation

| Requirement from PS-04 | Current Status | Current Codebase Implementation | Technical Requirement |
| :--- | :--- | :--- | :--- |
| **Bilingual Submission (Assamese & English)** | 🟡 Partial | Static dictionary (`copy` object in [`CivicSenseApp.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/CivicSenseApp.tsx)). Form accepts raw Assamese text but does not parse it. | Assamese tokenization, language identification, and cross-lingual translation. |
| **Image-based Complaint Reporting** | 🟡 Surface only | Base64 file upload in [`CivicSenseApp.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/CivicSenseApp.tsx). Stored in DB and rendered in detail modal. | **Multimodal vision AI**: Analyze the image to verify evidence, extract scene details, and reject unrelated images/spam. |
| **AI Classification & Prioritisation** | 🔴 Mocked | [`src/app/api/ai/analyse/route.ts`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/app/api/ai/analyse/route.ts) uses a 4-line `if/else` keyword check (`water`, `wifi`, `light`, `waste`). | Gen AI model returning structured JSON with category, department routing, priority level, and justification. |
| **Bilingual Summaries** | 🔴 Mocked | Fixed template strings in [`route.ts`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/app/api/ai/analyse/route.ts). Emits the same generic Assamese sentence regardless of input text. | Real context-aware bilingual summarization (`summaryEn` and `summaryAs`) preserving grievance details. |
| **Duplicate Detection** | 🔴 Mocked / Inaccurate | Naive substring match in [`CivicSenseApp.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/CivicSenseApp.tsx). Flags issues with identical location names as duplicates. | Semantic cross-lingual duplicate detection and upvote clustering. |
| **Categorization & Tagging** | 🔴 Inflexible | Single hardcoded category from 5 choices. No multi-tagging or tag-based filtering. | Multi-dimensional tagging system for filtering across departments, locations, and issue types. |
| **Resolution Verification** | 🔴 Missing | Admins can change status to "Resolved" with a single click; no proof required. | "Before & After" photo verification to prevent unverified closures. |
| **Status Tracking & Notifications** | 🟡 Partial | Status is saved in Neon DB. Notifications exist only in temporary React state and vanish on page refresh. | Prisma `Notification` table to persist status alerts and resolution updates. |
| **Admin Control Room & Statistics** | 🟢 Complete | [`AdminControlRoom.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/AdminControlRoom.tsx) provides filtering, bulk updates, and CSV export. | Feed AI tags, duplicate counts, and resolution proof into the admin dashboard. |

---

## 3. Current Codebase Limitations

### 3.1. Keyword-based AI Triage (`src/app/api/ai/analyse/route.ts`)
```typescript
let category = "Other campus issue";
let department = "Campus Administration";
let priority = "Medium";
if (text.includes("water") || text.includes("পানী")) { category = "Water supply"; department = "Maintenance"; priority = "High"; }
else if (text.includes("wifi") || text.includes("internet") || text.includes("ৱাই")) { category = "Internet / Wi-Fi"; department = "IT Services"; }
else if (text.includes("light") || text.includes("security") || text.includes("আলো")) { category = "Safety & security"; department = "Estate & Security"; priority = "High"; }
else if (text.includes("waste") || text.includes("clean") || text.includes("আৱৰ্জনা")) { category = "Cleanliness"; department = "Sanitation"; priority = "Low"; }

summaryEn: `${title}. Reported at ${location}. Our ${department.toLowerCase()} team will review this issue.`;
summaryAs: `এই সমস্যাটো ${location} স্থানত প্ৰতিবেদন কৰা হৈছে। ${department} দলে ইয়াক পৰ্যালোচনা কৰিব।`;
```
- **Fails on unlisted issues**: Lab equipment problems, broken furniture, ceiling leaks, or transport complaints default to "Other campus issue".
- **Fails on linguistic variation**: Alternate Assamese phrasing, misspellings, or phonetic typing are ignored.
- **Static summaries**: The Assamese summary does not convey what the student actually reported.

### 3.2. Substring Duplicate Matcher (`src/components/CivicSenseApp.tsx`)
```typescript
const combined = `${title} ${description}`.toLowerCase();
const existing = complaints.find(
  (item) => combined.includes(item.category.toLowerCase().split(" ")[0]) || 
            item.location.toLowerCase() === location.toLowerCase()
);
```
- **High false positive rate**: Two distinct complaints at "Hostel block C" (e.g. broken window vs. power failure) trigger a false duplicate alert.
- **Cross-lingual failure**: An English report (*"No running water"*) and an Assamese report (*"পানীৰ যোগান নাই"*) will never match due to zero string overlap.

---

## 4. Systematic Issue Tagging & Categorization System

### 4.1. The Need for Dynamic Tags
A single category (e.g., "Maintenance") is too broad for campus administration. An issue like *"Water leakage in Chemistry Lab 2 damaging electrical wiring"* touches multiple operational concerns:
- Location / Facility: `Lab`, `Chemistry Department`
- Infrastructure Type: `Plumbing`, `Electrical`
- Risk Factor: `Safety Hazard`, `Equipment Damage`

### 4.2. Multi-Dimensional Tag Taxonomy
During AI triage, the model generates 2 to 4 structured tags across standard dimensions:
1. **Facility/Zone Tag**: `#HostelBlockC`, `#CentralLibrary`, `#AdminBlock`, `#ScienceLab`
2. **Technical Subsystem Tag**: `#Plumbing`, `#Electrical`, `#Networking`, `#Sanitation`, `#CivilWork`
3. **Severity/Urgency Tag**: `#Hazard`, `#Urgent`, `#Routine`, `#AssetDamage`

### 4.3. Admin Filtering Workflow
- In [`AdminControlRoom.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/AdminControlRoom.tsx), a dedicated **Tag Bar** displays active tags with count badges (e.g. `[#HostelBlockC (8)]`, `[#Plumbing (5)]`, `[#Electrical (3)]`).
- Admins can filter tickets by multiple tags to identify localized clusters or assign specific contractor teams (e.g., filtering `#Plumbing` + `#HostelBlockC` to export a single worklist for the campus plumber).
- Students can click tags on their dashboard to view related open issues in their vicinity.

---

## 5. Duplicate-to-Upvote Clustering ("+1 Affected Student")

### 5.1. Concept & Problem Solved
Traditional systems simply reject or block duplicate complaints, which frustrates users and leads to abandoned reports. 

Instead of rejecting a duplicate:
1. **Semantic Matching**: When a new grievance is submitted, the AI compares it against active complaints on that campus. If the semantic similarity exceeds a threshold (e.g., > 0.80), the system identifies the existing complaint as the **Master Ticket**.
2. **Upvote / Endorsement Conversion**: The student's submission is converted into an **Upvote / "+1 Affected"** vote on the master ticket.
3. **Dynamic Priority Escalation**: As the affected count increases, the priority automatically escalates:
   - 1 report: Normal priority
   - 5+ reports: Raised to High
   - 15+ reports: Raised to Critical (broad campus impact)
4. **Unified Broadcast Notification**: When the admin resolves the master ticket, **all students** who reported or upvoted the issue receive a resolution alert.

---

## 6. "Before & After" Resolution Proof (Computer Vision Verification)

### 6.1. Concept & Problem Solved
A common failure in campus grievance systems is premature or false ticket closure: an administrator or contractor marks an issue as "Resolved" without work being performed.

### 6.2. Workflow
1. **Submission ("Before" Image)**: The student uploads a photo showing the initial defect (e.g., an overflowing garbage bin or leaking pipe).
2. **Resolution Submission ("After" Image)**: When an admin or field staff marks the issue as "Resolved", the system requires an **"After" photo**.
3. **Multimodal AI Comparison**: The vision model inspects both images:
   - Verifies scene consistency (same location/angle).
   - Confirms the problem shown in the "Before" photo has been remedied in the "After" photo.
   - Generates an **AI Verification Log** (e.g., *"Verification Successful: Waste container cleared and surrounding area clean"*).
4. **Resolution Badge**: The complaint detail modal displays the side-by-side comparison with a verified checkmark, providing transparency to students.

---

## 7. End-to-End Gen AI Architecture

```
[Student / User]
       │
       ▼
 1. Submit Grievance
    - Title & Description (English / Assamese / Mixed)
    - Location
    - "Before" Photo (Evidence)
       │
       ▼
 2. Next.js API Route (`/api/ai/analyse`)
       │
       ├───► 3. Multimodal Model (Gemini 1.5/2.0 Flash)
       │        ├─ Language Detection (Assamese / English / Mixed)
       │        ├─ Image Validation: Confirms photo matches description
       │        ├─ Classification: Category, Department, Priority
       │        ├─ Dynamic Tags: Multi-dimensional labels (#HostelC, #Plumbing)
       │        ├─ Bilingual Summaries: Contextual summaryEn and summaryAs
       │        └─ Spam/Toxicity Filter: Discards invalid reports
       │
       ├───► 4. Semantic Duplicate Engine
       │        ├─ Compare against active campus issues
       │        └─ Match found? -> Link to Master Ticket & increment Upvote count
       │
       ▼
 5. Save to Neon PostgreSQL
```

---

## 8. Database Schema Enhancements (Prisma)

Update [`prisma/schema.prisma`](file:///d:/Projects/HKTN/Anazori-26/Anazori/prisma/schema.prisma) with the following models:

```prisma
model Complaint {
  id               String   @id @default(cuid())
  publicId         String   @unique
  userId           String
  campusName       String
  title            String
  description      String
  language         String   @default("en")
  category         String
  priority         String
  department       String
  status           String   @default("Submitted")
  location         String
  imageUrl         String?                    // "Before" photo
  resolvedImageUrl String?                    // "After" photo (resolution proof)
  resolutionNotes  String?                    // Admin/AI closure commentary
  summaryEn        String
  summaryAs        String
  tags             String[] @default([])      // Multi-dimensional issue tags
  upvotes          Int      @default(0)       // Affected student count
  masterId         String?                    // References master complaint if duplicate
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  notifications    Notification[]
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  title       String
  body        String
  read        Boolean  @default(false)
  complaintId String?
  complaint   Complaint? @relation(fields: [complaintId], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
}
```

---

## 9. Next Implementation Steps

1. **Add Gemini API Key**: Configure `GEMINI_API_KEY` in `Anazori/.env`.
2. **Schema Migration**: Update `prisma/schema.prisma` with `tags`, `resolvedImageUrl`, `upvotes`, and run `npm run db:generate && prisma db push`.
3. **Upgrade `/api/ai/analyse`**: Replace keyword `if/else` checks with real Gemini multimodal calls returning structured JSON.
4. **Implement Admin Tag Bar & Before/After Modal**: Add tag filters and image verification upload to [`AdminControlRoom.tsx`](file:///d:/Projects/HKTN/Anazori-26/Anazori/src/components/AdminControlRoom.tsx).
