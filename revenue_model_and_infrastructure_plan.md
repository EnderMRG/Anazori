# Anazori (CivicSense) — Revenue Model, Infrastructure Costing & Bilingual Architecture Strategy

---

## Executive Summary

**Anazori** is an AI-powered, bilingual campus grievance redressal and student support infrastructure engineered for higher education institutions. This document presents a comprehensive financial and architectural breakdown:
1. **External Infrastructure Dependencies**: Complete inventory of services powering compute, database, AI, maps, media, and messaging.
2. **Detailed Pricing Breakdown**: Projected cost tiers across Pilot (1 university), Growth (5 universities), and Scale (20 universities).
3. **B2B SaaS Subscription Model**: Packaging, pricing tiers, institutional procurement triggers (NAAC / UGC compliance), and unit economics.
4. **Translation & Bilingual Pipeline Roadmap**: Evaluation of the current `api.dharun.dev` endpoint vs. enterprise alternatives (**Bhashini**, **Sarvam AI**, **Self-Hosted IndicTrans2**, **Google Cloud**), and an architectural blueprint for robust Assamese and Romanized (*Xongbado*) processing.

---

## 1. External Infrastructure Dependencies

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANAZORI ARCHITECTURE STACK                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
[Compute / App Layer]       [Data & State Layer]          [AI / Machine Vision]
• Next.js 15 App Router     • PostgreSQL (Neon/Supabase)  • Google Gemini 2.5 Flash
• Edge/Node runtime         • Upstash Redis (Cache/Rate)  • Multimodal Vision (Proofs)
• Vercel Pro or AWS ECS     • Cloudflare R2 (Media/Photos)• Voice Intake Extraction
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[Bilingual & Language Layer]                      [Communications & Geo Layer]
• IndicTrans2 / Bhashini / Sarvam AI             • Leaflet + OpenStreetMap / Mapbox
• Assamese (অসমীয়া) & Romanized Xongbado        • Telegram Bot API / Twilio WhatsApp
• Web Speech API (In-browser ASR)                • Resend / SendGrid (Transactional Email)
```

### Detailed Dependency Matrix

| Service Role | Current Stack Component | Production Industry Standard | Purpose in Anazori |
| :--- | :--- | :--- | :--- |
| **Compute & API Runtime** | Next.js on Local/Sandbox | **Vercel Pro** or **AWS ECS Fargate** | Hosts frontend UI, SSR pages, REST API handlers (`/api/complaints`, `/api/ai/*`). |
| **Relational Database** | Neon Serverless PostgreSQL | **Neon Launch** or **Supabase Pro** / **AWS RDS** | Stores student records, campus complaints, upvotes, audit logs, and coordinates. |
| **In-Memory Cache & Limiter** | Upstash Redis | **Upstash Redis Pay-As-You-Go** | Global rate limiting, semantic duplicate complaint cache, and translation key cache. |
| **Multimodal Vision & AI** | Google Gemini API (`gemini-2.5-flash-lite`) | **Google Gemini 2.5 Flash** | Issue classification, priority/hazard detection, before/after resolution verification, copilot response drafting. |
| **Indic Machine Translation** | `api.dharun.dev` (Community IndicTrans2) | **Bhashini** or **Sarvam AI / Self-hosted IndicTrans2** | Real-time translation between Assamese Unicode, English, and Romanized Assamese. |
| **Evidence & Photo Storage** | Inline Base64 in PostgreSQL | **Cloudflare R2** / **AWS S3** | Secure storage of original complaint evidence and resolved "after" photos. |
| **Interactive Geolocation** | Leaflet + OpenStreetMap | **Leaflet + Stadia Maps / Mapbox** | Interactive campus issue pin-pointing, coordinate resolution, and building heatmaps. |
| **Real-time Notifications** | In-app notification polling | **Telegram Bot API** + **Twilio WhatsApp** | Instant alerts to campus administrative teams when urgent/hazard issues are filed. |
| **Speech Recognition** | Web Speech API (`webkitSpeechRecognition`) | **Web Speech API** + **Bhashini ASR fallback** | Voice transcription for students reporting issues verbally in Assamese/English. |

---

## 2. Infrastructure Pricing Breakdown

### Per-Unit API & Resource Economics

| Component | Billing Metric | Unit Cost | Average Usage per Complaint | Cost per Complaint |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash Lite** | Tokens (\$0.075 / 1M input, \$0.30 / 1M output) | ~\$0.0001 per 1k tokens | ~1,200 tokens (Triage + Follow-up) | **\$0.00018** (~₹0.015) |
| **Gemini Vision (Resolution)** | Per Image Verification | ~258 tokens per image | 2 images (Before + After verification) | **\$0.00008** (~₹0.007) |
| **Upstash Redis** | Read/Write Commands | \$0.20 per 100k commands | ~15 commands per submission flow | **\$0.00003** (~₹0.002) |
| **Cloudflare R2 Storage** | Storage + Zero Egress | \$0.015 / GB-month | ~150 KB per compressed photo | **\$0.00001** (~₹0.001) |
| **Machine Translation (Sarvam/Bhashini)** | Characters translated | ₹0.20 / 1k chars (~\$0.0024) | ~300 chars translated (if non-cached) | **\$0.00072** (~₹0.060) |
| **Telegram Admin Alert** | API Calls | **\$0.00 (Free)** | 1 message per critical issue | **\$0.00000** |
| **Total Variable Cost Per Complaint** | — | — | — | **~\$0.0010** (~₹0.085) |

> [!NOTE]
> **Extremely Lean Variable Cost**: Because Anazori leverages client-side image compression (reducing 5MB mobile images to ~80KB before upload) and short prompts on Gemini 2.5 Flash, the direct variable cost per filed complaint is **less than 10 paise (₹0.09)**!

---

### Total Monthly Cost Projections Across Scale Tiers

#### Tier A: Pilot Stage (1 University — e.g. Dibrugarh University)
- **Scale**: ~10,000 students · ~2,000 complaints/month · ~25 administrative staff.

| Service | Plan / Resource Details | Monthly Cost (USD) | Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **Vercel Hosting** | Vercel Pro Plan (1 seat) | \$20.00 | ₹1,660 |
| **Neon PostgreSQL** | Launch Tier (10 GB storage, compute auto-suspend) | \$19.00 | ₹1,580 |
| **Upstash Redis** | Free Tier (up to 10k commands/day) | \$0.00 | ₹0 |
| **Google Gemini API** | ~2,500 analyses + vision verifications | \$2.50 | ₹210 |
| **Cloudflare R2** | ~5 GB evidence storage, zero egress | \$0.10 | ₹10 |
| **Translation Layer** | Bhashini Academic Tier / Sarvam API | \$5.00 | ₹415 |
| **Domain & SSL** | Custom university subdomain | \$1.00 | ₹85 |
| **Total Monthly Running Cost** | **Pilot Campus** | **\$47.60** | **₹3,960 / month** |

---

#### Tier B: Regional Growth Stage (5 Universities / Colleges)
- **Scale**: ~50,000 students · ~12,000 complaints/month · ~120 administrators.

| Service | Plan / Resource Details | Monthly Cost (USD) | Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **Compute (Vercel / VPS)** | Vercel Pro (Team seats) or AWS Lightsail 8GB Instance | \$40.00 | ₹3,320 |
| **Neon / Supabase DB** | Scale Tier (25 GB storage, read replicas) | \$49.00 | ₹4,070 |
| **Upstash Redis** | Pay-as-you-go (~2.5 million commands/mo) | \$5.00 | ₹415 |
| **Google Gemini API** | ~15,000 complex multi-modal triage calls | \$15.00 | ₹1,245 |
| **Cloudflare R2** | ~30 GB storage + lifecycle archiving | \$1.50 | ₹125 |
| **Translation Layer** | Commercial Bhashini / Sarvam AI quota | \$25.00 | ₹2,075 |
| **Map Tiles (Stadia/Mapbox)** | 50,000 tile loads | \$10.00 | ₹830 |
| **Admin Alerts (WhatsApp/SMS)** | Hybrid Telegram (Free) + Twilio WhatsApp for Heads | \$20.00 | ₹1,660 |
| **Total Monthly Running Cost** | **5 Campuses** | **\$165.50** | **₹13,740 / month** |

---

#### Tier C: State-wide Institutional Scale (20 Campuses)
- **Scale**: ~200,000 students · ~60,000 complaints/month.

| Service | Plan / Resource Details | Monthly Cost (USD) | Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **Compute** | AWS ECS / EKS or dedicated Hetzner Cluster | \$150.00 | ₹12,450 |
| **Database** | Managed AWS RDS PostgreSQL Multi-AZ | \$120.00 | ₹9,960 |
| **Upstash Redis** | Enterprise Pro Redis cluster | \$35.00 | ₹2,905 |
| **Google Gemini API** | Enterprise Tier quota (volume discounted) | \$65.00 | ₹5,395 |
| **Cloudflare R2** | ~150 GB storage | \$5.00 | ₹415 |
| **Translation Layer** | Dedicated Self-hosted IndicTrans2 GPU node (T4) | \$70.00 | ₹5,810 |
| **Mapping & Geo** | Self-hosted Protomaps / PMTiles on R2 CDN | \$15.00 | ₹1,245 |
| **Alerting Pipeline** | Resend Email Pro + Twilio WhatsApp HSM Alerts | \$60.00 | ₹4,980 |
| **Total Monthly Running Cost** | **20 Campuses** | **\$520.00** | **₹43,160 / month** |

---

## 3. Subscription & Revenue Model (B2B Higher-Ed SaaS)

### Key Market Realities in Indian Higher Education
1. **Never charge students**: The platform must remain 100% free for students to report issues. Charging students creates an immediate barrier to adoption.
2. **Do not sell per-seat or per-report**: University accounts departments resist variable monthly invoices. They require **predictable, annual fixed-budget contracts**.
3. **The Regulatory Procurement Driver (NAAC & NIRF)**:
   - **NAAC Criterion 5.1.4**: Mandates that every accredited institution have a transparent, documented, digital grievance redressal mechanism with statutory timelines.
   - **UGC (Grievance Redressal of Students) Regulations, 2023**: Mandates digital recording, ombudsperson tracking, and non-retaliatory grievance filing.
   - **Positioning**: Sell Anazori as an **"Accreditation-Compliant Digital Governance & Audit System"**, unlocking capital already earmarked in institutional development budgets.

---

### Packaging & Pricing Tiers

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│     CAMPUS STARTER      │  │   UNIVERSITY PRO        │  │     CAMPUS SYSTEM       │
│  Colleges & Institutes  │  │   Single Full Campus    │  │  State / Multi-Campus   │
│                         │  │                         │  │                         │
│   ₹49,000 / year        │  │   ₹1,80,000 / year      │  │   ₹4,50,000+ / year     │
│   (~$600 / year)        │  │   (~$2,200 / year)      │  │   (~$5,500 / year)      │
├─────────────────────────┤  ├─────────────────────────┤  ├─────────────────────────┤
│ • Up to 2,500 students  │  │ • Up to 15,000 students │  │ • Unlimited students    │
│ • Bilingual Web Portal  │  │ • Bilingual + Xongbado  │  │ • Multi-campus tenancy  │
│ • Standard AI Triage    │  │ • AI Evidence Proof     │  │ • Dedicated DB & SLA    │
│ • Admin Control Room    │  │ • Resolution Copilot    │  │ • Custom ERP / SIS sync │
│ • Email / CSV Exports   │  │ • Telegram/WA Alerts    │  │ • NAAC Audit Reports    │
│ • Community Upvoting    │  │ • Interactive Map View  │  │ • Dedicated Account Mgr │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

#### Tier Specifications

| Feature / Capability | Campus Starter (₹49k/yr) | University Pro (₹1.8L/yr) | Campus System (₹4.5L/yr) |
| :--- | :--- | :--- | :--- |
| **Target Institution** | Affiliated Arts/Science Colleges | Universities (e.g. Dibrugarh Univ) | Central/State University Systems |
| **Student Cap** | Up to 2,500 | Up to 15,000 | Unlimited across all colleges |
| **Supported Languages** | English & Assamese Unicode | English, Assamese, Xongbado | All 22 Scheduled Indian Languages |
| **Interactive Map Picker** | Standard campus pin | High-precision building geofencing | Multi-campus cluster mapping |
| **AI Evidence Verification** | Basic | Multimodal Before/After verification | Custom threshold + anti-tamper |
| **Admin Accounts** | Up to 5 departments | Unlimited departments & HODs | Role-based hierarchical access |
| **Compliance Exporter** | Standard CSV | 1-Click NAAC Criterion 5 Report | Custom regulatory compliance suite |
| **SLA & Support** | Email (48h) | Priority WhatsApp/Call (4h) | 99.9% Uptime SLA + Dedicated Onsite |

---

### Unit Economics & Gross Profit Margins

For a typical **University Pro contract (Dibrugarh University)**:
- **Annual Contract Value (ACV)**: ₹1,80,000 (\$2,170)
- **Annual Infrastructure Cost**: ₹3,960 × 12 = ₹47,520 (\$572)
- **Annual Gross Profit**: **₹1,32,480 (\$1,598)**
- **Gross Margin**: **~73.6%** (rises to **88%** on multi-campus deployments due to shared compute/DB infrastructure).

---

## 4. Bilingual Translation Pipeline: Alternatives & Roadmap

### Why the Current Translation API Must Be Replaced
Currently, `src/lib/translation.ts` connects to:
```typescript
const endpoint = process.env.TRANSLATION_API_URL || "https://api.dharun.dev/v1/translate";
```
While functional for hackathon prototyping, this community endpoint poses major production risks:
1. **Single Point of Failure**: Hosted on an unmonitored personal server without an SLA.
2. **Aggressive Latency & Timeouts**: Often exceeds our `1.8s` timeout, causing silent fallbacks to untranslated text.
3. **Strict Rate Limiting**: Limited to ~30 requests/minute, easily overwhelmed during campus rush hours.
4. **No Romanized Assamese (*Xongbado*) Understanding**: Fails when students type Assamese in English letters (e.g., *"Hostel B-t pani oha nai"*).

---

### Top 4 Enterprise Translation Alternatives

```
┌────────────────────────────────────────────────────────────────────────┐
│               TRANSLATION PROVIDER COMPARISON MATRIX                   │
└────────────────────────────────────────────────────────────────────────┘

  Provider         Assamese Quality   Xongbado Support   Latency     Cost / 1k Chars
  ──────────────────────────────────────────────────────────────────────────────
  1. BHASHINI       ★★★★★ (Native)     ★★★☆☆ (Phonetic)   150-250ms   Free / ₹0.05
  2. Sarvam AI      ★★★★☆ (Strong)     ★★★★★ (Native)     180-300ms   ₹0.20
  3. Self-Hosted    ★★★★★ (Model SOTA) ★★☆☆☆ (Needs Rule) 80-120ms    Fixed Server
  4. Google Cloud   ★★★☆☆ (Literal)    ★☆☆☆☆ (Poor)       80-150ms    ₹1.60 ($20/1M)
```

#### Option 1: BHASHINI (National Language Translation Mission - MeitY, Govt of India) — *Top Recommendation for Universities*
- **What it is**: The Government of India’s sovereign AI initiative for Indian languages, trained by AI4Bharat (IIT Madras).
- **Why it fits Anazori**:
  - Highest benchmark quality for Assamese (`as`) translation, speech recognition (ASR), and text-to-speech.
  - Subsidized or completely free for government universities, state academic bodies, and public civic tech.
  - Offers full data sovereignty (no data leaves India, complying with the DPDP Act 2023).
- **Integration**: Available via standard REST API (`https://dhruva-api.bhashini.gov.in/services/inference/pipeline`).

#### Option 2: Sarvam AI (`mayura:v1` / `sarvam-translate`) — *Best for Mixed & Romanized Assamese*
- **What it is**: Premier Indian generative AI research lab specializing in vernacular voice and text.
- **Why it fits Anazori**:
  - Incredible handling of code-mixed languages (*Hinglish*, *Axomiya-English*, *Xongbado*).
  - Handles unstructured slang and phonetic spelling errors typically made by students on mobile devices.
- **Pricing**: Approximately ₹0.15 to ₹0.25 per 1,000 characters.

#### Option 3: Self-Hosted AI4Bharat IndicTrans2 (vLLM / HuggingFace Inference Endpoints) — *Best for Long-Term Scale*
- **What it is**: Deploying the open-weights `ai4bharat/indictrans2-indic-en-1B` model on a dedicated cloud GPU instance.
- **Why it fits Anazori**:
  - **Zero variable cost per translation**: Once the GPU instance is running, 10,000 or 1,000,000 translations cost the exact same.
  - **Lowest latency**: Sub-100ms response time on local private networks.
- **Pricing**: ~$50 - $70/month on RunPod / Modal (NVIDIA T4 or L4 GPU).

#### Option 4: Google Cloud Translation API (Advanced v3)
- **Pros**: 99.99% uptime, global CDN, zero maintenance.
- **Cons**: High cost (\$20 per million characters) and poor comprehension of colloquial Assamese dialects and Romanized transcriptions.

---

### The 4-Layer Architecture for Production Bilingual Redressal

To create a flawless bilingual user experience across Assamese and English, implement this 4-layer pipeline:

```
Student Input (Voice / Assamese / Xongbado / English)
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 1: Script & Mode Classifier                      │
│ • Detects: Unicode Assamese, Romanized, or English     │
└────────────────────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Romanized / Xongbado]      [Assamese Unicode]
         │                           │
         ▼                           ▼
┌───────────────────────┐   ┌────────────────────────────┐
│ LAYER 2: Normalization│   │ LAYER 3: Redis Chunk Cache │
│ • Phonetic Mapping    │   │ • Key: sha256(as:en:text)  │
│ • Campus Glossary     │   │ • 80% cache hit on common  │
│   (e.g. CCSA, Block C)│   │   grievances = Zero cost!  │
└───────────────────────┘   └────────────────────────────┘
         │                               │
         └─────────────┬─────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 4: Bhashini / Sarvam Translation Engine          │
│ • Dual output: Formal English + Pure Assamese Unicode  │
└────────────────────────────────────────────────────────┘
                       │
                       ▼
Both Admin Control Room & Student Portal Render in Synced Dual Script
```

1. **Campus-Specific Named Entity Dictionary (Glossary Lock)**:
   - Prevents the translation engine from corrupting campus building names and academic terms (e.g. locking `"Department of Applied Geology"`, `"Aniruddha Dev Bhavan"`, `"Hostel Block C"`, `"Semester Fee Challan"` so they are never mistranslated into bizarre literal equivalents).
2. **Redis Semantic Translation Caching**:
   - Over 70% of student complaints share identical core descriptions (*"No water in washroom"*, *"Fan not working"*, *"Projector cable missing"*).
   - By hashing the normalized sentence structure in Upstash Redis with a 30-day TTL, API costs are slashed by up to 75%.
3. **Dual Script Generation at Ingestion**:
   - Store both `summaryEn` and `summaryAs` in the database upon report submission. Once stored, neither the student nor the admin view makes repeated translation requests.

---

## 5. Roadmap & Implementation Milestones

| Quarter | Milestone | Core Objectives | Key Metric |
| :--- | :--- | :--- | :--- |
| **Q1 (Current)** | **Production Readiness & Bhashini Migration** | • Migrate off `api.dharun.dev` to Bhashini/Sarvam.<br>• Move media from Postgres Base64 to Cloudflare R2.<br>• Implement Telegram Alert webhook for campus heads. | Zero translation timeouts; <200ms API response. |
| **Q2** | **Pilot Deployment at Dibrugarh University** | • Onboard Dibrugarh University Maintenance & Examination Cells.<br>• Implement NAAC Criterion 5 one-click export.<br>• Pilot student onboarding via campus QR codes. | 1,000+ verified campus issues tracked. |
| **Q3** | **Commercial SaaS Launch & GeM Listing** | • Register entity on Government e-Marketplace (GeM).<br>• Formalize University Pro Tier (₹1.8L/yr) contracts.<br>• Expand to 3 additional state universities in Assam. | ₹5.4 Lakhs ARR achieved. |
| **Q4** | **Scale & Self-Hosted IndicTrans2 Cluster** | • Deploy private GPU inference node for zero-cost translations.<br>• Launch WhatsApp student complaint intake bot.<br>• Expansion to northeast NITs and central institutions. | 15+ Campuses; 85%+ Gross Margin. |

---

*Authored for the Anazori Technical & Business Advisory Panel.*
