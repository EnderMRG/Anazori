import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateGeminiJson } from "@/lib/gemini";
import { isRateLimited } from "@/lib/redis";

export const runtime = "nodejs";

export type ApplicationDraftRequest = {
  complaint: {
    id: string;
    title: string;
    description: string;
    location: string;
    category?: string;
    priority?: string;
    upvotes?: number;
    reporter?: string;
    createdAt?: string;
    latitude?: number;
    longitude?: number;
  };
  templateType: "repair" | "installation" | "grievance";
  sender: {
    name: string;
    designation: string;
    department: string;
  };
  recipient: {
    title: string;
    institution: string;
  };
  throughChannel?: string;
};

export type ApplicationDraftResponse = {
  subject: string;
  throughChannel: string;
  salutation: string;
  p1: string;
  p2: string;
  p3: string;
  closing: string;
  signatory: string;
  enclosures: string[];
};

function composeRuleBasedDraft(req: ApplicationDraftRequest): ApplicationDraftResponse {
  const { complaint, templateType, sender, recipient } = req;
  const loc = complaint.location || "the campus premises";
  const upvotes = complaint.upvotes || 1;
  const ticketRef = complaint.id.startsWith("#") ? complaint.id : `#${complaint.id}`;

  const salutation = "Respected Sir,";
  const closing = "Thanking you.\n\nYours faithfully,";
  const signatory = `${sender.name}\n${sender.designation}\n${sender.department}\nDibrugarh University`;
  const enclosures = [
    `Anazori Campus Grievance Docket Reference (${ticketRef})`,
    complaint.latitude && complaint.longitude
      ? `Spatial Geotag Record: ${complaint.latitude.toFixed(4)}° N, ${complaint.longitude.toFixed(4)}° E`
      : "On-site Verification & Photographic Record",
  ];

  if (templateType === "repair") {
    const isElectrical = /electric|wire|switch|shock|mcb|light|fan/i.test(complaint.title + " " + complaint.description);
    const isPlumbing = /water|leak|pipe|washroom|tap|drain|toilet/i.test(complaint.title + " " + complaint.description);

    let defectType = "infrastructure damage and breakdown";
    if (isElectrical && isPlumbing) defectType = "severe water leakage and associated electrical distribution hazard";
    else if (isPlumbing) defectType = "water supply leakage and plumbing breakdown";
    else if (isElectrical) defectType = "electrical fault and hazard";

    return {
      subject: `Application regarding urgent repair and restoration of ${defectType} at ${loc}`,
      throughChannel: req.throughChannel || "[Through Proper Channel: Office of the Head of Department / Warden]",
      salutation,
      p1: `I would like to bring to your kind notice an urgent infrastructure problem at ${loc}. ${complaint.description.trim()}`,
      p2: `This breakdown has caused severe hardship to students and staff utilizing the area. Furthermore, the issue has been reported and endorsed by ${upvotes} student${upvotes > 1 ? "s" : ""} on the campus grievance portal under Ticket ${ticketRef}. If not rectified promptly, it poses an immediate safety and functional risk.`,
      p3: `In view of the serious inconvenience and potential safety concerns, I earnestly request your kind approval to direct the University Engineer (Planning & Construction Branch) to conduct an immediate on-site inspection and carry out the necessary repair work on high priority.`,
      closing,
      signatory,
      enclosures,
    };
  }

  if (templateType === "installation") {
    return {
      subject: `Application for requisition and installation of necessary facility (${complaint.title}) at ${loc}`,
      throughChannel: req.throughChannel || "[Through Proper Channel: Office of the Dean, Student Welfare]",
      salutation,
      p1: `With due respect, I wish to submit a proposal for the installation of essential campus infrastructure at ${loc}. ${complaint.description.trim()}`,
      p2: `Over ${upvotes > 1 ? upvotes : "multiple"} students have petitioned for this installation on the campus redressal portal (Ref: ${ticketRef}). The absence of this facility causes persistent difficulty in daily student academic and residential activities.`,
      p3: `In accordance with campus development and welfare norms, I kindly request your favourable consideration to direct the Planning & Development Section to evaluate technical feasibility and sanction the required installation at the earliest.`,
      closing,
      signatory,
      enclosures,
    };
  }

  // Grievance / Academic
  return {
    subject: `Application regarding redressal of student grievance (${complaint.title}) at ${loc}`,
    throughChannel: req.throughChannel || "[Through Proper Channel: The Controller of Examinations / Convener, Grievance Cell]",
    salutation,
    p1: `I beg to place before your kind authority an urgent student grievance regarding ${complaint.title.toLowerCase()} at ${loc}. ${complaint.description.trim()}`,
    p2: `The matter has been logged on the student grievance portal under Docket ID ${ticketRef} with verified student representation (${upvotes} affected student${upvotes > 1 ? "s" : ""}). This issue requires administrative review to avoid undue academic disruption.`,
    p3: `I humbly request your kind authority to direct the concerned administrative/examination branch to examine the relevant records and issue the appropriate remedial orders at the earliest.`,
    closing,
    signatory,
    enclosures,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  if (await isRateLimited(`ai-gen-app:${session.id}`, 20, 60)) {
    return NextResponse.json({ error: "Too many application generation requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as ApplicationDraftRequest;
    if (!body?.complaint?.title) {
      return NextResponse.json({ error: "Missing complaint data." }, { status: 400 });
    }

    const fallback = composeRuleBasedDraft(body);

    // If Gemini is available, refine the formal letter tone
    try {
      const prompt = `You are an expert executive secretary in an Indian state university (Dibrugarh University, Assam).
Write a dignified, formal academic application letter to university authorities (${body.recipient.title}, ${body.recipient.institution}).
The letter must have:
- A respectful, precise Subject line starting with "Application regarding..."
- Paragraph 1: State what is broken / required and the exact location (${body.complaint.location}).
- Paragraph 2: Explain the student inconvenience, urgency, safety risk, and mention that ${body.complaint.upvotes || 1} students reported it under Ticket #${body.complaint.id}.
- Paragraph 3: Respectfully request the authority to direct the concerned department (e.g. University Engineer, P&C Branch, or Registrar) to inspect and sanction the work.

Input details:
- Template type: ${body.templateType} (repair / installation / grievance)
- Issue title: ${body.complaint.title}
- Issue description: ${body.complaint.description}
- Location: ${body.complaint.location}
- Priority: ${body.complaint.priority || "Normal"}
- Submitting Officer: ${body.sender.name}, ${body.sender.designation}, ${body.sender.department}
- Recipient: ${body.recipient.title}, ${body.recipient.institution}

Return strictly a JSON object:
{
  "subject": "string",
  "p1": "string",
  "p2": "string",
  "p3": "string"
}`;

      const aiResult = (await generateGeminiJson(prompt)) as {
        subject?: string;
        p1?: string;
        p2?: string;
        p3?: string;
      };

      if (aiResult?.subject && aiResult?.p1 && aiResult?.p2 && aiResult?.p3) {
        return NextResponse.json({
          ...fallback,
          subject: aiResult.subject,
          p1: aiResult.p1,
          p2: aiResult.p2,
          p3: aiResult.p3,
        });
      }
    } catch {
      // Graceful fallback to rule-based composer
    }

    return NextResponse.json(fallback);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate application." },
      { status: 500 }
    );
  }
}
