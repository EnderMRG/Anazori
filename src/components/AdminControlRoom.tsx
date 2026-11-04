"use client";

import { useState } from "react";
import { AlertCircle, Building2, Check, CheckCircle2, CheckSquare, Clock3, Download, FileText, Filter, MapPin, MessageSquareText, RotateCcw, Search, ShieldCheck, Tag, Users } from "lucide-react";
import ApplicationStudio from "@/components/ApplicationStudio";
import AdminDraftsManager from "@/components/AdminDraftsManager";
import type { Campus } from "@/lib/campuses";
import type { Complaint, Language } from "@/components/CivicSenseApp";
import { AdminSkeleton } from "@/components/SkeletonLoaders";

type AdminControlRoomProps = {
  campus: Campus;
  complaints: Complaint[];
  loading: boolean;
  onSelect: (complaint: Complaint) => void;
  onUpdateComplaint: (id: string, updates: Partial<Complaint>) => void;
  onDraftApplication?: (id: string) => void;
  language?: Language;
};

const departments = [
  "Maintenance",
  "IT Services",
  "Estate & Security",
  "Sanitation",
  "Campus Administration",
  "Library Services",
  "Examination Cell",
  "Accounts & Finance",
  "Academic Section",
  "Registrar's Office",
  "Scholarship Office",
  "Student Welfare Office",
];

const departmentTranslations: Record<string, string> = {
  "Maintenance": "ৰক্ষণাবেক্ষণ শাখা (Maintenance)",
  "IT Services": "তথ্য প্ৰযুক্তি সেৱা (IT Services)",
  "Estate & Security": "সম্পত্তি আৰু নিৰাপত্তা (Estate & Security)",
  "Sanitation": "স্বচ্ছতা আৰু অনাময় (Sanitation)",
  "Campus Administration": "কেম্পাছ প্ৰশাসন (Campus Administration)",
  "Library Services": "গ্ৰন্থাগাৰ সেৱা (Library Services)",
  "Examination Cell": "পৰীক্ষা শাখা (Examination Cell)",
  "Accounts & Finance": "হিচাপ আৰু বিত্ত শাখা (Accounts & Finance)",
  "Academic Section": "শৈক্ষিক শাখা (Academic Section)",
  "Registrar's Office": "পঞ্জীয়কৰ কাৰ্যালয় (Registrar's Office)",
  "Scholarship Office": "বৃত্তি শাখা (Scholarship Office)",
  "Student Welfare Office": "ছাত্ৰ কল্যাণ শাখা (Student Welfare Office)",
};

const categoryTranslations: Record<string, string> = {
  "Water supply": "খোৱাপানী যোগান",
  "Internet / Wi-Fi": "ইণ্টাৰনেট / ৱাই-ফাই",
  "Electrical & power": "বিদ্যুৎ আৰু পোহৰ",
  "Cleanliness": "পৰিষ্কাৰ-পৰিচ্ছন্নতা",
  "Safety & security": "সুৰক্ষা আৰু নিৰাপত্তা",
  "Lab & equipment": "পৰীক্ষাগাৰ আৰু সঁজুলি",
  "Furniture & facilities": "আচবাব আৰু সুবিধা",
  "Transport & access": "যাতায়াত আৰু পথ",
  "Exam fees": "পৰীক্ষাৰ মাচুল",
  "Semester fees": "ছেমিষ্টাৰ মাচুল",
  "Scholarships & financial aid": "বৃত্তি আৰু আৰ্থিক সাহায্য",
  "Student welfare & counselling": "ছাত্ৰ কল্যাণ আৰু পৰামৰ্শ",
  "Library services": "গ্ৰন্থাগাৰ সেৱা",
  "Examinations & marksheets": "পৰীক্ষা আৰু নম্বৰতালিকা",
  "Registration & enrollment": "পঞ্জীয়ন আৰু নামভৰ্তি",
  "Certificates & documents": "প্ৰমাণপত্ৰ আৰু নথি",
  "Hostel & student support": "ছাত্ৰাবাস সাহায্য",
  "Other campus issue": "অন্যান্য কেম্পাছ সমস্যা",
};

export default function AdminControlRoom({ campus, complaints, loading, onSelect, onUpdateComplaint, onDraftApplication, language = "en" }: AdminControlRoomProps) {
  const isAs = language === "as";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [category, setCategory] = useState("All");
  const [department, setDepartment] = useState("All");
  const [queue, setQueue] = useState<"all" | "urgent" | "triage">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStudio, setShowStudio] = useState(false);
  const [applicationDraftingId, setApplicationDraftingId] = useState<string | null>(null);

  const cleanTag = (tag: string) => tag.replace(/^#+/, "").trim();
  const categories = Array.from(new Set(complaints.map((item) => item.category))).sort();
  const departmentsList = Array.from(new Set([...departments, ...complaints.map((item) => item.department).filter(Boolean)])).sort();
  const tags = Array.from(new Set(complaints.flatMap((item) => (item.tags || []).map(cleanTag)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const openCount = complaints.filter((item) => item.status !== "Resolved").length;
  const urgentCount = complaints.filter((item) => (item.priority === "Critical" || item.priority === "High") && item.status !== "Resolved").length;
  const triageCount = complaints.filter((item) => item.status === "Submitted").length;
  const resolvedCount = complaints.filter((item) => item.status === "Resolved").length;
  const hasActiveFilters = Boolean(query || status !== "All" || priority !== "All" || category !== "All" || department !== "All" || activeTags.length > 0);

  const filtered = complaints.filter((item) => {
    const text = `${item.id} ${item.title} ${item.category} ${item.location} ${item.reporter}`.toLowerCase();
    const itemTags = (item.tags || []).map(cleanTag);
    const matchTags = activeTags.length === 0 || activeTags.every((tag) => itemTags.includes(tag));
    return (
      (!query || text.includes(query.toLowerCase())) &&
      (status === "All" || item.status === status) &&
      (priority === "All" || item.priority === priority) &&
      (category === "All" || item.category === category) &&
      (department === "All" || item.department === department) &&
      matchTags &&
      (queue === "all" ||
        (queue === "urgent" && (item.priority === "Critical" || item.priority === "High") && item.status !== "Resolved") ||
        (queue === "triage" && item.status === "Submitted"))
    );
  });
  const allSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  const ui = {
    eyebrow: isAs ? "প্ৰশাসন" : "ADMINISTRATION",
    heading: isAs ? `${campus.name} নিয়ন্ত্ৰণ কক্ষ` : `${campus.name} control room`,
    subtitle: isAs ? "আপোনাৰ কেম্পাছত দাখিল কৰা সকলো অভিযোগ পৰ্যালোচনা কৰক, সংশ্লিষ্ট বিভাগলৈ প্ৰেৰণ কৰক আৰু সমাধান কৰক।" : "Review, route, and resolve every grievance reported to your campus.",
    assignedCampus: isAs ? "নিৰ্ধাৰিত কেম্পাছ" : "Assigned campus",
    totalReports: isAs ? "মুঠ অভিযোগ" : "Total reports",
    needsAction: isAs ? "ব্যৱস্থা ল’বলগীয়া" : "Needs action",
    urgentQueue: isAs ? "জৰুৰী শাৰী" : "Urgent queue",
    resolved: isAs ? "সমাধান হোৱা" : "Resolved",
    awaitingTriage: isAs ? "নিৰীক্ষণৰ অপেক্ষাত" : "Awaiting triage",
    allReportsTab: isAs ? "সকলো অভিযোগ" : "All reports",
    urgentTab: isAs ? "জৰুৰী" : "Urgent",
    needsTriageTab: isAs ? "নিৰীক্ষণ প্ৰয়োজন" : "Needs triage",
    searchPlaceholder: isAs ? "অভিযোগ, দাখিলকাৰী, স্থান বিচাৰক..." : "Search reports, reporters, locations...",
    statusLabel: isAs ? "অৱস্থা" : "Status",
    allStatuses: isAs ? "সকলো অৱস্থা" : "All Statuses",
    statusSubmitted: isAs ? "দাখিল কৰা হ’ল (Submitted)" : "Submitted",
    statusInProgress: isAs ? "প্ৰক্ৰিয়াধীন (In progress)" : "In progress",
    statusResolved: isAs ? "সমাধান হোৱা (Resolved)" : "Resolved",
    priorityLabel: isAs ? "অগ্ৰাধিকাৰ" : "Priority",
    allPriorities: isAs ? "সকলো অগ্ৰাধিকাৰ" : "All Priorities",
    priorityCritical: isAs ? "সংকটজনক (Critical)" : "Critical",
    priorityHigh: isAs ? "উচ্চ (High)" : "High",
    priorityMedium: isAs ? "মধ্যম (Medium)" : "Medium",
    priorityLow: isAs ? "নিম্ন (Low)" : "Low",
    categoryLabel: isAs ? "শ্ৰেণী" : "Category",
    allCategories: isAs ? "সকলো শ্ৰেণী" : "All Categories",
    deptLabel: isAs ? "বিভাগ" : "Dept",
    allDepartments: isAs ? "সকলো বিভাগ" : "All Departments",
    reset: isAs ? "ৰিচেট" : "Reset",
    resetTitle: isAs ? "সকলো ফিল্টাৰ প্ৰাৰম্ভিক কৰক" : "Reset all filters to show all reports",
    exportCsv: isAs ? "CSV সংগ্ৰহ" : "Export CSV",
    tagsLabel: isAs ? "টেগসমূহ" : "Tags",
    allTags: isAs ? "সকলো" : "All",
    allTagsTitle: isAs ? "সকলো টেগৰ অভিযোগ দেখুৱাওক" : "Show reports with all tags",
    selectedCount: (n: number) => isAs ? `${n} টা নিৰ্বাচিত` : `${n} selected`,
    bulkActions: isAs ? "সামূহিক ব্যৱস্থা" : "Bulk actions",
    assignDeptPlaceholder: isAs ? "বিভাগ নিৰ্ধাৰণ কৰক" : "Assign department",
    markInProgress: isAs ? "প্ৰক্ৰিয়াধীন বুলি চিহ্নিত কৰক" : "Mark in progress",
    proofHint: isAs ? "সমাধানৰ প্ৰমাণ যোগ কৰিবলৈ প্ৰতিবেদন খোলক" : "Open each report to add resolution proof",
    clear: isAs ? "বাতিল" : "Clear",
    reportsInCampus: isAs ? `${campus.name}ত ${filtered.length} টা অভিযোগ` : `${filtered.length} reports in ${campus.name}`,
    selectVisible: isAs ? "দৃশ্যমান বাছক" : "Select visible",
    clearSelection: isAs ? "নিৰ্বাচন বাতিল" : "Clear selection",
    liveQueue: isAs ? "প্ৰত্যক্ষ কেম্পাছ শাৰী" : "Live campus queue",
    assignBtn: isAs ? "বিভাগত দিয়ক" : "Assign",
    proofResolveBtn: isAs ? "প্ৰমাণ আৰু সমাধান" : "Proof & resolve",
    emptyTitle: isAs ? "এই ফিল্টাৰৰ সৈতে কোনো অভিযোগ পোৱা নগ’ল" : "No reports match these filters",
    emptySubtitle: isAs ? "ফিল্টাৰ আঁতৰাই বা অনুসন্ধান সলনি কৰি চাওক।" : "Try clearing a filter or changing your search.",
  };

  if (loading) return <AdminSkeleton />;

  function toggle(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleAll() { setSelectedIds(allSelected ? [] : filtered.map((item) => item.id)); }
  function bulkUpdate(updates: Partial<Complaint>) { selectedIds.forEach((id) => onUpdateComplaint(id, updates)); setSelectedIds([]); }
  function exportCsv() {
    const rows = filtered.map((item) => [item.id, item.title, item.category, item.priority, item.department, item.status, item.location, item.reporter, (item.tags || []).map(cleanTag).join(" "), item.createdAt]);
    const csv = [["ID", "Title", "Category", "Priority", "Department", "Status", "Location", "Reporter", "Tags", "Created"], ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${campus.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-grievances.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  function getStatusLabel(s: string) {
    if (!isAs) return s;
    if (s === "Submitted") return "দাখিল কৰা হ’ল";
    if (s === "In progress") return "প্ৰক্ৰিয়াধীন";
    if (s === "Resolved") return "সমাধান হোৱা";
    return s;
  }

  function getPriorityLabel(p: string) {
    if (!isAs) return p;
    if (p === "Critical") return "সংকটজনক";
    if (p === "High") return "উচ্চ";
    if (p === "Medium") return "মধ্যম";
    if (p === "Low") return "নিম্ন";
    return p;
  }

  return (
    <div className="page-enter admin-page">
      <section className="admin-heading">
        <div>
          <div className="eyebrow"><ShieldCheck size={14} /> {ui.eyebrow}</div>
          <h1>{ui.heading}</h1>
          <p>{ui.subtitle}</p>
        </div>
        <div className="admin-fixed-campus">
          <Building2 size={15} /> {campus.name}
          <span>{ui.assignedCampus}</span>
        </div>
      </section>

      <section className="admin-metric-grid">
        <AdminMetric icon={<MessageSquareText size={18} />} label={ui.totalReports} value={complaints.length} accent="blue" />
        <AdminMetric icon={<Clock3 size={18} />} label={ui.needsAction} value={openCount} accent="orange" />
        <AdminMetric icon={<AlertCircle size={18} />} label={ui.urgentQueue} value={urgentCount} accent="red" />
        <AdminMetric icon={<CheckCircle2 size={18} />} label={ui.resolved} value={resolvedCount} accent="green" />
        <AdminMetric icon={<Users size={18} />} label={ui.awaitingTriage} value={triageCount} accent="purple" />
      </section>

      <div className="admin-queue-tabs">
        <button className={queue === "all" ? "active-admin-tab" : ""} onClick={() => setQueue("all")}>
          {ui.allReportsTab} <b>{complaints.length}</b>
        </button>
        <button className={queue === "urgent" ? "active-admin-tab urgent-tab" : "urgent-tab"} onClick={() => setQueue("urgent")}>
          <AlertCircle size={14} /> {ui.urgentTab} <b>{urgentCount}</b>
        </button>
        <button className={queue === "triage" ? "active-admin-tab" : ""} onClick={() => setQueue("triage")}>
          <Clock3 size={14} /> {ui.needsTriageTab} <b>{triageCount}</b>
        </button>
      </div>

      <div className="admin-toolbar admin-filter-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui.searchPlaceholder} />
        </div>

        <div className="admin-filter-field">
          <span className="admin-filter-label">{ui.statusLabel}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} title={ui.statusLabel}>
            <option value="All">{ui.allStatuses}</option>
            <option value="Submitted">{ui.statusSubmitted}</option>
            <option value="In progress">{ui.statusInProgress}</option>
            <option value="Resolved">{ui.statusResolved}</option>
          </select>
        </div>

        <div className="admin-filter-field">
          <span className="admin-filter-label">{ui.priorityLabel}</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} title={ui.priorityLabel}>
            <option value="All">{ui.allPriorities}</option>
            <option value="Critical">{ui.priorityCritical}</option>
            <option value="High">{ui.priorityHigh}</option>
            <option value="Medium">{ui.priorityMedium}</option>
            <option value="Low">{ui.priorityLow}</option>
          </select>
        </div>

        <div className="admin-filter-field">
          <span className="admin-filter-label">{ui.categoryLabel}</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} title={ui.categoryLabel}>
            <option value="All">{ui.allCategories}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {isAs && categoryTranslations[item] ? `${categoryTranslations[item]} (${item})` : item}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-field">
          <span className="admin-filter-label">{ui.deptLabel}</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} title={ui.deptLabel}>
            <option value="All">{ui.allDepartments}</option>
            {departmentsList.map((item) => (
              <option key={item} value={item}>
                {isAs ? departmentTranslations[item] || item : item}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-clear-filters"
            title={ui.resetTitle}
            onClick={() => {
              setQuery("");
              setStatus("All");
              setPriority("All");
              setCategory("All");
              setDepartment("All");
              setActiveTags([]);
            }}
          >
            <RotateCcw size={12} /> {ui.reset}
          </button>
        )}

        <button className="admin-export" onClick={exportCsv}>
          <Download size={15} /> {ui.exportCsv}
        </button>

        <button
          type="button"
          className="admin-studio-top-btn"
          title="Open Formal Application Studio"
          onClick={() => {
            const targetId = filtered[0]?.id || complaints[0]?.id || "";
            if (onDraftApplication) {
              onDraftApplication(targetId);
            } else {
              setApplicationDraftingId(targetId);
              setShowStudio(true);
            }
          }}
        >
          <FileText size={15} /> <span>{isAs ? "আবেদন ষ্টুডিঅ’" : "Application Studio"}</span>
        </button>
      </div>

      {tags.length > 0 && (
        <div className="tag-filter-bar">
          <Tag size={15} />
          <span>{ui.tagsLabel}</span>
          <button
            type="button"
            className={activeTags.length === 0 ? "active-tag-filter" : ""}
            onClick={() => setActiveTags([])}
            title={ui.allTagsTitle}
          >
            {ui.allTags} <b>{complaints.length}</b>
          </button>
          {tags.map((tag) => {
            const count = complaints.filter((item) => (item.tags || []).map(cleanTag).includes(tag)).length;
            return (
              <button
                type="button"
                className={activeTags.includes(tag) ? "active-tag-filter" : ""}
                key={tag}
                onClick={() => setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}
              >
                {tag} <b>{count}</b>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span><CheckSquare size={15} /> {ui.selectedCount(selectedIds.length)}</span>
          <span className="bulk-label">{ui.bulkActions}</span>
          <select defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate({ department: event.target.value }); }}>
            <option value="" disabled>{ui.assignDeptPlaceholder}</option>
            {departmentsList.map((item) => (
              <option key={item} value={item}>
                {isAs ? departmentTranslations[item] || item : item}
              </option>
            ))}
          </select>
          <button onClick={() => bulkUpdate({ status: "In progress" })}>
            <Clock3 size={14} /> {ui.markInProgress}
          </button>
          <span className="bulk-label">{ui.proofHint}</span>
          <button className="bulk-clear" onClick={() => setSelectedIds([])}>{ui.clear}</button>
        </div>
      )}

      <div className="list-panel admin-list">
        <div className="list-header">
          <span>{ui.reportsInCampus}</span>
          <span className="admin-list-actions">
            <button onClick={toggleAll}><CheckSquare size={14} /> {allSelected ? ui.clearSelection : ui.selectVisible}</button>
            <span className="admin-live"><i /> {ui.liveQueue}</span>
          </span>
        </div>

        {filtered.length ? (
          filtered.map((item) => (
            <div className={`admin-report-row ${selectedIds.includes(item.id) ? "admin-row-selected" : ""}`} key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selectedIds.includes(item.id)}
                className={`admin-checkbox-btn ${selectedIds.includes(item.id) ? "checked" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(item.id);
                }}
                aria-label={selectedIds.includes(item.id) ? `Deselect ${item.title}` : `Select ${item.title}`}
              >
                <span className="admin-checkbox-square">
                  {selectedIds.includes(item.id) && <Check size={11} strokeWidth={3} />}
                </span>
              </button>

              <button type="button" className="admin-report-main" onClick={() => onSelect(item)}>
                <div className={`admin-report-icon priority-${item.priority.toLowerCase()}`}>
                  <MessageSquareText size={17} />
                </div>
                <div>
                  <b>{item.title}</b>
                  <span className="admin-row-subline">
                    {item.id} · {item.reporter} · {item.location}
                    {typeof item.latitude === "number" && typeof item.longitude === "number" && (
                      <span className="gps-pill" title={`${item.latitude.toFixed(4)}° N, ${item.longitude.toFixed(4)}° E`}>
                        <MapPin size={10} /> {isAs ? "মেপত পিন কৰা" : "Geotagged"}
                      </span>
                    )}
                  </span>
                  <small>
                    {isAs && categoryTranslations[item.category] ? `${categoryTranslations[item.category]} (${item.category})` : item.category} · {isAs ? (departmentTranslations[item.department] || item.department) : item.department}
                  </small>
                  {isAs && item.summaryAs && (
                    <p className="admin-row-summary-as">
                      <b>অসমীয়া সাৰাংশ:</b> {item.summaryAs}
                    </p>
                  )}
                  <div className="row-tags">
                    {(item.tags || []).map((tag) => <em key={tag}>{cleanTag(tag)}</em>)}
                  </div>
                </div>
              </button>

              <div className="admin-report-meta">
                <button
                  type="button"
                  className="admin-draft-app-btn"
                  title="Draft formal application letter to Vice-Chancellor or campus authorities"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onDraftApplication) {
                      onDraftApplication(item.id);
                    } else {
                      setApplicationDraftingId(item.id);
                      setShowStudio(true);
                    }
                  }}
                >
                  <FileText size={13} />
                  <span>{isAs ? "আবেদন লিখক" : "Draft Letter"}</span>
                </button>
                <span className={`status-pill status-${item.status === "In progress" ? "progress" : item.status.toLowerCase()}`}>
                  <i />{getStatusLabel(item.status)}
                </span>
                <span className={`priority priority-${item.priority.toLowerCase()}`}>
                  <span className="priority-dot" />{getPriorityLabel(item.priority)}
                </span>
                <select className="row-department" value={item.department} onChange={(event) => onUpdateComplaint(item.id, { department: event.target.value })}>
                  {departmentsList.map((departmentName) => (
                    <option key={departmentName} value={departmentName}>
                      {isAs ? departmentTranslations[departmentName] || departmentName : departmentName}
                    </option>
                  ))}
                </select>
                {item.status !== "Resolved" && (
                  <button className="small-button" onClick={() => item.status === "Submitted" ? onUpdateComplaint(item.id, { status: "In progress" }) : onSelect(item)}>
                    {item.status === "Submitted" ? ui.assignBtn : ui.proofResolveBtn}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Search size={24} />
            <b>{ui.emptyTitle}</b>
            <span>{ui.emptySubtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminMetric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="admin-metric">
      <span className={`admin-metric-icon ${accent}`}>{icon}</span>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
