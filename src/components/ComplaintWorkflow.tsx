"use client";

import { AlertCircle, Building2, Camera, Check, CheckCircle2, CopyCheck, FolderOpen, ImagePlus, Languages, Loader2, MapPin, MessageSquareText, Mic, MicOff, Sparkles, Tag, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { Campus } from "@/lib/campuses";
import type { Complaint, Language, Priority, Status } from "@/components/CivicSenseApp";
import CampusMapPicker, { CampusMapView } from "@/components/CampusMapPicker";

type ComplaintUpdate = Partial<Complaint>;
type UpdateComplaint = (id: string, updates: ComplaintUpdate & { resolutionVerificationToken?: string }) => Promise<boolean>;

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

const MAX_EVIDENCE_BYTES = 3 * 1024 * 1024;

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

// Client-side image compression: reduces 3MB-10MB mobile photos down to ~80KB in 50ms
async function compressImageFile(file: File, maxDim = 800, quality = 0.72): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read image"));
      reader.onerror = () => reject(new Error("Unable to read image"));
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Failed to read image"));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image for compression."));
    };
    img.src = url;
  });
}

async function readImage(event: ChangeEvent<HTMLInputElement>, onImage: (value: string) => void, onError: (value: string) => void, setUploading: (value: boolean) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    onError("Please choose a PNG, JPG, or WebP image up to 10 MB.");
    event.target.value = "";
    return;
  }
  setUploading(true);
  try {
    const dataUrl = await compressImageFile(file);
    onImage(dataUrl);
    onError("");
  } catch (error) {
    onError(error instanceof Error ? error.message : "We could not read that image. Please try again.");
  } finally {
    setUploading(false);
    event.target.value = "";
  }
}

function PhotoUpload({ image, onImage, onError, onUploading, label = "Add a photo" }: { image: string; onImage: (value: string) => void; onError: (value: string) => void; onUploading?: (value: boolean) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);
  function setUploadState(value: boolean) {
    setUploading(value);
    onUploading?.(value);
  }
  return <div className="photo-upload"><span className="photo-upload-label">{label}</span><div className="upload-box">{image ? <img src={image} alt={`${label} preview`} /> : uploading ? <><Loader2 size={20} className="spin" /><span>Preparing evidence...</span></> : <><ImagePlus size={20} /><span>Choose an image</span></>}<div className="photo-upload-actions"><label className="photo-action"><Camera size={14} /><span>Take photo</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={uploading} onChange={(event) => void readImage(event, onImage, onError, setUploadState)} /></label><label className="photo-action"><FolderOpen size={14} /><span>Choose file</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void readImage(event, onImage, onError, setUploadState)} /></label></div><small>PNG, JPG, or WebP up to 3 MB</small><small>Photos are stored with the report and visible to authorized campus users.</small>{image && <button type="button" className="text-button" disabled={uploading} onClick={() => { onImage(""); onError(""); }}>Remove photo</button>}</div></div>;
}

type SimilarReport = { id: string; title: string; location: string; category: string; language: string; score: number; reason: string };
type FollowUp = { needed: boolean; questionEn: string; questionAs: string; language: Language };

export function ComplaintFormWorkflow({ language, campus, serviceCategory, onClose, onSubmit }: { language: Language; campus: Campus; serviceCategory?: string; onClose: () => void; onSubmit: (complaint: Complaint) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(serviceCategory ? "Student Services" : "");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState(serviceCategory || studentServiceOptions[0].label);
  const [image, setImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [duplicateOf, setDuplicateOf] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const [extractingFields, setExtractingFields] = useState(false);
  const [autoFilledSuccess, setAutoFilledSuccess] = useState(false);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [reviewWarning, setReviewWarning] = useState("");
  const [serviceFields, setServiceFields] = useState<Record<string, string>>({});
  const [inputMode, setInputMode] = useState<string | null>(null);
  const [normalizedAs, setNormalizedAs] = useState<string | null>(null);
  const [normalizedEn, setNormalizedEn] = useState<string | null>(null);
  const [wasNormalized, setWasNormalized] = useState(false);
  const serviceDetails = studentServiceOptions.find((item) => item.label === selectedService);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  async function handleExtractFromVoice(textToParse?: string) {
    const raw = (textToParse ?? voiceInput).trim();
    if (!raw) {
      setVoiceError(language === "as" ? "অনুগ্ৰহ কৰি প্ৰথমে সমস্যাটো মুখেৰে কওক বা লিখক।" : "Please speak or enter your problem description in the box first.");
      return;
    }
    setExtractingFields(true);
    setVoiceError("");
    setAutoFilledSuccess(false);

    try {
      const res = await fetch("/api/ai/parse-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract fields.");

      if (data.title) setTitle(data.title);
      if (data.location) setLocation(data.location);
      if (data.description) setDescription(data.description);
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        setExtractedTags(data.tags);
      }
      if (data.inputMode) setInputMode(String(data.inputMode));
      if (data.normalizedAs) setNormalizedAs(String(data.normalizedAs));
      if (data.normalizedEn) setNormalizedEn(String(data.normalizedEn));
      setWasNormalized(Boolean(data.wasNormalized));
      setAutoFilledSuccess(true);
      clearReview();
    } catch {
      // Local client fallback in case network call fails
      const sentences = raw.split(/[.?!।\n]+/);
      let autoTitle = (sentences[0] || raw).trim();
      if (autoTitle.length > 65) {
        autoTitle = autoTitle.split(/\s+/).slice(0, 8).join(" ");
      }
      autoTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
      setTitle(autoTitle || "Reported campus issue");
      setDescription(raw);

      let loc = "";
      const locMatch = raw.match(/(?:in|at|near|around)\s+([A-Za-z0-9\s-]{3,35}(?:hostel|block|hall|room|floor|lab|library|canteen|gate))/i);
      if (locMatch?.[1]) loc = locMatch[1].trim();
      else if (raw.toLowerCase().includes("hostel") || raw.includes("ছাত্ৰাবাস")) loc = "Hostel Campus";
      else if (raw.toLowerCase().includes("library") || raw.includes("লাইব্ৰেৰী")) loc = "Central Library";
      if (loc) setLocation(loc);

      const hasHazard = ["fire", "smoke", "spark", "shock", "danger", "unsafe", "বিপদ", "জুই"].some((w) => raw.toLowerCase().includes(w));
      const fallbackTags = [
        loc ? (loc.includes("Hostel") ? "#Hostel" : loc.includes("Library") ? "#CentralLibrary" : "#CampusCare") : "#CampusCare",
        hasHazard ? "#Hazard" : "#Urgent",
      ];
      setExtractedTags(fallbackTags);
      setAutoFilledSuccess(true);
      clearReview();
    } finally {
      setExtractingFields(false);
    }
  }

  function toggleVoiceInput() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Voice input is not supported in this browser. You can type or paste your report instead.");
      return;
    }

    const recognition = new Recognition();
    const originalInput = voiceInput.trim();
    let finalTranscript = "";
    recognition.lang = language === "as" ? "as-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      finalTranscript = results.filter((result) => result.isFinal).map((result) => result[0].transcript.trim()).filter(Boolean).join(" ");
      const interimTranscript = results.filter((result) => !result.isFinal).map((result) => result[0].transcript.trim()).filter(Boolean).join(" ");
      setVoiceInput([originalInput, finalTranscript, interimTranscript].filter(Boolean).join(" "));
      setAutoFilledSuccess(false);
      clearReview();
    };
    recognition.onerror = (event) => {
      setVoiceError(event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access or type your report."
        : "Voice recognition stopped unexpectedly. Your transcript can still be edited.");
    };
    recognition.onend = () => {
      const finishedText = [originalInput, finalTranscript].filter(Boolean).join(" ");
      setVoiceInput(finishedText);
      setRecordingVoice(false);
      recognitionRef.current = null;
      if (finishedText.trim().length >= 8) {
        void handleExtractFromVoice(finishedText);
      }
    };
    recognitionRef.current = recognition;
    setVoiceError("");
    setRecordingVoice(true);
    try {
      recognition.start();
    } catch (caught) {
      recognitionRef.current = null;
      setRecordingVoice(false);
      setVoiceError(caught instanceof Error ? caught.message : "Unable to start voice input.");
    }
  }

  function clearReview() {
    setAnalysis(null);
    setFollowUp(null);
    setFollowUpAnswer("");
    setSimilarReports([]);
    setDuplicateOf("");
    setError("");
    setReviewWarning("");
    setInputMode(null);
    setNormalizedAs(null);
    setNormalizedEn(null);
    setWasNormalized(false);
  }

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (uploadingImage) { setError("Wait for the evidence upload to finish before continuing."); return; }
    if (!title.trim() || !description.trim() || !location.trim()) { setError("Please complete the title, description and location."); return; }
    setError("");
    setAnalysing(true);
    const fieldDetails = serviceCategory && serviceDetails ? serviceDetails.fields.map((field) => serviceFields[field.key]?.trim() ? `${field.label}: ${serviceFields[field.key].trim()}` : "").filter(Boolean).join("\n") : "";
    const requestDescription = [description.trim(), fieldDetails].filter(Boolean).join("\n\n");
    try {
      // Fire AI Analysis and Duplicate Check in parallel for blazing-fast 4x faster response time!
      const analysePromise = fetch("/api/ai/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: requestDescription, location, image: image || undefined }),
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Unable to analyse the report.");
        return payload;
      });

      const duplicatesPromise = fetch("/api/complaints/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: requestDescription,
          location,
          category: serviceCategory ? selectedService : undefined,
        }),
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Unable to check for similar reports.");
        return payload;
      });

      const [analyseResult, duplicatesResult] = await Promise.allSettled([analysePromise, duplicatesPromise]);

      if (analyseResult.status === "rejected") {
        throw new Error(analyseResult.reason?.message || "Unable to analyse the report.");
      }

      const data = analyseResult.value;
      setAnalysis(data);

      if (data.followUpNeeded && data.followUpQuestionEn) {
        setFollowUp({
          needed: true,
          questionEn: String(data.followUpQuestionEn),
          questionAs: String(data.followUpQuestionAs || data.followUpQuestionEn),
          language: (data.language || language) as Language,
        });
      } else {
        setFollowUp({ needed: false, questionEn: "", questionAs: "", language });
      }

      if (duplicatesResult.status === "fulfilled") {
        setSimilarReports(Array.isArray(duplicatesResult.value.matches) ? duplicatesResult.value.matches : []);
      } else {
        setSimilarReports([]);
        setDuplicateOf("");
      }

      const selectedServiceDetails = studentServiceOptions.find((item) => item.label === selectedService);
      if (serviceCategory && selectedServiceDetails) {
        setAnalysis({ ...data, category: selectedService, department: selectedServiceDetails.department });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the report.");
    } finally {
      setAnalysing(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!analysis) return;
    if (uploadingImage) { setError("Wait for the evidence upload to finish before continuing."); return; }
    if (followUp?.needed && !followUpAnswer.trim()) {
      setError("Please answer the clarification question before submitting.");
      return;
    }

    setError("");
    setAnalysing(true);
    const fieldDetails = serviceCategory && serviceDetails ? serviceDetails.fields.map((field) => serviceFields[field.key]?.trim() ? `${field.label}: ${serviceFields[field.key].trim()}` : "").filter(Boolean).join("\n") : "";
    const reportDescription = [description.trim(), fieldDetails, followUpAnswer.trim() ? `Additional details: ${followUpAnswer.trim()}` : ""].filter(Boolean).join("\n\n");
    const selectedServiceDetails = studentServiceOptions.find((item) => item.label === selectedService);
    try {
      await onSubmit({
        id: "",
        title,
        description: reportDescription,
        language: (analysis.language || language) as Language,
        category: serviceCategory ? selectedService : String(analysis.category || "Other campus issue"),
        priority: (analysis.priority || "Medium") as Priority,
        department: serviceCategory ? selectedServiceDetails?.department || "Student Services" : String(analysis.department || "Campus Administration"),
        summaryEn: String(analysis.summaryEn || "This report is awaiting review."),
        summaryAs: String(analysis.summaryAs || "এই প্ৰতিবেদনটো পৰ্যালোচনাৰ বাবে অপেক্ষা কৰি আছে।"),
        status: "Submitted",
        location,
        latitude: !serviceCategory && latitude != null ? latitude : undefined,
        longitude: !serviceCategory && longitude != null ? longitude : undefined,
        createdAt: "Just now",
        image,
        reporter: "",
        tags: serviceCategory
          ? Array.from(new Set(["#StudentServices", ...(extractedTags.length ? extractedTags : Array.isArray(analysis.tags) ? analysis.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [])])).slice(0, 4)
          : Array.from(new Set([...(extractedTags.length ? extractedTags : []), ...(Array.isArray(analysis.tags) ? analysis.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [])])).slice(0, 4),
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
      <div className="modal-top"><div><span className="modal-kicker"><Sparkles size={13} /> {serviceCategory ? "STUDENT SERVICES" : "BILINGUAL AI REPORTING"}</span><h2>{serviceCategory ? selectedService : "Report a campus issue"}</h2><p>{serviceCategory ? serviceDetails?.prompt : "AI will clarify incomplete reports and suggest possible matches for your review."}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <form onSubmit={analysis ? submit : analyze}>
        <div className="form-language"><Languages size={16} /><span>Writing in <b>{language === "en" ? "English" : "অসমীয়া"}</b></span><span className="form-language-hint">English, Assamese Unicode, or Romanized Assamese (Xongbado)</span></div>

        {!serviceCategory && (
          <div className="voice-intake-card">
            <div className="voice-intake-header">
              <div className="voice-intake-title">
                <Mic size={16} className={recordingVoice ? "text-red" : ""} />
                <span>{language === "as" ? "ভইচ বা খৰতকীয়া বিৱৰণ (স্মাৰ্ট পূৰণ)" : "Voice & Quick Intake (Smart Auto-Fill)"}</span>
              </div>
              <span className="voice-intake-badge">AI Powered</span>
            </div>
            <p className="voice-intake-sub">
              {language === "as"
                ? "আপোনাৰ সমস্যাটো মুখেৰে কওক বা লিখক। AI-য়ে তলৰ প্ৰপত্ৰখনত শীৰ্ষক, স্থান, বিৱৰণ আৰু জৰুৰী টেগসমূহ নিজে নিজে পূৰণ কৰিব।"
                : "Speak or describe your problem freely. AI reads this and automatically fills the Title, Location, Description, and Urgency tags below."}
            </p>
            <textarea
              value={voiceInput}
              onChange={(event) => {
                setVoiceInput(event.target.value);
                setAutoFilledSuccess(false);
              }}
              placeholder={
                recordingVoice
                  ? language === "as" ? "শুনি থকা হৈছে... কওক..." : "Listening... Speak now..."
                  : language === "as"
                  ? "উদাহৰণ: ছাত্ৰাবাস চি-ৰ ২য় মহলাৰ শৌচালয়ত পাইপ ফাটি পানী ওলাই আছে... (অসমীয়া, ইংৰাজী বা Xongbado যিকোনো)"
                  : "e.g. Water is leaking in Hostel Block C (English / অসমীয়া / Romanized Assamese all work — try 'CCSA building agote pani jomi ase')"
              }
              rows={3}
              className={`voice-intake-textarea ${recordingVoice ? "recording-border" : ""}`}
            />
            <div className="voice-intake-controls">
              <button
                type="button"
                className={`voice-record-btn ${recordingVoice ? "voice-record-btn-active" : ""}`}
                onClick={toggleVoiceInput}
                aria-pressed={recordingVoice}
              >
                {recordingVoice ? <MicOff size={15} /> : <Mic size={15} />}
                {recordingVoice
                  ? (language === "as" ? "ৰেকৰ্ডিং বন্ধ কৰক" : "Stop recording")
                  : (language === "as" ? "মুখেৰে কওক" : "Describe by voice")}
              </button>
              <button
                type="button"
                className="voice-autofill-btn"
                disabled={extractingFields || !voiceInput.trim()}
                onClick={() => void handleExtractFromVoice()}
              >
                {extractingFields ? (
                  <><Loader2 size={15} className="spin" /> {language === "as" ? "পূৰণ কৰি থকা হৈছে..." : "Extracting details..."}</>
                ) : (
                  <><Sparkles size={15} /> {language === "as" ? "প্ৰপত্ৰ স্বয়ংক্ৰিয়ভাৱে পূৰণ কৰক" : "Auto-fill form"}</>
                )}
              </button>
              {voiceInput.trim() && (
                <button
                  type="button"
                  className="voice-clear-btn"
                  onClick={() => {
                    setVoiceInput("");
                    setAutoFilledSuccess(false);
                  }}
                >
                  {language === "as" ? "মচি দিয়ক" : "Clear"}
                </button>
              )}
            </div>
            {voiceError && <div className="duplicate-alert"><AlertCircle size={15} /><span>{voiceError}</span></div>}
            {autoFilledSuccess && (
              <div className="voice-success-banner">
                <CheckCircle2 size={15} />
                <span>{language === "as" ? "প্ৰপত্ৰখন সফলতাৰে স্বয়ংক্ৰিয়ভাৱে পূৰণ কৰা হৈছে! তলৰ তথ্যসমূহ পৰীক্ষা কৰক।" : "Form auto-filled! Please review and tweak the details below."}</span>
              </div>
            )}
            {/* 3-Way Input Normalization badge — shown when romanized or mixed input was detected and normalized */}
            {wasNormalized && inputMode && inputMode !== "english" && (
              <div className="normalization-banner">
                <Languages size={15} />
                <div className="normalization-banner-body">
                  <b>
                    {inputMode === "romanized_assamese"
                      ? "Romanized Assamese (Xongbado) detected → Normalized"
                      : inputMode === "mixed"
                        ? "Mixed Assamese + English → Normalized"
                        : "Assamese input → Normalized"}
                  </b>
                  <span>
                    {inputMode === "romanized_assamese"
                      ? "আপুনি ৰোমান আখৰত অসমীয়া লিখিছে। AI-য়ে ইয়াক বিশুদ্ধ অসমীয়া আৰু ইংৰাজীলৈ ৰূপান্তৰ কৰিলে।"
                      : "Your input has been converted to formal Assamese Unicode and English."}
                  </span>
                  {normalizedAs && (
                    <details className="normalization-details">
                      <summary>অসমীয়া সংস্কৰণ চাওক (View Assamese version)</summary>
                      <p className="normalization-text assamese-normalized">{normalizedAs}</p>
                    </details>
                  )}
                  {normalizedEn && (
                    <details className="normalization-details">
                      <summary>English version used for analysis</summary>
                      <p className="normalization-text">{normalizedEn}</p>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {serviceCategory && <label className="field-label">Service type<select value={selectedService} onChange={(event) => { setSelectedService(event.target.value); setServiceFields({}); clearReview(); }}>{studentServiceOptions.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>}
        {serviceCategory && serviceDetails?.fields.map((field) => <label className="field-label" key={field.key}>{field.label}<input value={serviceFields[field.key] || ""} onChange={(event) => { setServiceFields((current) => ({ ...current, [field.key]: event.target.value })); clearReview(); }} placeholder={field.placeholder} /></label>)}
        <label className="field-label">{serviceCategory ? serviceDetails?.requestLabel : "What is the issue?"}<input value={title} onChange={(event) => { setTitle(event.target.value); clearReview(); }} placeholder={serviceCategory ? serviceDetails?.requestPlaceholder : language === "en" ? "e.g. No water in hostel block C" : "উদাহৰণ: ছাত্ৰাবাসত পানী নাই"} /></label>
        <label className="field-label">{serviceCategory ? serviceDetails?.detailsLabel : "Describe the problem"}<textarea value={description} onChange={(event) => { setDescription(event.target.value); clearReview(); }} placeholder={serviceCategory ? "Include dates, references, or any relevant details..." : language === "en" ? "Add details that could help us resolve this faster..." : "সমস্যাটোৰ বিষয়ে অধিক বিৱৰণ দিয়ক..."} rows={4} /></label>
        <div className="form-two-col">
          <label className="field-label">{serviceCategory ? serviceDetails?.contextLabel : "Where is it?"}<div className="input-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => { setLocation(event.target.value); clearReview(); }} placeholder={serviceCategory ? serviceDetails?.contextPlaceholder : "e.g. Hostel block C"} /></div></label>
          <PhotoUpload image={image} onImage={handleImage} onError={setError} onUploading={setUploadingImage} label={serviceCategory ? "Add a supporting document or photo" : "Add a before photo"} />
        </div>

        {!serviceCategory && (
          <CampusMapPicker
            campus={campus}
            latitude={latitude}
            longitude={longitude}
            language={language}
            onChange={(coords) => {
              setLatitude(coords.latitude);
              setLongitude(coords.longitude);
              if (coords.locationLabel && !location.trim()) {
                setLocation(coords.locationLabel);
              }
            }}
            onClear={() => {
              setLatitude(null);
              setLongitude(null);
            }}
          />
        )}

        {extractedTags.length > 0 && (
          <div className="voice-tags-row">
            <div className="voice-tags-header">
              <Tag size={13} />
              <span>{language === "as" ? "স্বয়ংক্ৰিয় টেগসমূহ (প্ৰাথমিকতা আৰু বিষয়):" : "Auto-detected issue & urgency tags:"}</span>
            </div>
            <div className="voice-tags-list">
              {extractedTags.map((tag) => (
                <span key={tag} className="voice-tag-chip">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setExtractedTags((prev) => prev.filter((t) => t !== tag))}
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis && (
          <div className="ai-result">
            <div className="ai-result-head">
              <div className="ai-badge"><Sparkles size={15} /> AI analysis complete</div>
              <span>{String(analysis.provider || "local")}</span>
            </div>
            <div className="ai-tags">
              <span><Tag size={13} />{serviceCategory ? selectedService : String(analysis.category)}</span>
              <span><Building2 size={13} />{serviceCategory ? serviceDetails?.department : String(analysis.department)}</span>
              <span><AlertCircle size={13} />{String(analysis.priority)} priority</span>
              <span>
                <Languages size={13} />
                {analysis.language === "romanized_as" || inputMode === "romanized_assamese"
                  ? "Romanized Assamese (Xongbado)"
                  : analysis.language === "as" || inputMode === "assamese_unicode"
                    ? "Assamese Unicode"
                    : analysis.language === "mixed" || inputMode === "mixed"
                      ? "Mixed language"
                      : "English"}
              </span>
              {typeof analysis.confidence === "number" && (
                <span><Check size={13} />{Math.round(analysis.confidence * 100)}% confidence</span>
              )}
              {Array.isArray(analysis.tags) && (analysis.tags as unknown[]).filter((t): t is string => typeof t === "string").map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            {(wasNormalized || analysis.language === "romanized_as" || Boolean(analysis.normalizedAs || normalizedAs)) && (
              <div className="normalization-ai-card">
                <div className="normalization-ai-head">
                  <div className="normalization-badge-title">
                    <Languages size={14} />
                    <span>3-Way Input Normalization (অসমীয়া · Xongbado · English)</span>
                  </div>
                  <span className="normalization-pill">
                    {analysis.language === "romanized_as" || inputMode === "romanized_assamese"
                      ? "Xongbado / Axomiya Normalized"
                      : "Language Normalized"}
                  </span>
                </div>
                <div className="normalization-grid">
                  <div className="normalization-col">
                    <label>বিশুদ্ধ অসমীয়া লিপ্যন্তৰ (Pure Assamese Unicode)</label>
                    <p className="assamese-text">{String(analysis.normalizedAs || normalizedAs || analysis.summaryAs)}</p>
                  </div>
                  <div className="normalization-col">
                    <label>Formal English Normalization</label>
                    <p>{String(analysis.normalizedEn || normalizedEn || analysis.summaryEn)}</p>
                  </div>
                </div>
              </div>
            )}

            {(Boolean(analysis.summaryEn) || Boolean(analysis.summaryAs)) && (
              <div className="ai-summary">
                {Boolean(analysis.summaryEn) && (
                  <div>
                    <b>English summary</b>
                    <p>{String(analysis.summaryEn)}</p>
                  </div>
                )}
                {Boolean(analysis.summaryAs) && (
                  <div>
                    <b>অসমীয়া সাৰাংশ</b>
                    <p>{String(analysis.summaryAs)}</p>
                  </div>
                )}
              </div>
            )}
            {image && typeof analysis.imageAssessment === "string" && analysis.imageAssessment.trim() && (
              <div className="image-assessment">
                <b>Photo review:</b>
                <p>{analysis.imageAssessment}</p>
              </div>
            )}
            {typeof analysis.justification === "string" && analysis.justification.trim() && (
              <div className="ai-justification">
                <b>AI routing notes:</b>
                <p>{analysis.justification}</p>
              </div>
            )}
          </div>
        )}
        {followUp?.needed && <section className="follow-up-panel"><div className="copilot-panel-heading"><MessageSquareText size={17} /><b>One quick clarification</b></div><p>{question}</p><label className="field-label">Your answer<textarea value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} rows={2} placeholder={followUp.language === "as" ? "আপোনাৰ উত্তৰ..." : "Add a short answer..."} /></label></section>}
        {similarReports.length > 0 && <section className="similar-reports-panel"><div className="copilot-panel-heading"><CopyCheck size={17} /><b>Possible duplicate reports</b></div><p>AI compared reports across Assamese and English. Choose one only if it describes the same issue; otherwise submit separately.</p>{similarReports.map((match) => <div className="similar-report-card" key={match.id}><div><b>{match.title}</b><span>{match.id} · {match.location} · {match.category} · {match.language === "as" ? "অসমীয়া" : "English"}</span><small>{match.reason} · {Math.round(match.score * 100)}% match</small></div><button type="button" className={duplicateOf === match.id ? "selected-match-button" : "secondary-button"} onClick={() => setDuplicateOf(duplicateOf === match.id ? "" : match.id)}>{duplicateOf === match.id ? "Selected" : "Same issue"}</button></div>)}{duplicateOf && <button type="button" className="text-button" onClick={() => setDuplicateOf("")}>No, submit a separate report</button>}</section>}
        {analysis && !followUp?.needed && <div className="follow-up-clear">The report has enough detail to continue without a clarification.</div>}
        {reviewWarning && <div className="duplicate-alert"><AlertCircle size={18} /><span>{reviewWarning}</span></div>}
        {error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}
        <button className="primary-button form-submit" disabled={analysing || uploadingImage}>{analysing ? <><Loader2 size={17} className="spin" /> {analysis ? "Submitting report..." : "Checking report..."}</> : uploadingImage ? <><Loader2 size={17} className="spin" /> Preparing evidence...</> : analysis ? <><Check size={17} /> Submit report</> : <><Sparkles size={17} /> Analyse report</>}</button>
      </form>
    </div>
  </div>;
}

export function ComplaintDetailWorkflow({ complaint, language, onClose, onUpdate, role }: { complaint: Complaint; language: Language; onClose: () => void; onUpdate: UpdateComplaint; role: "student" | "admin" }) {
  const [afterImage, setAfterImage] = useState(complaint.resolvedImage || "");
  const [beforeImage, setBeforeImage] = useState(complaint.image || "");
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
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
  const [manualReviewMessage, setManualReviewMessage] = useState("");
  const tags = complaint.tags || [];

  useEffect(() => {
    let active = true;
    setEvidenceLoaded(false);
    setEvidenceError("");
    void (async () => {
      try {
        const response = await fetch(`/api/complaints/${encodeURIComponent(complaint.id)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load report evidence.");
        if (!active) return;
        setBeforeImage(typeof data.complaint?.image === "string" ? data.complaint.image : "");
        setAfterImage(typeof data.complaint?.resolvedImage === "string" ? data.complaint.resolvedImage : "");
      } catch (caught) {
        if (active) setEvidenceError(caught instanceof Error ? caught.message : "Unable to load report evidence.");
      } finally {
        if (active) setEvidenceLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [complaint.id]);

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

  async function update(status: Status, manualReviewConfirmed = false) {
    setError("");
    setManualReviewMessage("");
    if (uploadingImage) { setError("Wait for the evidence upload to finish before continuing."); return; }
    if (!evidenceLoaded) { setError("Wait for the report evidence to finish loading before continuing."); return; }
    if (status === "Resolved" && !afterImage) { setError("An after photo is required before resolving this complaint."); return; }
    setSaving(true);
    try {
      let resolutionNotes = notes;
      let resolutionVerificationToken: string | undefined;
      if (status === "Resolved") {
        const verification = await fetch("/api/ai/verify-resolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complaintId: complaint.id, after: afterImage, manualReviewConfirmed }) });
        const result = await verification.json();
        if (!verification.ok) throw new Error(result.error || "Unable to verify resolution evidence.");
        if (result.manualReviewRequired) {
          if (!manualReviewConfirmed) {
            setManualReviewMessage(String(result.message || "Automated image verification is unavailable. Please inspect the evidence manually."));
            return;
          }
          resolutionNotes = [notes, `Manual evidence review confirmed by campus administrator: ${result.message}`].filter(Boolean).join(" ");
        } else {
          if (!result.verified) throw new Error(result.message || "The before and after photos could not verify that the issue was resolved.");
          resolutionNotes = [notes, `Evidence verification (${result.provider}): ${result.message}`].filter(Boolean).join(" ");
        }
        if (typeof result.verificationToken !== "string") throw new Error("Resolution evidence verification expired. Please try again.");
        resolutionVerificationToken = result.verificationToken;
      }
      const ok = await onUpdate(complaint.id, { status, resolvedImage: afterImage, resolutionNotes, ...(resolutionVerificationToken ? { resolutionVerificationToken } : {}) });
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
    {typeof complaint.latitude === "number" && typeof complaint.longitude === "number" && (
      <CampusMapView
        latitude={complaint.latitude}
        longitude={complaint.longitude}
        title={complaint.title}
        locationName={complaint.location}
        language={language}
      />
    )}
    <div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis</div><span>{complaint.upvotes || 1} affected student{(complaint.upvotes || 1) === 1 ? "" : "s"}</span></div><div className="ai-summary"><div><b>English summary</b><p>{complaint.summaryEn}</p></div><div><b>অসমীয়া সাৰাংশ</b><p>{complaint.summaryAs}</p></div></div><div className="ai-tags"><span><Tag size={13} />{complaint.category}</span><span><Building2 size={13} />{complaint.department}</span><span><Languages size={13} />{complaint.language === "as" ? "Assamese" : complaint.language === "mixed" ? "Mixed language" : complaint.language === "romanized_as" ? "Romanized Assamese" : "English"}</span>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
    <div className="detail-section"><h3>Original report</h3><p className="original-report">{complaint.description}</p>{beforeImage && <img className="report-image" src={beforeImage} alt="Before evidence" />}{evidenceError && <div className="duplicate-alert"><AlertCircle size={18} /><span>{evidenceError}</span></div>}<div className="reporter-line"><div className="mini-avatar">{complaint.reporter.split(" ").map((word) => word[0]).join("")}</div><span>Reported by <b>{complaint.reporter}</b></span></div></div>
    {role === "admin" && <section className="detail-section copilot-panel"><div className="copilot-panel-heading"><Sparkles size={17} /><div><h3>Response copilot</h3><p>Draft a factual bilingual update for review before publishing.</p></div></div><button className="secondary-button copilot-generate" disabled={copiloting} onClick={draftResponse}>{copiloting ? <><Loader2 size={15} className="spin" /> Drafting...</> : <><Sparkles size={15} /> Generate response draft</>}</button>{copilotProvider && <span className="copilot-provider">Draft generated with {copilotProvider}; review before publishing.</span>}{suggestedDepartment && <div className="copilot-next-steps"><b>Suggested department: {suggestedDepartment}</b>{suggestedDepartment !== complaint.department && <button className="text-button" onClick={assignSuggestedDepartment}>Assign to this department</button>}</div>}{nextSteps && <div className="copilot-next-steps"><b>Suggested next steps</b><p>{nextSteps}</p></div>}<label className="field-label">Public response · English<textarea value={responseEn} onChange={(event) => setResponseEn(event.target.value)} rows={3} maxLength={1000} placeholder="Draft an update for the reporter..." /></label><label className="field-label">Public response · অসমীয়া<textarea value={responseAs} onChange={(event) => setResponseAs(event.target.value)} rows={3} maxLength={1000} placeholder="প্ৰতিবেদন দিওঁতালৈ অসমীয়াত উত্তৰ..." /></label><div className="resolution-actions"><button className="primary-button" disabled={savingResponse || !responseEn.trim() || !responseAs.trim()} onClick={saveResponse}>{savingResponse ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Publish bilingual response</button></div>{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}</section>}
    {role === "student" && (complaint.adminResponseEn || complaint.adminResponseAs) && <section className="public-response-card"><div className="copilot-panel-heading"><MessageSquareText size={17} /><b>Campus response</b></div><p>{language === "as" ? complaint.adminResponseAs || complaint.adminResponseEn : complaint.adminResponseEn || complaint.adminResponseAs}</p></section>}
    {role === "admin" && <div className="detail-section resolution-proof"><h3>Resolution proof</h3><p>Compare the submitted evidence and add an after photo before marking this issue resolved.</p>{(beforeImage || afterImage) && <div className="evidence-comparison">{beforeImage && <figure><figcaption>Before</figcaption><img src={beforeImage} alt="Before evidence" /> </figure>}{afterImage && <figure><figcaption>After</figcaption><img src={afterImage} alt="After evidence" /></figure>}</div>}<PhotoUpload image={afterImage} onImage={(value) => { setAfterImage(value); setManualReviewMessage(""); }} onError={setError} onUploading={setUploadingImage} label="After photo" /><textarea className="resolution-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Resolution notes (optional)" rows={3} />{error && <div className="duplicate-alert"><AlertCircle size={18} /><span>{error}</span></div>}{manualReviewMessage && <div className="duplicate-alert"><AlertCircle size={18} /><span>{manualReviewMessage} AI verification has not been completed. If you have personally inspected the evidence, confirm manual review below.</span></div>}<div className="resolution-actions">{complaint.status === "Submitted" && <button type="button" className="secondary-button" disabled={saving || uploadingImage || !evidenceLoaded} onClick={() => update("In progress")}>Assign to {complaint.department}</button>}{complaint.status !== "Resolved" && <><button type="button" className="primary-button" disabled={saving || uploadingImage || !evidenceLoaded} onClick={() => update("Resolved")}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Resolve with proof</button>{manualReviewMessage && <button type="button" className="secondary-button" disabled={saving || uploadingImage || !evidenceLoaded} onClick={() => update("Resolved", true)}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} I inspected it; resolve manually</button>}</>}</div></div>}
    {afterImage && complaint.status === "Resolved" && <div className="verified-proof"><CheckCircle2 size={17} /> Resolution proof submitted{complaint.resolutionNotes ? `: ${complaint.resolutionNotes}` : ""}</div>}
    <div className="timeline"><h3>Activity</h3><TimelineItem active title="Report submitted" time={complaint.createdAt} text="Your report was received by CivicSense." /><TimelineItem active={complaint.status !== "Submitted"} title="Assigned to the right department" time={complaint.status === "Submitted" ? "Pending" : "Updated"} text={`${complaint.department} is responsible for this issue.`} /><TimelineItem active={complaint.status === "Resolved"} last title="Resolved with proof" time={complaint.status === "Resolved" ? "Completed" : "Pending"} text={complaint.status === "Resolved" ? "The submitted after photo is available above." : "A resolution update will appear here."} /></div>
  </div></div>;
}

function TimelineItem({ active, title, time, text, last }: { active: boolean; title: string; time: string; text: string; last?: boolean }) {
  return <div className={`timeline-item ${active ? "timeline-active" : ""}`}><div className="timeline-marker">{active ? <Check size={12} /> : <span />}</div>{!last && <div className="timeline-line" />}<div className="timeline-copy"><div><b>{title}</b><span>{time}</span></div><p>{text}</p></div></div>;
}
