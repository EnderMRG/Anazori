"use client";

import { AlertCircle, Building2, Camera, Check, CheckCircle2, FolderOpen, ImagePlus, Languages, Loader2, MapPin, Sparkles, Tag, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import type { Campus } from "@/lib/campuses";
import type { Complaint, Language, Priority, Status } from "@/components/CivicSenseApp";

type ComplaintUpdate = Partial<Complaint>;
type UpdateComplaint = (id: string, updates: ComplaintUpdate) => Promise<boolean>;

type ServiceField = { key: string; label: string; placeholder: string };
type StudentServiceOption = { label: string; department: string; prompt: string; requestLabel: string; requestPlaceholder: string; detailsLabel: string; contextLabel: string; contextPlaceholder: string; fields: ServiceField[] };

export const studentServiceOptions: StudentServiceOption[] = [
  { label: "Library services", department: "Library Services", prompt: "Tell us about a book, account, fine, or library access issue.", requestLabel: "What do you need help with?", requestPlaceholder: "e.g. My library account is blocked", detailsLabel: "Describe the library issue", contextLabel: "Library or book context", contextPlaceholder: "e.g. Central Library · Book title or accession number", fields: [{ key: "studentId", label: "Student or library card number", placeholder: "e.g. DU2024CS001" }, { key: "bookReference", label: "Book, fine, or account reference", placeholder: "e.g. Book title or fine receipt number" }] },
  { label: "Examinations & marksheets", department: "Examination Cell", prompt: "Use this form for exam forms, results, marksheets, grades, or correction requests.", requestLabel: "What examination help do you need?", requestPlaceholder: "e.g. My marksheet has an incorrect subject grade", detailsLabel: "Explain the examination or marksheet issue", contextLabel: "Examination context", contextPlaceholder: "e.g. Semester 4 · End-semester examination 2026", fields: [{ key: "studentId", label: "Roll number or student ID", placeholder: "e.g. DU2024CS001" }, { key: "examReference", label: "Subject, paper, or reference number", placeholder: "e.g. CS204 · Result correction" }] },
  { label: "Exam fees", department: "Accounts & Finance", prompt: "Report a payment problem, missing receipt, deadline concern, or exam fee query.", requestLabel: "What is the exam fee issue?", requestPlaceholder: "e.g. Payment was deducted but my exam form is still locked", detailsLabel: "Describe the fee or payment problem", contextLabel: "Examination and payment context", contextPlaceholder: "e.g. Semester 4 · Paid on 12 March 2026", fields: [{ key: "studentId", label: "Roll number or student ID", placeholder: "e.g. DU2024CS001" }, { key: "transactionReference", label: "Transaction ID or payment reference", placeholder: "e.g. UPI transaction number" }] },
  { label: "Semester fees", department: "Accounts & Finance", prompt: "Get help with semester tuition fees, dues, receipts, refunds, or payment status.", requestLabel: "What is the semester fee issue?", requestPlaceholder: "e.g. My fee payment is not reflected in the portal", detailsLabel: "Describe the semester fee problem", contextLabel: "Programme and payment context", contextPlaceholder: "e.g. BSc Computer Science · Semester 4", fields: [{ key: "studentId", label: "Student ID or enrollment number", placeholder: "e.g. DU2024CS001" }, { key: "transactionReference", label: "Transaction ID or receipt number", placeholder: "e.g. Fee receipt reference" }] },
  { label: "Registration & enrollment", department: "Academic Section", prompt: "Use this for admission, course registration, enrollment, or subject selection support.", requestLabel: "What registration help do you need?", requestPlaceholder: "e.g. I cannot register for a required course", detailsLabel: "Describe the registration or enrollment issue", contextLabel: "Academic context", contextPlaceholder: "e.g. MSc Physics · Semester 2 · Course code PHY202", fields: [{ key: "studentId", label: "Student ID or application number", placeholder: "e.g. DU2024CS001" }, { key: "courseReference", label: "Course, programme, or registration reference", placeholder: "e.g. Course code or application ID" }] },
  { label: "Certificates & documents", department: "Registrar's Office", prompt: "Request help with bonafide certificates, migration, transcripts, documents, or certificate corrections.", requestLabel: "Which document service do you need?", requestPlaceholder: "e.g. I need a bonafide certificate for a scholarship", detailsLabel: "Describe the document request", contextLabel: "Document context", contextPlaceholder: "e.g. Required by 30 April · For internship application", fields: [{ key: "studentId", label: "Student ID or roll number", placeholder: "e.g. DU2024CS001" }, { key: "documentReference", label: "Document or application reference", placeholder: "e.g. Application number, if available" }] },
  { label: "Scholarships & financial aid", department: "Scholarship Office", prompt: "Ask about scholarship eligibility, applications, stipends, renewals, or delayed financial aid.", requestLabel: "What scholarship help do you need?", requestPlaceholder: "e.g. My scholarship renewal is still pending", detailsLabel: "Describe your scholarship or financial aid issue", contextLabel: "Scholarship context", contextPlaceholder: "e.g. Post-Matric Scholarship · Renewal for 2026", fields: [{ key: "studentId", label: "Student ID or enrollment number", placeholder: "e.g. DU2024CS001" }, { key: "scholarshipReference", label: "Scholarship name or application reference", placeholder: "e.g. Scheme name or application ID" }] },
  { label: "Student welfare & counselling", department: "Student Welfare Office", prompt: "Share a welfare, counselling, accessibility, or student support concern in the way that feels comfortable for you.", requestLabel: "What support do you need?", requestPlaceholder: "e.g. I would like to speak with a counsellor", detailsLabel: "Tell us how we can support you", contextLabel: "Preferred contact or support context", contextPlaceholder: "e.g. Preferred contact time or accessibility need", fields: [{ key: "studentId", label: "Student ID (optional)", placeholder: "You may leave this blank" }, { key: "contactPreference", label: "Preferred contact method", placeholder: "e.g. Email, phone, or in-person appointment" }] },
  { label: "Hostel & student support", department: "Student Welfare Office", prompt: "Get help with hostel administration, allotment, room changes, or student support services.", requestLabel: "What hostel or support help do you need?", requestPlaceholder: "e.g. I need help with my hostel allotment", detailsLabel: "Describe the hostel or support issue", contextLabel: "Hostel context", contextPlaceholder: "e.g. Hostel block, room number, or application date", fields: [{ key: "studentId", label: "Student ID or enrollment number", placeholder: "e.g. DU2024CS001" }, { key: "hostelReference", label: "Hostel or application reference", placeholder: "e.g. Block C · Room 204" }] },
];

function readImage(event: ChangeEvent<HTMLInputElement>, onImage: (value: string) => void, onError: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    onError("Please choose an image smaller than 8 MB.");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onImage(typeof reader.result === "string" ? reader.result : "");
  reader.onerror = () => onError("We could not read that image. Please try again.");
  reader.readAsDataURL(file);
}

function PhotoUpload({ image, onImage, onError, label = "Add a photo" }: { image: string; onImage: (value: string) => void; onError: (value: string) => void; label?: string }) {
  return <div className="photo-upload"><span className="photo-upload-label">{label}</span><div className="upload-box">{image ? <img src={image} alt={`${label} preview`} /> : <><ImagePlus size={20} /><span>Upload image</span></>}<div className="photo-upload-actions"><label className="photo-action"><Camera size={14} /><span>Take photo</span><input type="file" accept="image/*" capture="environment" onChange={(event) => readImage(event, onImage, onError)} /></label><label className="photo-action"><FolderOpen size={14} /><span>Choose file</span><input type="file" accept="image/*" onChange={(event) => readImage(event, onImage, onError)} /></label></div><small>PNG, JPG up to 8MB</small></div></div>;
}

export function ComplaintFormWorkflow({ language, campus, serviceCategory, onClose, onSubmit }: { language: Language; campus: Campus; serviceCategory?: string; onClose: () => void; onSubmit: (complaint: Complaint) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(serviceCategory ? "Student Services" : "");
  const [selectedService, setSelectedService] = useState(serviceCategory || studentServiceOptions[0].label);
  const [image, setImage] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");
  const [serviceFields, setServiceFields] = useState<Record<string, string>>({});
  const serviceDetails = studentServiceOptions.find((item) => item.label === selectedService);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) { setError("Please complete the title, description and location."); return; }
    setError("");
    setAnalysing(true);
    const fieldDetails = serviceCategory && serviceDetails ? serviceDetails.fields.map((field) => serviceFields[field.key]?.trim() ? `${field.label}: ${serviceFields[field.key].trim()}` : "").filter(Boolean).join("\n") : "";
    const requestDescription = [description.trim(), fieldDetails].filter(Boolean).join("\n\n");
    try {
      const response = await fetch("/api/ai/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: requestDescription, location, image }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyse the report.");
      setAnalysis(data);
      const selectedServiceDetails = studentServiceOptions.find((item) => item.label === selectedService);
      const category = serviceCategory ? selectedService : String(data.category || "Other campus issue");
      const department = serviceCategory ? selectedServiceDetails?.department || "Student Services" : String(data.department || "Campus Administration");
      const tags = Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [];
      await onSubmit({ id: "", title, description: requestDescription, language: (data.language || language) as Language, category, priority: (data.priority || "Medium") as Priority, department, summaryEn: String(data.summaryEn || "This report is awaiting review."), summaryAs: String(data.summaryAs || "এই প্ৰতিবেদনটো পৰ্যালোচনাৰ বাবে অপেক্ষা কৰি আছে।"), status: "Submitted", location, createdAt: "Just now", image, reporter: "", tags: serviceCategory ? Array.from(new Set(["#StudentServices", ...tags])).slice(0, 4) : tags, upvotes: 1, campusName: campus.name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the report.");
    } finally {
      setAnalysing(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="form-modal"><div className="modal-top"><div><span className="modal-kicker"><Sparkles size={13} /> {serviceCategory ? "STUDENT SERVICES" : "BILINGUAL AI REPORTING"}</span><h2>{serviceCategory ? selectedService : "Report a campus issue"}</h2><p>{serviceCategory ? serviceDetails?.prompt : "Describe the issue naturally. AI will classify and route it to the right team."}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form onSubmit={analyze}><div className="form-language"><Languages size={16} /><span>Writing in <b>{language === "en" ? "English" : "অসমীয়া"}</b></span><span className="form-language-hint">English, Assamese, or both</span></div>{serviceCategory && <label className="field-label">Service type<select value={selectedService} onChange={(event) => { setSelectedService(event.target.value); setServiceFields({}); setAnalysis(null); }}>{studentServiceOptions.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>}{serviceCategory && serviceDetails?.fields.map((field) => <label className="field-label" key={field.key}>{field.label}<input value={serviceFields[field.key] || ""} onChange={(event) => setServiceFields((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /></label>)}<label className="field-label">{serviceCategory ? serviceDetails?.requestLabel : "What is the issue?"}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={serviceCategory ? serviceDetails?.requestPlaceholder : language === "en" ? "e.g. No water in hostel block C" : "উদাহৰণ: ছাত্ৰাবাসত পানী নাই"} /></label><label className="field-label">{serviceCategory ? serviceDetails?.detailsLabel : "Describe the problem"}<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={serviceCategory ? "Include dates, references, or any relevant details..." : language === "en" ? "Add details that could help us resolve this faster..." : "সমস্যাটোৰ বিষয়ে অধিক বিৱৰণ দিয়ক..."} rows={4} /></label><div className="form-two-col"><label className="field-label">{serviceCategory ? serviceDetails?.contextLabel : "Where is it?"}<div className="input-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={serviceCategory ? serviceDetails?.contextPlaceholder : "e.g. Hostel block C"} /></div></label><PhotoUpload image={image} onImage={setImage} onError={setError} label={serviceCategory ? "Add a supporting document or photo" : "Add a before photo"} /></div>{analysis && <div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis complete</div><span>{String(analysis.provider || "local")}</span></div><div className="ai-tags"><span><Tag size={13} />{serviceCategory ? selectedService : String(analysis.category)}</span><span><Building2 size={13} />{serviceCategory ? serviceDetails?.department : String(analysis.department)}</span><span><AlertCircle size={13} />{String(analysis.priority)} priority</span></div></div>}{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}<button className="primary-button form-submit" disabled={analysing}>{analysing ? <><Loader2 size={17} className="spin" /> Analysing request...</> : <><Sparkles size={17} /> Analyse & submit request</>}</button></form></div></div>;
}

export function ComplaintDetailWorkflow({ complaint, language, onClose, onUpdate, role }: { complaint: Complaint; language: Language; onClose: () => void; onUpdate: UpdateComplaint; role: "student" | "admin" }) {
  const [afterImage, setAfterImage] = useState(complaint.resolvedImage || "");
  const [notes, setNotes] = useState(complaint.resolutionNotes || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const tags = complaint.tags || [];

  async function update(status: Status) {
    setError("");
    if (status === "Resolved" && !afterImage) { setError("An after photo is required before resolving this complaint."); return; }
    setSaving(true);
    try {
      let resolutionNotes = notes;
      if (status === "Resolved") {
        const verification = await fetch("/api/ai/verify-resolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ before: complaint.image, after: afterImage, description: complaint.description }) });
        const result = await verification.json();
        if (!verification.ok || !result.verified) throw new Error(result.error || result.message || "The before and after photos could not verify that the issue was resolved.");
        resolutionNotes = [notes, `Evidence verification (${result.provider}): ${result.message}`].filter(Boolean).join(" ");
      }
      const ok = await onUpdate(complaint.id, { status, resolvedImage: afterImage, resolutionNotes });
      if (ok && status === "Resolved") onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify the resolution evidence.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="detail-modal"><div className="modal-top"><div><span className="modal-kicker">{complaint.id} · REPORTED {complaint.createdAt.toUpperCase()}</span><h2>{complaint.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><div className="detail-status-row"><span className={`status-pill status-${complaint.status === "In progress" ? "progress" : complaint.status.toLowerCase()}`}><i />{complaint.status}</span><span className={`priority priority-${complaint.priority.toLowerCase()}`}><span className="priority-dot" />{complaint.priority} priority</span><span className="detail-location"><MapPin size={14} />{complaint.location}</span></div><div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis</div><span>{complaint.upvotes || 1} affected student{(complaint.upvotes || 1) === 1 ? "" : "s"}</span></div><div className="ai-summary"><div><b>English summary</b><p>{complaint.summaryEn}</p></div><div><b>অসমীয়া সাৰাংশ</b><p>{complaint.summaryAs}</p></div></div><div className="ai-tags"><span><Tag size={13} />{complaint.category}</span><span><Building2 size={13} />{complaint.department}</span><span><Languages size={13} />{complaint.language === "as" ? "Assamese" : complaint.language === "mixed" ? "Mixed language" : "English"}</span>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="detail-section"><h3>Original report</h3><p className="original-report">{language === "as" ? complaint.description : complaint.description}</p>{complaint.image && <img className="report-image" src={complaint.image} alt="Before evidence" />}<div className="reporter-line"><div className="mini-avatar">{complaint.reporter.split(" ").map((word) => word[0]).join("")}</div><span>Reported by <b>{complaint.reporter}</b></span></div></div>{role === "admin" && <div className="detail-section resolution-proof"><h3>Resolution proof</h3><p>Upload an after photo before marking this issue resolved.</p>{complaint.resolvedImage && <img className="report-image" src={complaint.resolvedImage} alt="Verified after evidence" />}<PhotoUpload image={afterImage} onImage={setAfterImage} onError={setError} label="After photo" /><textarea className="resolution-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Resolution notes (optional)" rows={3} />{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}<div className="resolution-actions">{complaint.status === "Submitted" && <button className="secondary-button" disabled={saving} onClick={() => update("In progress")}>Assign to {complaint.department}</button>}{complaint.status !== "Resolved" && <button className="primary-button" disabled={saving} onClick={() => update("Resolved")}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Resolve with proof</button>}</div></div>}{complaint.resolvedImage && complaint.status === "Resolved" && <div className="verified-proof"><CheckCircle2 size={17} /> Resolution proof submitted{complaint.resolutionNotes ? `: ${complaint.resolutionNotes}` : ""}</div>}<div className="timeline"><h3>Activity</h3><TimelineItem active title="Report submitted" time={complaint.createdAt} text="Your report was received by CivicSense." /><TimelineItem active={complaint.status !== "Submitted"} title="Assigned to the right department" time={complaint.status === "Submitted" ? "Pending" : "Updated"} text={`${complaint.department} is responsible for this issue.`} /><TimelineItem active={complaint.status === "Resolved"} last title="Resolved with proof" time={complaint.status === "Resolved" ? "Completed" : "Pending"} text={complaint.status === "Resolved" ? "The submitted after photo is available above." : "A resolution update will appear here."} /></div></div></div>;
}

function TimelineItem({ active, title, time, text, last }: { active: boolean; title: string; time: string; text: string; last?: boolean }) {
  return <div className={`timeline-item ${active ? "timeline-active" : ""}`}><div className="timeline-marker">{active ? <Check size={12} /> : <span />}</div>{!last && <div className="timeline-line" />}<div className="timeline-copy"><div><b>{title}</b><span>{time}</span></div><p>{text}</p></div></div>;
}
