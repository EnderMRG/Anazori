"use client";

import { useState } from "react";
import { AlertCircle, Building2, CheckCircle2, CheckSquare, Clock3, Download, Filter, MessageSquareText, Search, ShieldCheck, Tag, Users } from "lucide-react";
import type { Campus } from "@/lib/campuses";
import type { Complaint } from "@/components/CivicSenseApp";
import { AdminSkeleton } from "@/components/SkeletonLoaders";

type AdminControlRoomProps = {
  campus: Campus;
  complaints: Complaint[];
  loading: boolean;
  onSelect: (complaint: Complaint) => void;
  onUpdateComplaint: (id: string, updates: Partial<Complaint>) => void;
};

const departments = ["Maintenance", "IT Services", "Estate & Security", "Sanitation", "Campus Administration"];

export default function AdminControlRoom({ campus, complaints, loading, onSelect, onUpdateComplaint }: AdminControlRoomProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [category, setCategory] = useState("All");
  const [department, setDepartment] = useState("All");
  const [queue, setQueue] = useState<"all" | "urgent" | "triage">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const categories = Array.from(new Set(complaints.map((item) => item.category))).sort();
  const tags = Array.from(new Set(complaints.flatMap((item) => item.tags || []))).sort();
  const openCount = complaints.filter((item) => item.status !== "Resolved").length;
  const urgentCount = complaints.filter((item) => (item.priority === "Critical" || item.priority === "High") && item.status !== "Resolved").length;
  const triageCount = complaints.filter((item) => item.status === "Submitted").length;
  const resolvedCount = complaints.filter((item) => item.status === "Resolved").length;
  const filtered = complaints.filter((item) => {
    const text = `${item.id} ${item.title} ${item.category} ${item.location} ${item.reporter}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (status === "All" || item.status === status) && (priority === "All" || item.priority === priority) && (category === "All" || item.category === category) && (department === "All" || item.department === department) && activeTags.every((tag) => (item.tags || []).includes(tag)) && (queue === "all" || (queue === "urgent" && (item.priority === "Critical" || item.priority === "High") && item.status !== "Resolved") || (queue === "triage" && item.status === "Submitted"));
  });
  const allSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  if (loading) return <AdminSkeleton />;

  function toggle(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleAll() { setSelectedIds(allSelected ? [] : filtered.map((item) => item.id)); }
  function bulkUpdate(updates: Partial<Complaint>) { selectedIds.forEach((id) => onUpdateComplaint(id, updates)); setSelectedIds([]); }
  function exportCsv() {
    const rows = filtered.map((item) => [item.id, item.title, item.category, item.priority, item.department, item.status, item.location, item.reporter, (item.tags || []).join(" "), item.createdAt]);
    const csv = [["ID", "Title", "Category", "Priority", "Department", "Status", "Location", "Reporter", "Tags", "Created"], ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${campus.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-grievances.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="page-enter admin-page">
    <section className="admin-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMINISTRATION</div><h1>{campus.name} control room</h1><p>Review, route, and resolve every grievance reported to your campus.</p></div><div className="admin-fixed-campus"><Building2 size={15} /> {campus.name}<span>Assigned campus</span></div></section>
    <section className="admin-metric-grid"><AdminMetric icon={<MessageSquareText size={18} />} label="Total reports" value={complaints.length} accent="blue" /><AdminMetric icon={<Clock3 size={18} />} label="Needs action" value={openCount} accent="orange" /><AdminMetric icon={<AlertCircle size={18} />} label="Urgent queue" value={urgentCount} accent="red" /><AdminMetric icon={<CheckCircle2 size={18} />} label="Resolved" value={resolvedCount} accent="green" /><AdminMetric icon={<Users size={18} />} label="Awaiting triage" value={triageCount} accent="purple" /></section>
    <div className="admin-queue-tabs"><button className={queue === "all" ? "active-admin-tab" : ""} onClick={() => setQueue("all")}>All reports <b>{complaints.length}</b></button><button className={queue === "urgent" ? "active-admin-tab urgent-tab" : "urgent-tab"} onClick={() => setQueue("urgent")}><AlertCircle size={14} /> Urgent <b>{urgentCount}</b></button><button className={queue === "triage" ? "active-admin-tab" : ""} onClick={() => setQueue("triage")}><Clock3 size={14} /> Needs triage <b>{triageCount}</b></button></div>
    <div className="admin-toolbar admin-filter-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, reporters, locations..." /></div><div className="filter-wrap"><Filter size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Submitted</option><option>In progress</option><option>Resolved</option></select></div><select className="admin-select" value={priority} onChange={(event) => setPriority(event.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><select className="admin-select" value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select className="admin-select" value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><button className="admin-export" onClick={exportCsv}><Download size={15} /> Export CSV</button></div>
    {tags.length > 0 && <div className="tag-filter-bar"><Tag size={15} /><span>Tags</span>{tags.map((tag) => <button className={activeTags.includes(tag) ? "active-tag-filter" : ""} key={tag} onClick={() => setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag} <b>{complaints.filter((item) => (item.tags || []).includes(tag)).length}</b></button>)}</div>}
    {selectedIds.length > 0 && <div className="bulk-actions"><span><CheckSquare size={15} /> {selectedIds.length} selected</span><span className="bulk-label">Bulk actions</span><select defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate({ department: event.target.value }); }}><option value="" disabled>Assign department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => bulkUpdate({ status: "In progress" })}><Clock3 size={14} /> Mark in progress</button><span className="bulk-label">Open each report to add resolution proof</span><button className="bulk-clear" onClick={() => setSelectedIds([])}>Clear</button></div>}
    <div className="list-panel admin-list"><div className="list-header"><span>{filtered.length} reports in {campus.name}</span><span className="admin-list-actions"><button onClick={toggleAll}><CheckSquare size={14} /> {allSelected ? "Clear selection" : "Select visible"}</button><span className="admin-live"><i /> Live campus queue</span></span></div>{filtered.length ? filtered.map((item) => <div className={`admin-report-row ${selectedIds.includes(item.id) ? "admin-row-selected" : ""}`} key={item.id}><label className="admin-checkbox"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} /><span /></label><button onClick={() => onSelect(item)}><div className={`admin-report-icon priority-${item.priority.toLowerCase()}`}><MessageSquareText size={17} /></div><div><b>{item.title}</b><span>{item.id} · {item.reporter} · {item.location}</span><small>{item.category} · {item.department}</small><div className="row-tags">{(item.tags || []).map((tag) => <em key={tag}>{tag}</em>)}</div></div></button><div className="admin-report-meta"><span className={`status-pill status-${item.status === "In progress" ? "progress" : item.status.toLowerCase()}`}><i />{item.status}</span><span className={`priority priority-${item.priority.toLowerCase()}`}><span className="priority-dot" />{item.priority}</span><select className="row-department" value={item.department} onChange={(event) => onUpdateComplaint(item.id, { department: event.target.value })}>{departments.map((departmentName) => <option key={departmentName}>{departmentName}</option>)}</select>{item.status !== "Resolved" && <button className="small-button" onClick={() => item.status === "Submitted" ? onUpdateComplaint(item.id, { status: "In progress" }) : onSelect(item)}>{item.status === "Submitted" ? "Assign" : "Proof & resolve"}</button>}</div></div>) : <div className="empty-state"><Search size={24} /><b>No reports match these filters</b><span>Try clearing a filter or changing your search.</span></div>}</div>
  </div>;
}

function AdminMetric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) { return <div className="admin-metric"><span className={`admin-metric-icon ${accent}`}>{icon}</span><span>{label}</span><b>{value}</b></div>; }
