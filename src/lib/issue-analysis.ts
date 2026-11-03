export type IssueLanguage = "en" | "as" | "mixed";
export type IssuePriority = "Critical" | "High" | "Medium" | "Low";
import { translateText } from "@/lib/translation";

export type IssueAnalysis = {
  category: string;
  department: string;
  priority: IssuePriority;
  language: IssueLanguage;
  tags: string[];
  summaryEn: string;
  summaryAs: string;
  justification: string;
  confidence: number;
  imageAssessment: string;
};

type AnalysisInput = { title: string; description: string; location: string; image?: string };

const rules = [
  { category: "Water supply", department: "Maintenance", aliases: ["water", "tap", "pipe", "leak", "পানী", "পানীৰ", "পাইপ", "জল"], tags: ["#Plumbing"], priority: "High" as IssuePriority },
  { category: "Internet / Wi-Fi", department: "IT Services", aliases: ["wifi", "wi-fi", "internet", "network", "router", "ৱাই", "ইণ্টাৰনেট", "নেটৱৰ্ক"], tags: ["#Networking"], priority: "Medium" as IssuePriority },
  { category: "Safety & security", department: "Estate & Security", aliases: ["light", "streetlight", "security", "unsafe", "dark", "theft", "আলো", "সুৰক্ষা", "বিপদ"], tags: ["#Safety"], priority: "High" as IssuePriority },
  { category: "Cleanliness", department: "Sanitation", aliases: ["waste", "garbage", "rubbish", "clean", "toilet", "আৱৰ্জনা", "পৰিষ্কাৰ", "জাবৰ", "শৌচালয়"], tags: ["#Sanitation"], priority: "Low" as IssuePriority },
  { category: "Electrical & power", department: "Maintenance", aliases: ["electric", "electricity", "power", "outage", "voltage", "socket", "spark", "বিদ্যুৎ", "কাৰেণ্ট"], tags: ["#Electrical"], priority: "High" as IssuePriority },
  { category: "Lab & equipment", department: "Maintenance", aliases: ["lab", "laboratory", "equipment", "instrument", "projector", "microscope", "পৰীক্ষাগাৰ", "সঁজুলি"], tags: ["#Equipment"], priority: "Medium" as IssuePriority },
  { category: "Furniture & facilities", department: "Maintenance", aliases: ["chair", "desk", "bench", "table", "furniture", "door", "window", "আচবাব", "দুৱাৰ", "খিৰিকী"], tags: ["#CivilWork"], priority: "Medium" as IssuePriority },
  { category: "Transport & access", department: "Campus Administration", aliases: ["bus", "transport", "parking", "road", "pothole", "vehicle", "বাছ", "পথ"], tags: ["#Access"], priority: "Medium" as IssuePriority },
  { category: "Exam fees", department: "Accounts & Finance", aliases: ["exam fee", "examination fee", "exam fees", "পৰীক্ষাৰ মাচুল"], tags: ["#StudentServices", "#Fees"], priority: "High" as IssuePriority },
  { category: "Semester fees", department: "Accounts & Finance", aliases: ["semester fee", "semester fees", "tuition fee", "tuition fees", "মাচুল"], tags: ["#StudentServices", "#Fees"], priority: "Medium" as IssuePriority },
  { category: "Scholarships & financial aid", department: "Scholarship Office", aliases: ["scholarship", "stipend", "financial aid", "grant", "বৃত্তি", "জলপানি"], tags: ["#StudentServices", "#Scholarship"], priority: "High" as IssuePriority },
  { category: "Student welfare & counselling", department: "Student Welfare Office", aliases: ["student welfare", "welfare", "counselling", "counseling", "mental health", "wellbeing", "কল্যাণ", "পৰামৰ্শ"], tags: ["#StudentServices", "#Welfare"], priority: "High" as IssuePriority },
  { category: "Library services", department: "Library Services", aliases: ["library", "book", "librarian", "library fine", "লাইব্ৰেৰী", "কিতাপ"], tags: ["#StudentServices", "#Library"], priority: "Medium" as IssuePriority },
  { category: "Examinations & marksheets", department: "Examination Cell", aliases: ["examination", "marksheet", "mark sheet", "result", "grade", "exam form", "পৰীক্ষা", "নম্বৰ", "মাৰ্কশ্বীট"], tags: ["#StudentServices", "#Examinations"], priority: "Medium" as IssuePriority },
  { category: "Registration & enrollment", department: "Academic Section", aliases: ["registration", "enrollment", "enrolment", "course registration", "admission", "পঞ্জীয়ন", "নামভৰ্তি"], tags: ["#StudentServices", "#Academic"], priority: "Medium" as IssuePriority },
  { category: "Certificates & documents", department: "Registrar's Office", aliases: ["bonafide", "migration", "certificate", "transcript", "document", "প্ৰমাণপত্ৰ", "নথি"], tags: ["#StudentServices", "#Documents"], priority: "Low" as IssuePriority },
  { category: "Hostel & student support", department: "Student Welfare Office", aliases: ["hostel allotment", "hostel complaint", "student support", "ছাত্ৰাবাস", "শিক্ষাৰ্থী সহায়"], tags: ["#StudentServices", "#StudentSupport"], priority: "Medium" as IssuePriority },
];

const stopWords = new Set(["the", "and", "for", "with", "this", "that", "there", "have", "been", "from", "since", "near", "issue", "problem", "মই", "এই", "আছে", "নাই", "কৰা"]);

function normalise(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\u200c\u200d]/g, " ");
}

function hasAlias(text: string, alias: string) {
  const value = normalise(alias);
  return text.includes(value);
}

function locationTag(location: string) {
  const words = location.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return "#Campus";
  return `#${words.map((word) => word[0].toUpperCase() + word.slice(1)).join("")}`;
}

function facilityTag(location: string) {
  const text = normalise(location);
  if (text.includes("hostel") || text.includes("ছাত্ৰাবাস")) return "#Hostel";
  if (text.includes("library") || text.includes("লাইব্ৰেৰী")) return "#CentralLibrary";
  if (text.includes("lab") || text.includes("পৰীক্ষাগাৰ")) return "#ScienceLab";
  if (text.includes("admin") || text.includes("প্ৰশাসন")) return "#AdminBlock";
  if (text.includes("gate") || text.includes("প্ৰৱেশ")) return "#CampusGate";
  return locationTag(location);
}

export function detectLanguage(value: string): IssueLanguage {
  const assamese = (value.match(/[\u0980-\u09ff]/g) || []).length;
  const latin = (value.match(/[a-z]/gi) || []).length;
  if (assamese && latin) return "mixed";
  return assamese ? "as" : "en";
}

export function analyseIssue({ title, description, location, image }: AnalysisInput): IssueAnalysis {
  const text = normalise(`${title} ${description} ${location}`);
  const rule = rules.find((candidate) => candidate.aliases.some((alias) => hasAlias(text, alias)));
  const hazard = ["fire", "smoke", "spark", "shock", "danger", "unsafe", "injury", "বিপদ", "জুই"].some((term) => hasAlias(text, term));
  const category = rule?.category || "Other campus issue";
  const department = rule?.department || "Campus Administration";
  const priority: IssuePriority = hazard ? "Critical" : (rule?.priority || "Medium");
  const tags = Array.from(new Set([facilityTag(location), ...(rule?.tags || ["#CampusCare"]), hazard ? "#Hazard" : priority === "Low" ? "#Routine" : priority === "Medium" ? "#Standard" : "#Urgent"])).slice(0, 4);
  const language = detectLanguage(`${title} ${description}`);
  const report = title.trim() || description.trim() || "Campus issue";
  const summaryEn = `${report} was reported at ${location || "the campus"}. The campus team will review this issue${image ? " with the attached evidence" : ""}.`;
  const summaryAs = `${location || "কেম্পাছ"} স্থানত এই সমস্যাটোৰ অভিযোগ দাখিল কৰা হৈছে। কেম্পাছৰ সংশ্লিষ্ট দলে ইয়াক পৰ্যালোচনা কৰিব${image ? " আৰু সংলগ্ন ছবিখন পৰীক্ষা কৰিব" : ""}।`;
  return { category, department, priority, language, tags, summaryEn, summaryAs, justification: `Matched ${category.toLowerCase()} signals and routed to ${department}.`, confidence: rule ? 0.86 : 0.48, imageAssessment: image ? "Image attached for staff review." : "No image attached." };
}

export async function improveBilingualSummaries(input: AnalysisInput, analysis: IssueAnalysis): Promise<IssueAnalysis> {
  const description = input.description.trim();
  const source = (description || input.title.trim()).replace(/\s+/g, " ").slice(0, 1900);
  const containsAssamese = /[\u0980-\u09ff]/u.test(source);
  const translatedSource = containsAssamese ? await translateText(source, "as", "en") : source;
  const reportEn = (translatedSource || source).replace(/\s+/g, " ").trim();
  const summaryEn = `${reportEn} Reported at ${input.location || "the campus"}. The campus team will review this issue.`.slice(0, 500);
  const summaryAs = await translateText(summaryEn, "en", "as");
  return { ...analysis, summaryEn, summaryAs: summaryAs || analysis.summaryAs };
}

export async function analyseIssueWithProvider(input: AnalysisInput, fallback = analyseIssue(input)) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { result: fallback, provider: "local" };
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const parts: Array<Record<string, unknown>> = [{ text: `Analyse this campus grievance or student service request. It may concern physical campus conditions, administration, examinations, fees, library services, scholarships, or student welfare. Return only JSON with category, department, priority (Critical|High|Medium|Low), language (en|as|mixed), tags (2-4 hashtag strings), summaryEn, summaryAs, justification, and confidence (0-1). Preserve concrete details from the report in both summaries. Do not invent facts.\nTitle: ${input.title}\nDescription: ${input.description}\nLocation: ${input.location}` }];
  if (input.image?.startsWith("data:")) {
    const match = input.image.match(/^data:([^;]+);base64,(.+)$/);
    if (match && Buffer.byteLength(match[2], "base64") <= 8 * 1024 * 1024) parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const value = JSON.parse(raw) as Record<string, unknown>;
  const priority = ["Critical", "High", "Medium", "Low"].includes(String(value.priority)) ? String(value.priority) as IssuePriority : fallback.priority;
  const language = ["en", "as", "mixed"].includes(String(value.language)) ? String(value.language) as IssueLanguage : fallback.language;
  const result = { ...fallback, category: typeof value.category === "string" ? value.category.slice(0, 80) : fallback.category, department: typeof value.department === "string" ? value.department.slice(0, 80) : fallback.department, priority, language, tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.startsWith("#") ? tag : `#${tag}`).slice(0, 4) : fallback.tags, summaryEn: typeof value.summaryEn === "string" ? value.summaryEn.slice(0, 500) : fallback.summaryEn, summaryAs: typeof value.summaryAs === "string" ? value.summaryAs.slice(0, 500) : fallback.summaryAs, justification: typeof value.justification === "string" ? value.justification.slice(0, 300) : fallback.justification, confidence: typeof value.confidence === "number" ? Math.max(0, Math.min(1, value.confidence)) : fallback.confidence };
  return { provider: "gemini", result: await improveBilingualSummaries(input, result) };
}

export function canonicalTerms(value: string) {
  const text = normalise(value);
  return new Set(rules.filter((rule) => rule.aliases.some((alias) => hasAlias(text, alias))).map((rule) => rule.category));
}

export function tokens(value: string) {
  return new Set(normalise(value).split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2 && !stopWords.has(token)));
}

export function duplicateScore(current: AnalysisInput & { category?: string; tags?: string[] }, existing: AnalysisInput & { category?: string; tags?: string[] }) {
  const currentLocation = normalise(current.location).trim();
  const existingLocation = normalise(existing.location).trim();
  const sameLocation = currentLocation.length > 0 && currentLocation === existingLocation;
  const currentTerms = canonicalTerms(`${current.title} ${current.description} ${current.category || ""}`);
  const existingTerms = canonicalTerms(`${existing.title} ${existing.description} ${existing.category || ""}`);
  const sharedTerms = [...currentTerms].filter((term) => existingTerms.has(term)).length;
  const currentTokens = tokens(`${current.title} ${current.description}`);
  const existingTokens = tokens(`${existing.title} ${existing.description}`);
  const sharedTokens = [...currentTokens].filter((token) => existingTokens.has(token)).length;
  const tagOverlap = (current.tags || []).filter((tag) => (existing.tags || []).includes(tag)).length;
  if (sameLocation && sharedTerms > 0) return 0.88;
  if (sameLocation && tagOverlap > 0 && sharedTokens > 0) return 0.82;
  if (sharedTerms > 0 && sharedTokens >= 2) return 0.8;
  return 0;
}

export function escalatedPriority(upvotes: number, current: IssuePriority): IssuePriority {
  if (upvotes >= 15) return "Critical";
  if (upvotes >= 5 && current !== "Critical") return "High";
  return current;
}
