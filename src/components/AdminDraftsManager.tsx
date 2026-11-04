"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  ArrowLeft, Check, CheckCircle2, Clock, Copy, Download, Edit3, 
  ExternalLink, FileCheck2, FileClock, FilePlus, FileText, 
  Filter, Loader2, MapPin, Printer, RotateCcw, Search, 
  Send, Sparkles, Trash2, Wrench, Building, GraduationCap, AlertCircle
} from "lucide-react";
import type { Complaint } from "@/components/CivicSenseApp";
import type { Campus } from "@/lib/campuses";

export type SavedDraft = {
  complaintId: string;
  templateType: "repair" | "installation" | "grievance";
  senderName: string;
  senderDesignation: string;
  senderDepartment: string;
  recipientTitle: string;
  recipientInstitution: string;
  throughChannel: string;
  subject: string;
  p1: string;
  p2: string;
  p3: string;
  enclosures: string[];
  status: "draft_saved" | "submitted_to_authority";
  updatedAt: string;
};

type AdminDraftsManagerProps = {
  campus: Campus;
  complaints: Complaint[];
  initialComplaintId?: string | null;
  onBackToControlRoom?: () => void;
  language?: string;
};

const DRAFTS_STORAGE_KEY = "anazori_campus_application_drafts_v1";

const standardAuthorities = [
  { label: "The Vice-Chancellor", title: "The Vice-Chancellor", channel: "[Through Proper Channel: Office of the Head of Department / Warden]" },
  { label: "The Registrar", title: "The Registrar", channel: "[Through Proper Channel: Office of the Dean, Student Welfare]" },
  { label: "The University Engineer", title: "The University Engineer (Planning & Construction Branch)", channel: "[Through Proper Channel: Office of the Estate Officer / Warden]" },
  { label: "The Controller of Examinations", title: "The Controller of Examinations", channel: "[Through Proper Channel: The Head of Department / Convener, Grievance Cell]" },
  { label: "Dean, Student Welfare", title: "The Dean, Student Welfare", channel: "[Through Proper Channel: Student Amenities & Welfare Cell]" },
];

export default function AdminDraftsManager({
  campus,
  complaints,
  initialComplaintId,
  onBackToControlRoom,
  language = "en",
}: AdminDraftsManagerProps) {
  const isAs = language === "as";

  // Persistent drafts loaded from localStorage
  const [savedDrafts, setSavedDrafts] = useState<Record<string, SavedDraft>>({});
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(initialComplaintId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "completed">("all");
  const [toastMessage, setToastMessage] = useState("");

  // Editor states
  const [templateType, setTemplateType] = useState<"repair" | "installation" | "grievance">("repair");
  const [senderName, setSenderName] = useState("Dr. H. K. Borah");
  const [senderDesignation, setSenderDesignation] = useState("Warden / Head of Department");
  const [senderDepartment, setSenderDepartment] = useState("Padma Nath Gohain Baruah Chatra Nivas");
  const [recipientTitle, setRecipientTitle] = useState("The Vice-Chancellor");
  const [recipientInstitution, setRecipientInstitution] = useState("Dibrugarh University, Dibrugarh, Assam - 786004");
  const [throughChannel, setThroughChannel] = useState("[Through Proper Channel: Office of the Head of Department / Warden]");
  const [subject, setSubject] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [enclosures, setEnclosures] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load drafts on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, SavedDraft>;
        setSavedDrafts(parsed);
      }
    } catch {
      // ignore parsing error
    }
  }, []);

  // Save drafts helper
  function persistDrafts(updated: Record<string, SavedDraft>) {
    setSavedDrafts(updated);
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
  }

  function notify(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  }

  // Active complaint object
  const activeComplaint = useMemo(() => {
    return complaints.find((item) => item.id === activeComplaintId) || null;
  }, [complaints, activeComplaintId]);

  // Template detector
  const detectTemplate = (c?: Complaint | null): "repair" | "installation" | "grievance" => {
    if (!c) return "repair";
    const cat = (c.category || "").toLowerCase();
    const text = (c.title + " " + c.description).toLowerCase();
    if (cat.includes("exam") || cat.includes("fee") || cat.includes("scholarship") || cat.includes("certificate") || cat.includes("registration") || cat.includes("student welfare")) {
      return "grievance";
    }
    if (text.includes("install") || text.includes("require") || text.includes("need a new") || text.includes("light") || text.includes("purifier") || text.includes("camera") || text.includes("router")) {
      return "installation";
    }
    return "repair";
  };

  // Populate editor when an active complaint is chosen
  useEffect(() => {
    if (!activeComplaint) return;

    // Check if an existing saved draft exists in localStorage
    const existing = savedDrafts[activeComplaint.id];
    if (existing) {
      setTemplateType(existing.templateType);
      setSenderName(existing.senderName);
      setSenderDesignation(existing.senderDesignation);
      setSenderDepartment(existing.senderDepartment);
      setRecipientTitle(existing.recipientTitle);
      setRecipientInstitution(existing.recipientInstitution);
      setThroughChannel(existing.throughChannel);
      setSubject(existing.subject);
      setP1(existing.p1);
      setP2(existing.p2);
      setP3(existing.p3);
      setEnclosures(existing.enclosures || []);
      return;
    }

    // Otherwise auto-compose fresh draft
    const tpl = detectTemplate(activeComplaint);
    setTemplateType(tpl);

    const loc = activeComplaint.location || "the campus premises";
    const upvotes = activeComplaint.upvotes || 1;
    const ticketRef = activeComplaint.id.startsWith("#") ? activeComplaint.id : `#${activeComplaint.id}`;

    if (activeComplaint.location.toLowerCase().includes("hostel")) {
      setSenderDesignation("Warden / Resident Caretaker");
      setSenderDepartment(activeComplaint.location);
    } else {
      setSenderDesignation("Head of Department");
      setSenderDepartment(activeComplaint.department || "Academic Section");
    }

    if (tpl === "repair") {
      setSubject(`Application regarding urgent repair of broken property and safety hazard at ${loc}.`);
      setP1(`I would like to bring to your kind notice an urgent infrastructure problem at ${loc}. ${activeComplaint.description}`);
      setP2(`This breakdown has caused severe disruption and hardship to the campus residents. The issue was formally reported and endorsed by ${upvotes} student${upvotes > 1 ? "s" : ""} on the campus redressal portal under Ticket ${ticketRef}. Immediate action is needed to prevent further damage and avoid potential safety hazards.`);
      setP3(`In view of the serious inconvenience and safety risk to students, I earnestly request your kind intervention to direct the University Engineer (Planning & Construction Branch) to conduct an on-site inspection and carry out the required repairs on high priority.`);
      setEnclosures([
        `Anazori Campus Grievance Reference (${ticketRef})`,
        activeComplaint.latitude && activeComplaint.longitude
          ? `Spatial Geotag Record: ${activeComplaint.latitude.toFixed(4)}° N, ${activeComplaint.longitude.toFixed(4)}° E`
          : "On-site Verification & Photographic Proof",
      ]);
    } else if (tpl === "installation") {
      setSubject(`Application for requisition and installation of necessary facility (${activeComplaint.title}) at ${loc}.`);
      setP1(`With due respect, I wish to submit a proposal for the installation of essential campus infrastructure at ${loc}. ${activeComplaint.description}`);
      setP2(`Over ${upvotes > 1 ? upvotes : "multiple"} students have petitioned for this installation on the campus redressal portal (Ref: ${ticketRef}). The absence of this facility causes persistent difficulty in daily academic and student activities.`);
      setP3(`In accordance with university development and student welfare guidelines, I kindly request your favourable consideration to direct the Planning & Development Section to evaluate technical feasibility and sanction the required installation at the earliest.`);
      setEnclosures([
        `Student Petition Summary (${ticketRef}) with ${upvotes} Endorsements`,
        "Site Location Survey & Feasibility Assessment",
      ]);
    } else {
      setSubject(`Application regarding redressal of student grievance (${activeComplaint.title}) at ${loc}.`);
      setP1(`I beg to place before your kind authority an urgent student grievance regarding ${activeComplaint.title.toLowerCase()} at ${loc}. ${activeComplaint.description}`);
      setP2(`The matter has been logged on the student grievance portal under Docket ID ${ticketRef} with verified student representation (${upvotes} affected student${upvotes > 1 ? "s" : ""}). This issue requires administrative review to avoid undue academic disruption.`);
      setP3(`I humbly request your kind authority to direct the concerned administrative/examination branch to examine the relevant records and issue the appropriate remedial orders at the earliest.`);
      setEnclosures([
        `Grievance Docket Copy (${ticketRef})`,
        "Supporting Academic Credentials & Attendance Register Slip",
      ]);
    }
  }, [activeComplaintId]);

  // Handle template switch manually inside the editor
  function handleTemplateSwitch(nextTpl: "repair" | "installation" | "grievance") {
    setTemplateType(nextTpl);
    if (!activeComplaint) return;
    const loc = activeComplaint.location || "the campus premises";
    const upvotes = activeComplaint.upvotes || 1;
    const ticketRef = activeComplaint.id.startsWith("#") ? activeComplaint.id : `#${activeComplaint.id}`;

    if (nextTpl === "repair") {
      setSubject(`Application regarding urgent repair of broken property and safety hazard at ${loc}.`);
      setP1(`I would like to bring to your kind notice an urgent infrastructure problem at ${loc}. ${activeComplaint.description}`);
      setP2(`This breakdown has caused severe disruption and hardship to the campus residents. The issue was formally reported and endorsed by ${upvotes} student${upvotes > 1 ? "s" : ""} on the campus redressal portal under Ticket ${ticketRef}. Immediate action is needed to prevent further damage and avoid potential safety hazards.`);
      setP3(`In view of the serious inconvenience and safety risk to students, I earnestly request your kind intervention to direct the University Engineer (Planning & Construction Branch) to conduct an on-site inspection and carry out the required repairs on high priority.`);
    } else if (nextTpl === "installation") {
      setSubject(`Application for requisition and installation of necessary facility (${activeComplaint.title}) at ${loc}.`);
      setP1(`With due respect, I wish to submit a proposal for the installation of essential campus infrastructure at ${loc}. ${activeComplaint.description}`);
      setP2(`Over ${upvotes > 1 ? upvotes : "multiple"} students have petitioned for this installation on the campus redressal portal (Ref: ${ticketRef}). The absence of this facility causes persistent difficulty in daily academic and student activities.`);
      setP3(`In accordance with university development and student welfare guidelines, I kindly request your favourable consideration to direct the Planning & Development Section to evaluate technical feasibility and sanction the required installation at the earliest.`);
    } else {
      setSubject(`Application regarding redressal of student grievance (${activeComplaint.title}) at ${loc}.`);
      setP1(`I beg to place before your kind authority an urgent student grievance regarding ${activeComplaint.title.toLowerCase()} at ${loc}. ${activeComplaint.description}`);
      setP2(`The matter has been logged on the student grievance portal under Docket ID ${ticketRef} with verified student representation (${upvotes} affected student${upvotes > 1 ? "s" : ""}). This issue requires administrative review to avoid undue academic disruption.`);
      setP3(`I humbly request your kind authority to direct the concerned administrative/examination branch to examine the relevant records and issue the appropriate remedial orders at the earliest.`);
    }
  }

  // Save draft to localStorage
  function handleSaveDraft(markSubmitted = false) {
    if (!activeComplaint) return;

    const draftData: SavedDraft = {
      complaintId: activeComplaint.id,
      templateType,
      senderName,
      senderDesignation,
      senderDepartment,
      recipientTitle,
      recipientInstitution,
      throughChannel,
      subject,
      p1,
      p2,
      p3,
      enclosures,
      status: markSubmitted ? "submitted_to_authority" : "draft_saved",
      updatedAt: new Date().toISOString(),
    };

    const next = { ...savedDrafts, [activeComplaint.id]: draftData };
    persistDrafts(next);
    notify(markSubmitted ? "Application marked as Submitted to Vice-Chancellor!" : "Draft successfully saved to registry!");
  }

  // Delete saved draft
  function handleDeleteDraft(id: string) {
    const next = { ...savedDrafts };
    delete next[id];
    persistDrafts(next);
    notify("Draft removed.");
  }

  // AI Polish
  async function handleAiPolish() {
    if (!activeComplaint) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/generate-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint: activeComplaint,
          templateType,
          sender: { name: senderName, designation: senderDesignation, department: senderDepartment },
          recipient: { title: recipientTitle, institution: recipientInstitution },
          throughChannel,
        }),
      });
      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.p1) setP1(data.p1);
      if (data.p2) setP2(data.p2);
      if (data.p3) setP3(data.p3);
      if (Array.isArray(data.enclosures)) setEnclosures(data.enclosures);
      notify("Letter refined with formal academic phrasing!");
    } catch {
      notify("Using current draft composition.");
    } finally {
      setLoadingAi(false);
    }
  }

  function handleCopyText() {
    const fullText = `Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}\n\nTo,\n${recipientTitle},\n${recipientInstitution}.\n\n${throughChannel}\n\nSubject: ${subject}\n\nRespected Sir,\n\n${p1}\n\n${p2}\n\n${p3}\n\nThanking you.\n\nYours faithfully,\n\n${senderName}\n${senderDesignation}\n${senderDepartment}\nDibrugarh University\n\nEnclosures:\n${enclosures.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}`;

    void navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
    notify("Complete formal letter copied to clipboard!");
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const payload = {
        date: currentDate,
        recipientTitle,
        recipientInstitution,
        throughChannel,
        subject,
        p1,
        p2,
        p3,
        senderName,
        senderDesignation,
        senderDepartment,
        enclosures,
      };
      const res = await fetch("/api/application/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Application-${(subject || "formal-letter").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify("Official PDF downloaded successfully!");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Error exporting PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handlePrint() {
    const el = document.getElementById("printable-letter");
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${subject || "Campus Formal Application"}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000000;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-size: 14px;
              line-height: 1.55;
            }
            .letter-date { text-align: right; margin-bottom: 20px; font-size: 14px; }
            .letter-recipient { font-size: 14px; line-height: 1.5; margin-bottom: 14px; }
            .letter-through-channel { font-size: 13px; font-style: italic; margin-bottom: 16px; }
            .letter-subject { font-size: 14px; font-weight: bold; line-height: 1.45; margin-bottom: 18px; }
            .letter-salutation { font-size: 14px; margin-bottom: 14px; }
            .letter-body p { margin: 0 0 14px 0; text-align: justify; text-indent: 32px; font-size: 14px; line-height: 1.6; }
            .letter-closing { font-size: 14px; margin-bottom: 30px; }
            .letter-signatory-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; page-break-inside: avoid; }
            .letter-enclosures { font-size: 12px; line-height: 1.4; max-width: 320px; }
            .letter-signature-box { text-align: right; font-size: 13.5px; line-height: 1.45; }
            .sig-line { margin: 10px 0 6px auto; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Metrics computation
  const totalIssuesCount = complaints.length;
  const completedDraftsCount = Object.keys(savedDrafts).length;
  const pendingDraftsCount = Math.max(0, totalIssuesCount - completedDraftsCount);

  // Filter complaints list
  const filteredIssues = useMemo(() => {
    return complaints.filter((item) => {
      const draft = savedDrafts[item.id];
      const matchesSearch =
        !searchQuery ||
        `${item.id} ${item.title} ${item.location} ${item.category}`.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusTab === "pending") {
        return !draft || draft.status !== "submitted_to_authority";
      }
      if (statusTab === "completed") {
        return Boolean(draft);
      }
      return true;
    });
  }, [complaints, savedDrafts, searchQuery, statusTab]);

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="workspace-panel drafts-page-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="drafts-toast no-print">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <div className="drafts-top-header no-print">
        <div className="drafts-title-group">
          {onBackToControlRoom && (
            <button
              type="button"
              className="drafts-back-btn"
              onClick={onBackToControlRoom}
              title="Return to Admin Control Room"
            >
              <ArrowLeft size={16} /> {isAs ? "নিয়ন্ত্ৰণ কক্ষলৈ উভতক" : "Control Room"}
            </button>
          )}
          <div>
            <h1>{isAs ? "আনুষ্ঠানিক আবেদন আৰু খচৰা পৰিচালনা" : "Formal Applications & Drafts Manager"}</h1>
            <p>
              {isAs
                ? "কেম্পাছৰ সমস্যাসমূহৰ বাবে উপাচাৰ্য বা কৰ্তৃপক্ষলৈ প্ৰেৰণ কৰিবলগীয়া আবেদনসমূহ প্ৰস্তুত আৰু পৰীক্ষা কৰক।"
                : "Draft, track, and generate official letters to the Vice-Chancellor & University Authorities for any reported issue."}
            </p>
          </div>
        </div>

        <div className="drafts-header-pills">
          <div className="campus-name-pill">
            <Building size={14} />
            <span>{campus.name}</span>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="drafts-metrics-bar no-print">
        <div className="drafts-metric-box">
          <span className="metric-icon total"><FileText size={18} /></span>
          <div>
            <b>{totalIssuesCount}</b>
            <span>Total Reported Issues</span>
          </div>
        </div>

        <div className={`drafts-metric-box ${pendingDraftsCount > 0 ? "highlight-pending" : ""}`}>
          <span className="metric-icon pending"><FileClock size={18} /></span>
          <div>
            <b>{pendingDraftsCount}</b>
            <span>Drafts Left Out To Do</span>
          </div>
        </div>

        <div className="drafts-metric-box">
          <span className="metric-icon completed"><FileCheck2 size={18} /></span>
          <div>
            <b>{completedDraftsCount}</b>
            <span>Drafts Ready & Saved</span>
          </div>
        </div>
      </div>

      {/* IF AN ISSUE IS SELECTED: SHOW THE DRAFTING STUDIO */}
      {activeComplaint ? (
        <div className="draft-studio-active-wrap">
          {/* Studio Action Header */}
          <div className="studio-action-bar no-print">
            <button
              type="button"
              className="studio-exit-btn"
              onClick={() => setActiveComplaintId(null)}
            >
              <ArrowLeft size={15} /> {isAs ? "খচৰা তালিকালৈ উভতক" : "Back to Drafts Queue"}
            </button>

            <div className="studio-active-info">
              <b>Currently Drafting:</b> <span>[{activeComplaint.id}] {activeComplaint.title}</span>
            </div>

            <div className="studio-right-actions">
              <button
                type="button"
                className="studio-act-btn save-btn"
                onClick={() => handleSaveDraft(false)}
              >
                <FileCheck2 size={14} /> Save Draft
              </button>

              <button
                type="button"
                className="studio-act-btn submit-btn"
                onClick={() => handleSaveDraft(true)}
              >
                <Send size={14} /> Mark Submitted
              </button>

              <button
                type="button"
                className="studio-act-btn copy-btn"
                onClick={handleCopyText}
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Text</>}
              </button>

              <button
                type="button"
                className="studio-act-btn download-pdf-btn"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                title="Download guaranteed complete official PDF"
              >
                {downloadingPdf ? <><Loader2 size={14} className="spin" /> Generating PDF...</> : <><Download size={14} /> Download Official PDF</>}
              </button>

              <button
                type="button"
                className="studio-act-btn print-btn"
                onClick={handlePrint}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Side-by-Side Drafting Workspace */}
          <div className="app-studio-layout">
            {/* Left Controls */}
            <div className="app-studio-controls no-print">
              {/* Template Choice */}
              <div className="studio-card">
                <div className="studio-card-header">
                  <Wrench size={15} />
                  <span>Choose Out of 3 Standard Templates</span>
                </div>
                <div className="studio-template-grid">
                  <button
                    type="button"
                    className={`studio-tpl-card ${templateType === "repair" ? "active" : ""}`}
                    onClick={() => handleTemplateSwitch("repair")}
                  >
                    <div className="tpl-icon"><Wrench size={16} /></div>
                    <b>Template 1: Property Repair & Maintenance</b>
                    <span>For broken pipes, leaks, electrical faults, civil damage.</span>
                  </button>

                  <button
                    type="button"
                    className={`studio-tpl-card ${templateType === "installation" ? "active" : ""}`}
                    onClick={() => handleTemplateSwitch("installation")}
                  >
                    <div className="tpl-icon"><Building size={16} /></div>
                    <b>Template 2: New Facility Installation</b>
                    <span>For water purifiers, solar lights, CCTV, Wi-Fi equipment.</span>
                  </button>

                  <button
                    type="button"
                    className={`studio-tpl-card ${templateType === "grievance" ? "active" : ""}`}
                    onClick={() => handleTemplateSwitch("grievance")}
                  >
                    <div className="tpl-icon"><GraduationCap size={16} /></div>
                    <b>Template 3: Student Grievance & Welfare</b>
                    <span>For marksheet rectifications, fees, scholarship disputes.</span>
                  </button>
                </div>
              </div>

              {/* Sender Details */}
              <div className="studio-card">
                <div className="studio-card-header">
                  <Send size={15} />
                  <span>Who will send it? (Submitting Officer)</span>
                </div>
                <div className="studio-row">
                  <div className="studio-field">
                    <label>Sender Full Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>
                  <div className="studio-field">
                    <label>Sender Designation</label>
                    <input
                      type="text"
                      value={senderDesignation}
                      onChange={(e) => setSenderDesignation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="studio-field">
                  <label>Department / Hostel Office</label>
                  <input
                    type="text"
                    value={senderDepartment}
                    onChange={(e) => setSenderDepartment(e.target.value)}
                  />
                </div>
              </div>

              {/* Recipient Details */}
              <div className="studio-card">
                <div className="studio-card-header">
                  <Building size={15} />
                  <span>Who will it be sent to? (Authority)</span>
                </div>
                <div className="preset-chips">
                  {standardAuthorities.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`preset-chip ${recipientTitle === item.title ? "active" : ""}`}
                      onClick={() => {
                        setRecipientTitle(item.title);
                        setThroughChannel(item.channel);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="studio-field">
                  <label>Recipient Title</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                  />
                </div>
                <div className="studio-field">
                  <label>Institution / Campus Address</label>
                  <input
                    type="text"
                    value={recipientInstitution}
                    onChange={(e) => setRecipientInstitution(e.target.value)}
                  />
                </div>
                <div className="studio-field">
                  <label>Through Proper Channel</label>
                  <input
                    type="text"
                    value={throughChannel}
                    onChange={(e) => setThroughChannel(e.target.value)}
                  />
                </div>
              </div>

              {/* Letter Paragraphs */}
              <div className="studio-card">
                <div className="studio-card-header-split">
                  <div className="studio-card-header">
                    <FileText size={15} />
                    <span>Letter Drafting & Content</span>
                  </div>
                  <button
                    type="button"
                    className="ai-polish-btn"
                    onClick={handleAiPolish}
                    disabled={loadingAi}
                  >
                    {loadingAi ? <><Loader2 size={13} className="spin" /> Polishing...</> : <><Sparkles size={13} /> AI Polish</>}
                  </button>
                </div>

                <div className="studio-field">
                  <label>Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="studio-field">
                  <label>Paragraph 1: The Problem & Exact Location</label>
                  <textarea
                    rows={3}
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                  />
                </div>

                <div className="studio-field">
                  <label>Paragraph 2: Impact, Urgency & Student Support</label>
                  <textarea
                    rows={3}
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                  />
                </div>

                <div className="studio-field">
                  <label>Paragraph 3: Specific Relief / Action Requested</label>
                  <textarea
                    rows={3}
                    value={p3}
                    onChange={(e) => setP3(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Pane: Live A4 Letter Preview */}
            <div className="app-studio-preview-pane">
              <div className="preview-toolbar no-print">
                <div className="preview-indicator">
                  <i /> Live A4 Letter Preview (Times-Roman · Standard University Format)
                </div>
                <button type="button" className="text-print-btn" onClick={handlePrint}>
                  <Printer size={13} /> Print Application
                </button>
              </div>

              <div className="a4-sheet-container">
                <div className="a4-sheet printable-application" id="printable-letter">
                  <div className="letter-date">Date: {currentDate}</div>

                  <div className="letter-recipient">
                    To,<br />
                    <b>{recipientTitle}</b>,<br />
                    {recipientInstitution}.
                  </div>

                  {throughChannel && (
                    <div className="letter-through-channel">
                      <i>{throughChannel}</i>
                    </div>
                  )}

                  <div className="letter-subject">
                    <b>Subject: {subject}</b>
                  </div>

                  <div className="letter-salutation">
                    Respected Sir,
                  </div>

                  <div className="letter-body">
                    <p>{p1}</p>
                    <p>{p2}</p>
                    <p>{p3}</p>
                  </div>

                  <div className="letter-closing">
                    Thanking you.
                  </div>

                  <div className="letter-signatory-wrap">
                    <div className="letter-enclosures">
                      <b>Enclosures:</b>
                      <ol>
                        {enclosures.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="letter-signature-box">
                      Yours faithfully,<br />
                      <br />
                      <br />
                      <div className="sig-line">____________________________________</div>
                      <b>{senderName}</b><br />
                      {senderDesignation}<br />
                      {senderDepartment}<br />
                      Dibrugarh University
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* IF NO ISSUE IS ACTIVELY BEING DRAFTED: SHOW THE TRACKER QUEUE */
        <div className="drafts-queue-view no-print">
          {/* Filter Bar */}
          <div className="drafts-queue-filters">
            <div className="queue-tabs">
              <button
                type="button"
                className={`queue-tab ${statusTab === "all" ? "active" : ""}`}
                onClick={() => setStatusTab("all")}
              >
                All Issues ({totalIssuesCount})
              </button>
              <button
                type="button"
                className={`queue-tab ${statusTab === "pending" ? "active" : ""}`}
                onClick={() => setStatusTab("pending")}
              >
                <AlertCircle size={14} /> Pending Drafts Left ({pendingDraftsCount})
              </button>
              <button
                type="button"
                className={`queue-tab ${statusTab === "completed" ? "active" : ""}`}
                onClick={() => setStatusTab("completed")}
              >
                <CheckCircle2 size={14} /> Saved & Completed ({completedDraftsCount})
              </button>
            </div>

            <div className="search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search issues to draft application..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Issues List Table */}
          <div className="drafts-list-card">
            <div className="drafts-list-header">
              <span>Campus Issue / Grievance</span>
              <span>Category & Location</span>
              <span>Drafting Status</span>
              <span>Action</span>
            </div>

            {filteredIssues.length > 0 ? (
              filteredIssues.map((item) => {
                const draft = savedDrafts[item.id];
                const isSubmitted = draft?.status === "submitted_to_authority";
                const isDraftSaved = draft && !isSubmitted;

                return (
                  <div key={item.id} className="draft-row-item">
                    <div className="draft-col-main">
                      <div className="draft-id-row">
                        <span className="draft-id-badge">{item.id}</span>
                        <span className={`priority-pill priority-${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </span>
                        <span className="upvotes-pill">
                          👍 {item.upvotes || 1} {item.upvotes === 1 ? "Upvote" : "Upvotes"}
                        </span>
                      </div>
                      <b>{item.title}</b>
                      <p>{item.description.slice(0, 110)}...</p>
                    </div>

                    <div className="draft-col-meta">
                      <span><MapPin size={12} /> {item.location}</span>
                      <small>{item.category} · {item.department}</small>
                    </div>

                    <div className="draft-col-status">
                      {isSubmitted ? (
                        <span className="status-badge-submitted">
                          <CheckCircle2 size={13} /> Submitted to Authority
                        </span>
                      ) : isDraftSaved ? (
                        <span className="status-badge-saved">
                          <FileCheck2 size={13} /> Draft Ready (Saved)
                        </span>
                      ) : (
                        <span className="status-badge-pending">
                          <FileClock size={13} /> Pending Draft Left
                        </span>
                      )}
                      {draft?.updatedAt && (
                        <small>Last updated: {new Date(draft.updatedAt).toLocaleDateString()}</small>
                      )}
                    </div>

                    <div className="draft-col-action">
                      <button
                        type="button"
                        className="draft-open-action-btn"
                        onClick={() => setActiveComplaintId(item.id)}
                      >
                        <Edit3 size={14} />
                        <span>{draft ? "Edit / Print Letter" : "Draft Application"}</span>
                      </button>
                      {draft && (
                        <button
                          type="button"
                          className="draft-delete-action-btn"
                          title="Discard saved draft"
                          onClick={() => handleDeleteDraft(item.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="drafts-empty-state">
                <Search size={28} />
                <b>No campus issues match your search criteria.</b>
                <span>Try clearing filters or search terms.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

