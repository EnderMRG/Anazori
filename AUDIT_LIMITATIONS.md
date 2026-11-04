# CivicSense (PS-04) — Updated Audit Report

**Updated:** 2026-11-04
**Scope:** Current repository implementation, including the AI workflows, complaint storage, authentication, and release-readiness changes. This report supersedes the earlier code snapshot below.

## Executive summary

The original audit described multiple features as mocked or missing. That description no longer matches the code. CivicSense now includes campus-scoped complaint management, bilingual AI intake, browser voice dictation, AI triage and summaries, duplicate suggestions with opt-in clustering, report-grounded Campus Pulse Q&A, durable notifications, evidence review, admin tagging/filtering, request limits, paginated reads, and health checks.

Two correctness issues found during this review have been fixed: the local duplicate matcher no longer treats a shared location/category alone as strong evidence of a duplicate, and unavailable image verification is no longer reported as AI-verified. Resolution changes now require a short-lived signed token bound to the complaint and after-image; a token can represent AI verification or an explicitly confirmed manual review.

**No implementation can guarantee a hackathon placement.** AI quality, judging criteria, presentation, and live deployment remain outside the codebase’s control.

## Requirements and current status

| Area | Status | Current implementation and remaining caveat |
|---|---|---|
| English/Assamese intake | Implemented with provider-dependent quality | Language is detected from script; Gemini handles mixed-language analysis when configured. Without Gemini, local rules and translation fallbacks have lower accuracy. |
| Image-based reports | Implemented | JPEG/PNG/WebP evidence is validated and stored inline in PostgreSQL (maximum 3 MB). Gemini can assess an attached photo during triage. Images are returned only when an authenticated, same-campus user opens a report. Inline storage increases database size and request payloads. |
| AI categorization, routing, priority | Implemented with fallback | Gemini returns structured fields; bounded local rules are used if the provider is unavailable or unconfigured. Model responses are normalized and capped, but predictions still require human review. |
| Bilingual summaries | Implemented with fallback | Gemini produces contextual summaries when enabled. The fallback uses the configured translation provider; translation quality and availability are external dependencies. |
| Voice reporting | Implemented with browser-dependent support | The report form uses browser SpeechRecognition/Web Speech where available for English or Assamese dictation. The student can edit the transcript before analysis and submission. No raw audio is uploaded by this feature; browser support, microphone permission, and Assamese transcription quality vary. |
| Campus Pulse | Implemented with bounded evidence | Authenticated Q&A is scoped to the user's campus and samples at most 120 recent reports. Gemini answers cite only supplied report IDs, which the API validates; local summaries are used when Gemini is unavailable. This is not exhaustive historical analytics. |
| Duplicate detection | Implemented as a human-confirmed suggestion | Local token similarity requires report-text overlap; campus/location/category alone no longer qualifies. Gemini can suggest cross-language matches. It checks at most 80 recent active master reports and asks the student to confirm before clustering, so it is not exhaustive and does not auto-merge. |
| Tags and categorization | Implemented | Triage supplies subsystem, severity, and location tags; administrators can filter reports by multiple tags. Tag quality depends on model output or the local rule set. |
| Resolution evidence | Implemented with explicit fallback | Admins must submit an after photo. Gemini compares before/after images where available. If automated comparison is unavailable, the UI requires explicit administrator confirmation of manual review; an AI rejection cannot be overridden through this workflow. The API requires a short-lived signed token bound to the complaint and exact evidence image. |
| Status notifications | Implemented | Notifications are persisted in PostgreSQL; status and response updates are written with the related complaint transaction. |
| Admin dashboard | Implemented | Campus-scoped queues include filters, bulk actions, tags, metrics, and CSV export. |
| Admin account provisioning | Hardened | Production administrator signup requires `ADMIN_SIGNUP_CODE`; set a private invitation code in the deployment environment. Existing admin accounts are unaffected. |
| Load/readiness | Load test failed; not load-certified | Complaint listing is cursor-paginated (50 by default, 100 maximum); rate limits and shared AI cache use Upstash Redis; `/api/health` checks the database and Redis. A local 100-request burst exhausted the Prisma connection pool; staging performance remains untested. |

## Changes completed in this review

- Replaced the local duplicate score that over-weighted shared category/location with a report-text similarity score and supporting category/location/tag signals.
- Added AI photo-assessment output to complaint triage and surfaced it during intake.
- Preserved Gemini’s bilingual summaries instead of overwriting them with a second translation pass.
- Made manual resolution review visibly distinct from successful AI verification.
- Bound resolution-verification tokens to the complaint ID and the after-image digest; tokens expire after five minutes. The complaint update endpoint rejects resolution without a valid token.
- Required an administrator invitation code for production administrator signup, with constant-time code comparison.
- Added Campus Pulse with campus-scoped report evidence, validated report-ID citations, bounded recent-report metrics, rate limits, and local fallback.
- Added browser-based English/Assamese voice dictation to the report description, preserving transcript editing and explicit review/submission.
- Updated the README and this report to describe the actual Blob-free, inline-evidence implementation and its trade-offs.

## Operational requirements before judging or release

1. Configure a unique `AUTH_SECRET` (at least 32 characters) and a private `ADMIN_SIGNUP_CODE` in every production deployment environment.
2. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; without them, rate limits and caches fall back to per-instance memory and do not coordinate across instances.
3. Configure `GEMINI_API_KEY` to demonstrate the full AI-powered flows. Without it, the app continues with local fallbacks; do not describe those fallbacks as generative AI.
4. Apply the additive database setup/index changes to the deployment database using the documented setup command.
5. After addressing the connection-pool bottleneck, rerun the authenticated read-only load test against staging and review failure rate and p95 latency. The local test used one authenticated session for 100 concurrent requests; it is not a simulation of 100 distinct users.
6. Translation sends report text to the configured translation endpoint (external by default). Review the provider’s privacy/retention terms or configure a trusted provider before handling sensitive reports.
7. Existing public Blob URLs can still render in old reports, but new evidence is stored in PostgreSQL. Remove the old Blob store only after confirming that no remaining reports depend on it.

## Verification performed

- `npm run build` — passed, including Prisma generation, Next.js compilation, and TypeScript validation.
- `git diff --check` — passed.
- `node --check scripts/load-test.mjs` — passed.
- `npm audit --omit=dev` — **not clean:** 6 production dependency advisories (1 moderate, 5 high), involving Prisma’s toolchain and Next.js/PostCSS dependency ranges. Remediation requires compatibility review; no breaking `--force` upgrade was applied.
- 15/15 read-only/API checks passed for health, student/admin sign-in and identity, paginated complaints, notifications, campuses, role authorization, AI triage, follow-up, duplicate suggestions, response copilot, and invalid evidence rejection.
- The duplicate endpoint returned a matching suggestion for a known matching report. A real Gemini image comparison correctly rejected an unrelated after-photo; an attempted resolution without a valid verification token was rejected with HTTP 409. No complaint, response, or notification was changed during testing.
- Student dashboard, complaint list, student services, admin queue/detail, evidence display, settings, and local image preview were checked in the browser without visible errors. Photo removal initially failed because the preview image intercepted clicks; the image now ignores pointer events, and removal was verified after the fix.
- A 100-request read-only burst against the local app completed with 23 HTTP 200 responses, 20 HTTP 500 responses, and 57 client timeouts/non-HTTP results (77% non-2xx; p95 30,097 ms). Server logs showed Prisma `P2024` connection-pool timeouts at a pool limit of 17. The subsequent health check returned healthy; no complaint or notification data was modified.
- After Campus Pulse and voice reporting were added, `npm run build`, `npx tsc --noEmit`, and `git diff --check` passed. A read-only Campus Pulse query returned a campus-scoped answer with report references; no records were changed. The report form and voice-input control rendered in the browser.

## Remaining verification gaps and known limitations

- Successful complaint submission, admin assignment/status changes, response publishing, successful resolution, and notification-read updates were not exercised because they would change existing data. The invalid-resolution guard was tested, but a complete successful write workflow still needs a disposable staging account.
- The local 100-request burst failed due to Prisma connection-pool exhaustion. It used one authenticated session rather than 100 distinct users. Staging capacity and multi-user behavior are still unverified; investigate connection pooling/deployment limits before claiming support for 100 concurrent users.
- The main overview still contains static demo metrics (for example resolution time and satisfaction) and should not be presented as live database-derived measurements. Campus Pulse metrics are live but cover at most the 120 newest reports.
- Voice transcription itself was not validated end to end; a browser speech-recognition stop error was observed. Browser/device support, microphone permission, and Assamese transcription quality remain unverified and may vary.
- Settings rendered successfully, but profile/preferences persistence was not tested. No claim is made here that those settings save across sessions.
- AI API paths and a Gemini image comparison were exercised, but generated content quality was not exhaustively evaluated.
