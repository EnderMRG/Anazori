"use client";

import { AlertCircle, Building2, Camera, Check, CheckCircle2, FolderOpen, ImagePlus, Languages, Loader2, MapPin, Sparkles, Tag, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import type { Campus } from "@/lib/campuses";
import type { Complaint, Language, Priority, Status } from "@/components/CivicSenseApp";

type ComplaintUpdate = Partial<Complaint>;
type UpdateComplaint = (id: string, updates: ComplaintUpdate) => Promise<boolean>;

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

export function ComplaintFormWorkflow({ language, campus, onClose, onSubmit }: { language: Language; campus: Campus; onClose: () => void; onSubmit: (complaint: Complaint) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) { setError("Please complete the title, description and location."); return; }
    setError("");
    setAnalysing(true);
    try {
      const response = await fetch("/api/ai/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, location, image }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyse the report.");
      setAnalysis(data);
      await onSubmit({ id: "", title, description, language: (data.language || language) as Language, category: String(data.category || "Other campus issue"), priority: (data.priority || "Medium") as Priority, department: String(data.department || "Campus Administration"), summaryEn: String(data.summaryEn || "This report is awaiting review."), summaryAs: String(data.summaryAs || "এই প্ৰতিবেদনটো পৰ্যালোচনাৰ বাবে অপেক্ষা কৰি আছে।"), status: "Submitted", location, createdAt: "Just now", image, reporter: "", tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [], upvotes: 1, campusName: campus.name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the report.");
    } finally {
      setAnalysing(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="form-modal"><div className="modal-top"><div><span className="modal-kicker"><Sparkles size={13} /> BILINGUAL AI REPORTING</span><h2>Report a campus issue</h2><p>Describe the issue naturally. AI will classify and route it to the right team.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form onSubmit={analyze}><div className="form-language"><Languages size={16} /><span>Writing in <b>{language === "en" ? "English" : "অসমীয়া"}</b></span><span className="form-language-hint">English, Assamese, or both</span></div><label className="field-label">What is the issue?<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={language === "en" ? "e.g. No water in hostel block C" : "উদাহৰণ: ছাত্ৰাবাসত পানী নাই"} /></label><label className="field-label">Describe the problem<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={language === "en" ? "Add details that could help us resolve this faster..." : "সমস্যাটোৰ বিষয়ে অধিক বিৱৰণ দিয়ক..."} rows={4} /></label><div className="form-two-col"><label className="field-label">Where is it?<div className="input-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Hostel block C" /></div></label><PhotoUpload image={image} onImage={setImage} onError={setError} label="Add a before photo" /></div>{analysis && <div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis complete</div><span>{String(analysis.provider || "local")}</span></div><div className="ai-tags"><span><Tag size={13} />{String(analysis.category)}</span><span><Building2 size={13} />{String(analysis.department)}</span><span><AlertCircle size={13} />{String(analysis.priority)} priority</span></div></div>}{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}<button className="primary-button form-submit" disabled={analysing}>{analysing ? <><Loader2 size={17} className="spin" /> Analysing report...</> : <><Sparkles size={17} /> Analyse & submit report</>}</button></form></div></div>;
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
