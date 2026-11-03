"use client";

import { AlertCircle, Building2, Check, CheckCircle2, CopyCheck, ImagePlus, Languages, Loader2, MapPin, MessageSquareText, Sparkles, Tag, X } from "lucide-react";
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

type SimilarReport = { id: string; title: string; location: string; category: string; language: string; score: number; reason: string };
type FollowUp = { needed: boolean; questionEn: string; questionAs: string; language: Language };

export function ComplaintFormWorkflow({ language, campus, onClose, onSubmit }: { language: Language; campus: Campus; onClose: () => void; onSubmit: (complaint: Complaint) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [duplicateOf, setDuplicateOf] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  function clearReview() {
    setAnalysis(null);
    setFollowUp(null);
    setFollowUpAnswer("");
    setSimilarReports([]);
    setDuplicateOf("");
    setError("");
  }

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) { setError("Please complete the title, description and location."); return; }
    setError("");
    setAnalysing(true);
    try {
      const response = await fetch("/api/ai/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, location, image }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyse the report.");
      const request = { title, description, location, category: String(data.category || ""), tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [] };
      const [followUpResponse, duplicatesResponse] = await Promise.all([
        fetch("/api/ai/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, location }) }),
        fetch("/api/complaints/duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) }),
      ]);
      const [followUpData, duplicatesData] = await Promise.all([followUpResponse.json(), duplicatesResponse.json()]);
      if (!followUpResponse.ok) throw new Error(followUpData.error || "Unable to prepare a follow-up question.");
      if (!duplicatesResponse.ok) throw new Error(duplicatesData.error || "Unable to check for similar reports.");
      setFollowUp({ needed: Boolean(followUpData.needed), questionEn: String(followUpData.questionEn || ""), questionAs: String(followUpData.questionAs || ""), language: (followUpData.language || language) as Language });
      setSimilarReports(Array.isArray(duplicatesData.matches) ? duplicatesData.matches : []);
      setAnalysis(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the report.");
    } finally {
      setAnalysing(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!analysis) return;
    if (followUp?.needed && !followUpAnswer.trim()) {
      setError("Please answer the clarification question before submitting.");
      return;
    }

    setError("");
    setAnalysing(true);
    const reportDescription = followUpAnswer.trim()
      ? `${description.trim()}\n\nAdditional details: ${followUpAnswer.trim()}`
      : description.trim();
    try {
      await onSubmit({
        id: "",
        title,
        description: reportDescription,
        language: (analysis.language || language) as Language,
        category: String(analysis.category || "Other campus issue"),
        priority: (analysis.priority || "Medium") as Priority,
        department: String(analysis.department || "Campus Administration"),
        summaryEn: String(analysis.summaryEn || "This report is awaiting review."),
        summaryAs: String(analysis.summaryAs || "এই প্ৰতিবেদনটো পৰ্যালোচনাৰ বাবে অপেক্ষা কৰি আছে।"),
        status: "Submitted",
        location,
        createdAt: "Just now",
        image,
        reporter: "",
        tags: Array.isArray(analysis.tags) ? analysis.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
        upvotes: 1,
        campusName: campus.name,
        duplicateOf: duplicateOf || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the report.");
    } finally {
      setAnalysing(false);
    }
  }

  const handleImage = (value: string) => { setImage(value); clearReview(); };
  const question = followUp?.language === "as" ? followUp.questionAs : followUp?.questionEn;

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="form-modal">
      <div className="modal-top"><div><span className="modal-kicker"><Sparkles size={13} /> BILINGUAL AI REPORTING</span><h2>Report a campus issue</h2><p>AI will clarify incomplete reports and suggest possible matches for your review.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <form onSubmit={analysis ? submit : analyze}>
        <div className="form-language"><Languages size={16} /><span>Writing in <b>{language === "en" ? "English" : "অসমীয়া"}</b></span><span className="form-language-hint">English, Assamese, or both</span></div>
        <label className="field-label">What is the issue?<input value={title} onChange={(event) => { setTitle(event.target.value); clearReview(); }} placeholder={language === "en" ? "e.g. No water in hostel block C" : "উদাহৰণ: ছাত্ৰাবাসত পানী নাই"} /></label>
        <label className="field-label">Describe the problem<textarea value={description} onChange={(event) => { setDescription(event.target.value); clearReview(); }} placeholder={language === "en" ? "Add details that could help us resolve this faster..." : "সমস্যাটোৰ বিষয়ে অধিক বিৱৰণ দিয়ক..."} rows={4} /></label>
        <div className="form-two-col">
          <label className="field-label">Where is it?<div className="input-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => { setLocation(event.target.value); clearReview(); }} placeholder="e.g. Hostel block C" /></div></label>
          <div className="field-label">Add a before photo <label className="upload-box">{image ? <img src={image} alt="Issue preview" /> : <><ImagePlus size={20} /><span>Upload evidence</span><small>PNG, JPG up to 8MB</small></>}<input type="file" accept="image/*" onChange={(event) => readImage(event, handleImage, setError)} /></label></div>
        </div>
        {analysis && <div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis complete</div><span>{String(analysis.provider || "local")}</span></div><div className="ai-tags"><span><Tag size={13} />{String(analysis.category)}</span><span><Building2 size={13} />{String(analysis.department)}</span><span><AlertCircle size={13} />{String(analysis.priority)} priority</span></div></div>}
        {followUp?.needed && <section className="follow-up-panel"><div className="copilot-panel-heading"><MessageSquareText size={17} /><b>One quick clarification</b></div><p>{question}</p><label className="field-label">Your answer<textarea value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} rows={2} placeholder={followUp.language === "as" ? "আপোনাৰ উত্তৰ..." : "Add a short answer..."} /></label></section>}
        {similarReports.length > 0 && <section className="similar-reports-panel"><div className="copilot-panel-heading"><CopyCheck size={17} /><b>Possible duplicate reports</b></div><p>AI compared reports across Assamese and English. Choose one only if it describes the same issue; otherwise submit separately.</p>{similarReports.map((match) => <div className="similar-report-card" key={match.id}><div><b>{match.title}</b><span>{match.id} · {match.location} · {match.category} · {match.language === "as" ? "অসমীয়া" : "English"}</span><small>{match.reason} · {Math.round(match.score * 100)}% match</small></div><button type="button" className={duplicateOf === match.id ? "selected-match-button" : "secondary-button"} onClick={() => setDuplicateOf(duplicateOf === match.id ? "" : match.id)}>{duplicateOf === match.id ? "Selected" : "Same issue"}</button></div>)}{duplicateOf && <button type="button" className="text-button" onClick={() => setDuplicateOf("")}>No, submit a separate report</button>}</section>}
        {analysis && !followUp?.needed && <div className="follow-up-clear">The report has enough detail to continue without a clarification.</div>}
        {error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}
        <button className="primary-button form-submit" disabled={analysing}>{analysing ? <><Loader2 size={17} className="spin" /> {analysis ? "Submitting report..." : "Checking report..."}</> : analysis ? <><Check size={17} /> Submit report</> : <><Sparkles size={17} /> Analyse report</>}</button>
      </form>
    </div>
  </div>;
}

export function ComplaintDetailWorkflow({ complaint, language, onClose, onUpdate, role }: { complaint: Complaint; language: Language; onClose: () => void; onUpdate: UpdateComplaint; role: "student" | "admin" }) {
  const [afterImage, setAfterImage] = useState(complaint.resolvedImage || "");
  const [notes, setNotes] = useState(complaint.resolutionNotes || "");
  const [responseEn, setResponseEn] = useState(complaint.adminResponseEn || "");
  const [responseAs, setResponseAs] = useState(complaint.adminResponseAs || "");
  const [nextSteps, setNextSteps] = useState("");
  const [suggestedDepartment, setSuggestedDepartment] = useState("");
  const [copilotProvider, setCopilotProvider] = useState("");
  const [copiloting, setCopiloting] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const tags = complaint.tags || [];

  async function draftResponse() {
    setError("");
    setCopiloting(true);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complaintId: complaint.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to draft an administrator response.");
      setResponseEn(String(result.responseEn || ""));
      setResponseAs(String(result.responseAs || ""));
      setNextSteps(language === "as" ? String(result.nextStepsAs || "") : String(result.nextStepsEn || ""));
      setSuggestedDepartment(String(result.suggestedDepartment || ""));
      setCopilotProvider(String(result.provider || "local"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to draft an administrator response.");
    } finally {
      setCopiloting(false);
    }
  }

  async function saveResponse() {
    setError("");
    setSavingResponse(true);
    try {
      const saved = await onUpdate(complaint.id, { adminResponseEn: responseEn, adminResponseAs: responseAs });
      if (!saved) setError("Unable to publish the response. Please try again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish the response.");
    } finally {
      setSavingResponse(false);
    }
  }

  async function assignSuggestedDepartment() {
    if (!suggestedDepartment || suggestedDepartment === complaint.department) return;
    setError("");
    try {
      if (!await onUpdate(complaint.id, { department: suggestedDepartment })) setError("Unable to update the department.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the department.");
    }
  }

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

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="detail-modal">
    <div className="modal-top"><div><span className="modal-kicker">{complaint.id} · REPORTED {complaint.createdAt.toUpperCase()}</span><h2>{complaint.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
    <div className="detail-status-row"><span className={`status-pill status-${complaint.status === "In progress" ? "progress" : complaint.status.toLowerCase()}`}><i />{complaint.status}</span><span className={`priority priority-${complaint.priority.toLowerCase()}`}><span className="priority-dot" />{complaint.priority} priority</span><span className="detail-location"><MapPin size={14} />{complaint.location}</span></div>
    <div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis</div><span>{complaint.upvotes || 1} affected student{(complaint.upvotes || 1) === 1 ? "" : "s"}</span></div><div className="ai-summary"><div><b>English summary</b><p>{complaint.summaryEn}</p></div><div><b>অসমীয়া সাৰাংশ</b><p>{complaint.summaryAs}</p></div></div><div className="ai-tags"><span><Tag size={13} />{complaint.category}</span><span><Building2 size={13} />{complaint.department}</span><span><Languages size={13} />{complaint.language === "as" ? "Assamese" : complaint.language === "mixed" ? "Mixed language" : "English"}</span>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
    <div className="detail-section"><h3>Original report</h3><p className="original-report">{complaint.description}</p>{complaint.image && <img className="report-image" src={complaint.image} alt="Before evidence" />}<div className="reporter-line"><div className="mini-avatar">{complaint.reporter.split(" ").map((word) => word[0]).join("")}</div><span>Reported by <b>{complaint.reporter}</b></span></div></div>
    {role === "admin" && <section className="detail-section copilot-panel"><div className="copilot-panel-heading"><Sparkles size={17} /><div><h3>Response copilot</h3><p>Draft a factual bilingual update for review before publishing.</p></div></div><button className="secondary-button copilot-generate" disabled={copiloting} onClick={draftResponse}>{copiloting ? <><Loader2 size={15} className="spin" /> Drafting...</> : <><Sparkles size={15} /> Generate response draft</>}</button>{copilotProvider && <span className="copilot-provider">Draft generated with {copilotProvider}; review before publishing.</span>}{suggestedDepartment && <div className="copilot-next-steps"><b>Suggested department: {suggestedDepartment}</b>{suggestedDepartment !== complaint.department && <button className="text-button" onClick={assignSuggestedDepartment}>Assign to this department</button>}</div>}{nextSteps && <div className="copilot-next-steps"><b>Suggested next steps</b><p>{nextSteps}</p></div>}<label className="field-label">Public response · English<textarea value={responseEn} onChange={(event) => setResponseEn(event.target.value)} rows={3} maxLength={1000} placeholder="Draft an update for the reporter..." /></label><label className="field-label">Public response · অসমীয়া<textarea value={responseAs} onChange={(event) => setResponseAs(event.target.value)} rows={3} maxLength={1000} placeholder="প্ৰতিবেদন দিওঁতালৈ অসমীয়াত উত্তৰ..." /></label><div className="resolution-actions"><button className="primary-button" disabled={savingResponse || !responseEn.trim() || !responseAs.trim()} onClick={saveResponse}>{savingResponse ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Publish bilingual response</button></div>{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}</section>}
    {role === "student" && (complaint.adminResponseEn || complaint.adminResponseAs) && <section className="public-response-card"><div className="copilot-panel-heading"><MessageSquareText size={17} /><b>Campus response</b></div><p>{language === "as" ? complaint.adminResponseAs || complaint.adminResponseEn : complaint.adminResponseEn || complaint.adminResponseAs}</p></section>}
    {role === "admin" && <div className="detail-section resolution-proof"><h3>Resolution proof</h3><p>Upload an after photo before marking this issue resolved.</p>{complaint.resolvedImage && <img className="report-image" src={complaint.resolvedImage} alt="Verified after evidence" />}<label className="upload-box"><ImagePlus size={20} /><span>{afterImage ? "After photo selected" : "Upload after photo"}</span><small>PNG, JPG up to 8MB</small><input type="file" accept="image/*" onChange={(event) => readImage(event, setAfterImage, setError)} /></label><textarea className="resolution-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Resolution notes (optional)" rows={3} />{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}<div className="resolution-actions">{complaint.status === "Submitted" && <button className="secondary-button" disabled={saving} onClick={() => update("In progress")}>Assign to {complaint.department}</button>}{complaint.status !== "Resolved" && <button className="primary-button" disabled={saving} onClick={() => update("Resolved")}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Resolve with proof</button>}</div></div>}
    {complaint.resolvedImage && complaint.status === "Resolved" && <div className="verified-proof"><CheckCircle2 size={17} /> Resolution proof submitted{complaint.resolutionNotes ? `: ${complaint.resolutionNotes}` : ""}</div>}
    <div className="timeline"><h3>Activity</h3><TimelineItem active title="Report submitted" time={complaint.createdAt} text="Your report was received by CivicSense." /><TimelineItem active={complaint.status !== "Submitted"} title="Assigned to the right department" time={complaint.status === "Submitted" ? "Pending" : "Updated"} text={`${complaint.department} is responsible for this issue.`} /><TimelineItem active={complaint.status === "Resolved"} last title="Resolved with proof" time={complaint.status === "Resolved" ? "Completed" : "Pending"} text={complaint.status === "Resolved" ? "The submitted after photo is available above." : "A resolution update will appear here."} /></div>
  </div></div>;
}

function TimelineItem({ active, title, time, text, last }: { active: boolean; title: string; time: string; text: string; last?: boolean }) {
  return <div className={`timeline-item ${active ? "timeline-active" : ""}`}><div className="timeline-marker">{active ? <Check size={12} /> : <span />}</div>{!last && <div className="timeline-line" />}<div className="timeline-copy"><div><b>{title}</b><span>{time}</span></div><p>{text}</p></div></div>;
}
