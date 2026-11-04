"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, FileText, Loader2, Printer, RefreshCw, Send, Sparkles, Wrench, Building, GraduationCap, ShieldAlert } from "lucide-react";
import type { Complaint } from "@/components/CivicSenseApp";

type ApplicationStudioProps = {
  complaints: Complaint[];
  initialComplaintId?: string;
  onClose: () => void;
  language?: string;
};

type TemplateType = "repair" | "installation" | "grievance";

const standardAuthorities = [
  { label: "The Vice-Chancellor", title: "The Vice-Chancellor", channel: "[Through Proper Channel: Office of the Head of Department / Warden]" },
  { label: "The Registrar", title: "The Registrar", channel: "[Through Proper Channel: Office of the Dean, Student Welfare]" },
  { label: "The University Engineer", title: "The University Engineer (Planning & Construction Branch)", channel: "[Through Proper Channel: Office of the Estate Officer / Warden]" },
  { label: "The Controller of Examinations", title: "The Controller of Examinations", channel: "[Through Proper Channel: The Head of Department / Convener, Grievance Cell]" },
  { label: "Dean, Student Welfare", title: "The Dean, Student Welfare", channel: "[Through Proper Channel: Student Amenities & Welfare Cell]" },
];

export default function ApplicationStudio({ complaints, initialComplaintId, onClose }: ApplicationStudioProps) {
  const [selectedId, setSelectedId] = useState<string>(initialComplaintId || complaints[0]?.id || "");
  const selectedComplaint = complaints.find((item) => item.id === selectedId) || complaints[0];

  // Template Type auto-detection from complaint category
  const detectTemplate = (c?: Complaint): TemplateType => {
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

  const [templateType, setTemplateType] = useState<TemplateType>(detectTemplate(selectedComplaint));

  // Sender details ("Who will send it")
  const [senderName, setSenderName] = useState("Dr. H. K. Borah");
  const [senderDesignation, setSenderDesignation] = useState("Warden / Head of Department");
  const [senderDepartment, setSenderDepartment] = useState("Padma Nath Gohain Baruah Chatra Nivas");

  // Recipient details ("Who will it be sent to")
  const [recipientTitle, setRecipientTitle] = useState("The Vice-Chancellor");
  const [recipientInstitution, setRecipientInstitution] = useState("Dibrugarh University, Dibrugarh, Assam - 786004");
  const [throughChannel, setThroughChannel] = useState("[Through Proper Channel: Office of the Head of Department / Warden]");

  // Content particulars
  const [subject, setSubject] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [enclosures, setEnclosures] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Sync draft whenever selected complaint or template type changes
  useEffect(() => {
    if (!selectedComplaint) return;

    const loc = selectedComplaint.location || "the campus premises";
    const upvotes = selectedComplaint.upvotes || 1;
    const ticketRef = selectedComplaint.id.startsWith("#") ? selectedComplaint.id : `#${selectedComplaint.id}`;

    if (templateType === "repair") {
      setSubject(`Application regarding urgent repair of broken property and safety hazard at ${loc}.`);
      setP1(`I would like to bring to your kind notice an urgent infrastructure problem at ${loc}. ${selectedComplaint.description}`);
      setP2(`This breakdown has caused severe disruption and hardship to the campus residents. The issue was formally reported and endorsed by ${upvotes} student${upvotes > 1 ? "s" : ""} on the campus redressal portal under Ticket ${ticketRef}. Immediate action is needed to prevent further damage and avoid potential safety hazards.`);
      setP3(`In view of the serious inconvenience and safety risk to students, I earnestly request your kind intervention to direct the University Engineer (Planning & Construction Branch) to conduct an on-site inspection and carry out the required repairs on high priority.`);
      setEnclosures([
        `Anazori Campus Grievance Reference (${ticketRef})`,
        selectedComplaint.latitude && selectedComplaint.longitude
          ? `Spatial Geotag Record: ${selectedComplaint.latitude.toFixed(4)}° N, ${selectedComplaint.longitude.toFixed(4)}° E`
          : "On-site Verification & Photographic Proof",
      ]);
    } else if (templateType === "installation") {
      setSubject(`Application for requisition and installation of necessary facility (${selectedComplaint.title}) at ${loc}.`);
      setP1(`With due respect, I wish to submit a proposal for the installation of essential campus infrastructure at ${loc}. ${selectedComplaint.description}`);
      setP2(`Over ${upvotes > 1 ? upvotes : "multiple"} students have petitioned for this installation on the campus redressal portal (Ref: ${ticketRef}). The absence of this facility causes persistent difficulty in daily academic and student activities.`);
      setP3(`In accordance with university development and student welfare guidelines, I kindly request your favourable consideration to direct the Planning & Development Section to evaluate technical feasibility and sanction the required installation at the earliest.`);
      setEnclosures([
        `Student Petition Summary (${ticketRef}) with ${upvotes} Endorsements`,
        "Site Location Survey & Feasibility Assessment",
      ]);
    } else {
      setSubject(`Application regarding redressal of student grievance (${selectedComplaint.title}) at ${loc}.`);
      setP1(`I beg to place before your kind authority an urgent student grievance regarding ${selectedComplaint.title.toLowerCase()} at ${loc}. ${selectedComplaint.description}`);
      setP2(`The matter has been logged on the student grievance portal under Docket ID ${ticketRef} with verified student representation (${upvotes} affected student${upvotes > 1 ? "s" : ""}). This issue requires administrative review to avoid undue academic disruption.`);
      setP3(`I humbly request your kind authority to direct the concerned administrative/examination branch to examine the relevant records and issue the appropriate remedial orders at the earliest.`);
      setEnclosures([
        `Grievance Docket Copy (${ticketRef})`,
        "Supporting Academic Credentials & Attendance Register Slip",
      ]);
    }
  }, [selectedComplaint, templateType]);

  // Handle switching complaint from dropdown
  function handleComplaintChange(id: string) {
    setSelectedId(id);
    const target = complaints.find((item) => item.id === id);
    if (target) {
      setTemplateType(detectTemplate(target));
      if (target.location.toLowerCase().includes("hostel")) {
        setSenderDesignation("Warden / Resident Caretaker");
        setSenderDepartment(target.location);
      } else {
        setSenderDesignation("Head of Department");
        setSenderDepartment(target.department || "Academic Section");
      }
    }
  }

  // AI Polish / Refine action
  async function handleAiPolish() {
    if (!selectedComplaint) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/generate-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint: selectedComplaint,
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
    } catch {
      // Retain current draft if network fails
    } finally {
      setLoadingAi(false);
    }
  }

  // Copy full text
  function handleCopyText() {
    const fullText = `Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}\n\nTo,\n${recipientTitle},\n${recipientInstitution}.\n\n${throughChannel}\n\nSubject: ${subject}\n\nRespected Sir,\n\n${p1}\n\n${p2}\n\n${p3}\n\nThanking you.\n\nYours faithfully,\n\n${senderName}\n${senderDesignation}\n${senderDepartment}\nDibrugarh University\n\nEnclosures:\n${enclosures.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}`;

    void navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }

  // Print A4 letter
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error exporting PDF.");
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

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="app-studio-root">
      {/* Top Header Bar */}
      <div className="app-studio-header no-print">
        <div className="app-studio-title">
          <button type="button" className="app-studio-back-btn" onClick={onClose} title="Back to complaints list">
            <ArrowLeft size={16} /> Back to Issues
          </button>
          <div>
            <h2>Campus Formal Application Studio</h2>
            <p>Generate clean, official letters addressed to the Vice-Chancellor or campus authorities from any reported issue.</p>
          </div>
        </div>

        <div className="app-studio-header-actions">
          <button type="button" className="studio-btn secondary" onClick={handleCopyText}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Letter Text</>}
          </button>
          <button type="button" className="studio-btn secondary" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <><Loader2 size={14} className="spin" /> Generating PDF...</> : <><Download size={14} /> Download PDF</>}
          </button>
          <button type="button" className="studio-btn primary" onClick={handlePrint}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="app-studio-layout">
        {/* Left Column: Form Inputs & Settings */}
        <div className="app-studio-controls no-print">
          {/* Active Complaint Selection */}
          <div className="studio-card">
            <div className="studio-card-header">
              <FileText size={15} />
              <span>1. Selected Complaint</span>
            </div>
            <div className="studio-field">
              <label>Choose Complaint Issue</label>
              <select value={selectedId} onChange={(e) => handleComplaintChange(e.target.value)}>
                {complaints.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.id}] {item.title.slice(0, 45)} ({item.location})
                  </option>
                ))}
              </select>
            </div>
            {selectedComplaint && (
              <div className="studio-complaint-badge">
                <b>{selectedComplaint.id}:</b> {selectedComplaint.title}
                <small>Location: {selectedComplaint.location} · {selectedComplaint.upvotes || 1} Student Upvote(s) · Priority: {selectedComplaint.priority}</small>
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className="studio-card">
            <div className="studio-card-header">
              <Wrench size={15} />
              <span>2. Choose Standard Template (Out of 3)</span>
            </div>
            <div className="studio-template-grid">
              <button
                type="button"
                className={`studio-tpl-card ${templateType === "repair" ? "active" : ""}`}
                onClick={() => setTemplateType("repair")}
              >
                <div className="tpl-icon"><Wrench size={16} /></div>
                <b>Template 1: Property Repair</b>
                <span>For broken pipes, leaks, electrical faults, civil damage.</span>
              </button>

              <button
                type="button"
                className={`studio-tpl-card ${templateType === "installation" ? "active" : ""}`}
                onClick={() => setTemplateType("installation")}
              >
                <div className="tpl-icon"><Building size={16} /></div>
                <b>Template 2: New Installation</b>
                <span>For water purifiers, solar lights, CCTV, Wi-Fi equipment.</span>
              </button>

              <button
                type="button"
                className={`studio-tpl-card ${templateType === "grievance" ? "active" : ""}`}
                onClick={() => setTemplateType("grievance")}
              >
                <div className="tpl-icon"><GraduationCap size={16} /></div>
                <b>Template 3: Student Grievance</b>
                <span>For exam marksheet rectification, fees, welfare disputes.</span>
              </button>
            </div>
          </div>

          {/* Sender & Recipient Details */}
          <div className="studio-card">
            <div className="studio-card-header">
              <Send size={15} />
              <span>3. Sender & Recipient Particulars</span>
            </div>

            <div className="studio-row">
              <div className="studio-field">
                <label>Who will send it? (Submitting Officer)</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Dr. H. K. Borah"
                />
              </div>
              <div className="studio-field">
                <label>Sender Designation</label>
                <input
                  type="text"
                  value={senderDesignation}
                  onChange={(e) => setSenderDesignation(e.target.value)}
                  placeholder="e.g. Warden / Head of Department"
                />
              </div>
            </div>

            <div className="studio-field">
              <label>Sender Department / Hostel</label>
              <input
                type="text"
                value={senderDepartment}
                onChange={(e) => setSenderDepartment(e.target.value)}
                placeholder="e.g. Padma Nath Gohain Baruah Chatra Nivas"
              />
            </div>

            <div className="studio-field">
              <label>Who will it be sent to? (Authority)</label>
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
              <input
                type="text"
                value={recipientTitle}
                onChange={(e) => setRecipientTitle(e.target.value)}
                placeholder="e.g. The Vice-Chancellor"
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

          {/* Letter Body Customization */}
          <div className="studio-card">
            <div className="studio-card-header-split">
              <div className="studio-card-header">
                <FileText size={15} />
                <span>4. Letter Drafting & Paragraphs</span>
              </div>
              <button
                type="button"
                className="ai-polish-btn"
                onClick={handleAiPolish}
                disabled={loadingAi}
              >
                {loadingAi ? <><Loader2 size={13} className="spin" /> Polishing...</> : <><Sparkles size={13} /> AI Polish Letter</>}
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
              <label>Paragraph 2: Impact, Urgency & Student Petition Reference</label>
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

        {/* Right Column: Live Official Letter Preview (A4 Paper) */}
        <div className="app-studio-preview-pane">
          <div className="preview-toolbar no-print">
            <div className="preview-indicator">
              <i /> Live A4 Letter Preview (No Logo · Standard Times-Roman Format)
            </div>
            <button type="button" className="text-print-btn" onClick={handlePrint}>
              <Printer size={13} /> Print Application
            </button>
          </div>

          <div className="a4-sheet-container">
            <div className="a4-sheet printable-application" id="printable-letter">
              {/* Date */}
              <div className="letter-date">Date: {currentDate}</div>

              {/* Recipient */}
              <div className="letter-recipient">
                To,<br />
                <b>{recipientTitle}</b>,<br />
                {recipientInstitution}.
              </div>

              {/* Through Channel */}
              {throughChannel && (
                <div className="letter-through-channel">
                  <i>{throughChannel}</i>
                </div>
              )}

              {/* Subject */}
              <div className="letter-subject">
                <b>Subject: {subject}</b>
              </div>

              {/* Salutation */}
              <div className="letter-salutation">
                Respected Sir,
              </div>

              {/* Body */}
              <div className="letter-body">
                <p>{p1}</p>
                <p>{p2}</p>
                <p>{p3}</p>
              </div>

              {/* Closing */}
              <div className="letter-closing">
                Thanking you.
              </div>

              {/* Signatory */}
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
  );
}

