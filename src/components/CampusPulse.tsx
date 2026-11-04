"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Layers,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import type { Complaint, Language, Status } from "@/components/CivicSenseApp";

export type CampusPulseProps = {
  campusName: string;
  complaints?: Complaint[];
  language?: Language;
  onSelect?: (complaint: Complaint) => void;
  onUpvote?: (id: string) => Promise<void> | void;
  role?: "student" | "admin";
};

type PulseAiResult = {
  answer: string;
  provider: string;
  scope: string;
  metrics: {
    reportsInSample: number;
    activeInSample: number;
    submittedInLast30Days: number;
    submittedInPrior30Days: number;
  };
  references: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    location: string;
    createdAt: string;
  }>;
};

const suggestedQuestions = [
  "Which issues have the most student upvotes right now?",
  "What active repairs are currently in progress?",
  "Which recent issues were resolved with photo proof?",
];

export default function CampusPulse({
  campusName,
  complaints = [],
  language = "en",
  onSelect,
  onUpvote,
  role = "student",
}: CampusPulseProps) {
  const isAssamese = language === "as";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "resolved" | "submitted">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"upvotes" | "recent" | "priority">("upvotes");

  // Tracked ticket for visual 4-stage stepper
  const [trackedTicketId, setTrackedTicketId] = useState<string | null>(null);

  // Local upvoted set stored in localStorage so users retain their votes across sessions
  const storageKey = `civicsense_upvoted_${campusName.replace(/\s+/g, "_")}`;
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});

  // Image lightbox preview
  const [previewImage, setPreviewImage] = useState<{ url: string; caption: string } | null>(null);

  // AI Copilot collapsible state
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResult, setAiResult] = useState<PulseAiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Load user's upvoted complaints from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setUpvotedIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  // Keep upvote counts in sync with complaints prop
  useEffect(() => {
    const counts: Record<string, number> = {};
    complaints.forEach((c) => {
      counts[c.id] = c.upvotes ?? 1;
    });
    setUpvoteCounts((prev) => ({ ...counts, ...prev }));
  }, [complaints]);

  // Automatically select the first ticket to track if none is selected
  useEffect(() => {
    if (!trackedTicketId && complaints.length > 0) {
      setTrackedTicketId(complaints[0].id);
    }
  }, [complaints, trackedTicketId]);

  // Handle upvoting
  async function handleUpvoteClick(e: React.MouseEvent, complaintId: string) {
    e.stopPropagation();
    if (upvotingId) return;

    const alreadyUpvoted = upvotedIds.has(complaintId);
    const nextSet = new Set(upvotedIds);

    if (alreadyUpvoted) {
      // Already upvoted
      return;
    }

    nextSet.add(complaintId);
    setUpvotedIds(nextSet);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSet)));
    } catch {
      // ignore
    }

    // Optimistic count increment
    setUpvoteCounts((prev) => ({
      ...prev,
      [complaintId]: (prev[complaintId] || 1) + 1,
    }));

    setUpvotingId(complaintId);
    try {
      if (onUpvote) {
        await onUpvote(complaintId);
      } else {
        const res = await fetch(`/api/complaints/${encodeURIComponent(complaintId)}/upvote`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.upvotes === "number") {
            setUpvoteCounts((prev) => ({ ...prev, [complaintId]: data.upvotes }));
          }
        }
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    } finally {
      setUpvotingId(null);
    }
  }

  // Ask AI copilot
  async function handleAskAi(event?: FormEvent) {
    event?.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/campus-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: aiQuestion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Campus Pulse could not answer right now.");
      setAiResult(data as PulseAiResult);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Campus Pulse could not answer right now.");
    } finally {
      setAiLoading(false);
    }
  }

  // Filter & sort complaints
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((item) => {
        // Status filter
        if (statusFilter === "in_progress" && item.status !== "In progress") return false;
        if (statusFilter === "resolved" && item.status !== "Resolved") return false;
        if (statusFilter === "submitted" && item.status !== "Submitted") return false;

        // Category filter
        if (categoryFilter !== "all") {
          const cat = (item.category || "").toLowerCase();
          const dept = (item.department || "").toLowerCase();
          const target = categoryFilter.toLowerCase();
          if (!cat.includes(target) && !dept.includes(target)) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchId = item.id.toLowerCase().includes(query);
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchDesc = item.description.toLowerCase().includes(query);
          const matchLoc = (item.location || "").toLowerCase().includes(query);
          const matchCat = (item.category || "").toLowerCase().includes(query);
          const matchDept = (item.department || "").toLowerCase().includes(query);
          if (!matchId && !matchTitle && !matchDesc && !matchLoc && !matchCat && !matchDept) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const countA = upvoteCounts[a.id] ?? a.upvotes ?? 1;
        const countB = upvoteCounts[b.id] ?? b.upvotes ?? 1;

        if (sortBy === "upvotes") {
          return countB - countA;
        }
        if (sortBy === "priority") {
          const priorityScore: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          return (priorityScore[b.priority] || 1) - (priorityScore[a.priority] || 1);
        }
        // recent
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }, [complaints, statusFilter, categoryFilter, searchQuery, sortBy, upvoteCounts]);

  // Aggregate metrics
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) => c.status === "In progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;
  const totalUpvotes = complaints.reduce((sum, c) => sum + (upvoteCounts[c.id] ?? c.upvotes ?? 1), 0);

  // Active tracked ticket details
  const trackedTicket = useMemo(() => {
    return complaints.find((c) => c.id === trackedTicketId) || complaints[0] || null;
  }, [complaints, trackedTicketId]);

  return (
    <div className="page-enter campus-updates-page">
      {/* Page Header */}
      <section className="page-heading-row updates-header-row">
        <div>
          <div className="eyebrow pulse-eyebrow">
            <span className="live-dot" />
            {isAssamese ? "বাস্তৱ সময়ৰ কেম্পাছ ষ্ট্ৰীম" : "LIVE CAMPUS FEED"} · {campusName.toUpperCase()}
          </div>
          <h1>{isAssamese ? "কেম্পাছ আপডেট আৰু সম্প্ৰদায় ফীড" : "Campus Updates & Community Feed"}</h1>
          <p>
            {isAssamese
              ? "কেম্পাছৰ সমস্যাসমূহ প্ৰত্যক্ষ কৰক, চলি থকা কামৰ অগ্ৰগতি চাওক, ফটো প্ৰমাণ পৰীক্ষা কৰক আৰু সমস্যাবোৰত ভোট দি অগ্ৰাধিকাৰ দিয়ক।"
              : "Discover real-time campus issues, follow work progress, inspect verified photo resolutions, and upvote student concerns to elevate department priority."}
          </p>
        </div>

        <div className="updates-top-actions">
          <button
            type="button"
            className={`secondary-button ai-copilot-toggle ${showAiCopilot ? "copilot-active" : ""}`}
            onClick={() => setShowAiCopilot((prev) => !prev)}
          >
            <Sparkles size={16} />
            <span>{isAssamese ? "AI প্ৰশ্ন সুধক" : "Ask Campus AI"}</span>
            <ChevronDown size={14} className={showAiCopilot ? "rotate-180" : ""} />
          </button>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="updates-metrics-grid">
        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-total">
            <Activity size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">{isAssamese ? "মুঠ কেম্পাছ আপডেট" : "Total Campus Updates"}</span>
            <b className="stat-value">{totalCount}</b>
          </div>
          <div className="stat-sub">{isAssamese ? "সকলো বিভাগৰ ৰিপোৰ্ট" : "Logged across departments"}</div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-progress">
            <Clock3 size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">{isAssamese ? "মেরামতি চলি আছে" : "Active Work in Progress"}</span>
            <b className="stat-value">{inProgressCount}</b>
          </div>
          <div className="stat-sub">{isAssamese ? "কৰ্মী দল নিয়োজিত" : "Crews dispatched on site"}</div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-resolved">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">{isAssamese ? "সমাধান হোৱা প্ৰমাণসহ" : "Resolved with Proof"}</span>
            <b className="stat-value">{resolvedCount}</b>
          </div>
          <div className="stat-sub">{isAssamese ? "ফটোসহ পৰীক্ষিত" : "Verified with photo evidence"}</div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-upvotes">
            <Flame size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">{isAssamese ? "মুঠ ছাত্ৰ সমৰ্থন" : "Community Upvotes"}</span>
            <b className="stat-value">{totalUpvotes}</b>
          </div>
          <div className="stat-sub">{isAssamese ? "অগ্ৰাধিকাৰ নিৰ্ণায়ক ভোট" : "Student voices elevating issues"}</div>
        </div>
      </section>

      {/* Collapsible AI Copilot Panel */}
      {showAiCopilot && (
        <section className="panel pulse-chat-panel copilot-drawer page-enter">
          <div className="pulse-intro">
            <div className="pulse-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2>{isAssamese ? "কেম্পাছৰ বিষয়ে AI ক সুধক" : "Campus Report Copilot"}</h2>
              <p>
                {isAssamese
                  ? "কেম্পাছৰ শেহতীয়া ৰিপোৰ্ট আৰু সমস্যাৰ ধৰণৰ ওপৰত ভিত্তি কৰি AI ৰ পৰা তাৎক্ষণিক তথ্য লাভ কৰক।"
                  : "Ask grounded questions about patterns, frequent maintenance hotspots, or unresolved issues."}
              </p>
            </div>
          </div>
          <form className="pulse-question-form" onSubmit={(event) => void handleAskAi(event)}>
            <label className="sr-only" htmlFor="campus-pulse-question">
              Ask Campus Pulse
            </label>
            <textarea
              id="campus-pulse-question"
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              maxLength={300}
              rows={2}
              placeholder={
                isAssamese
                  ? "যেনে: ছাত্ৰাবাসসমূহত পানীৰ সমস্যাৰ কিমানটা ৰিপোৰ্ট জমা হৈছে?"
                  : "e.g. Which unresolved issues need immediate attention in hostels?"
              }
            />
            <button className="primary-button" disabled={aiLoading || !aiQuestion.trim()}>
              {aiLoading ? (
                <>
                  <Loader2 size={16} className="spin" /> {isAssamese ? "তথ্য বিশ্লেষণ হৈ আছে..." : "Analyzing reports..."}
                </>
              ) : (
                <>
                  <Sparkles size={16} /> {isAssamese ? "সুধক" : "Ask Copilot"}
                </>
              )}
            </button>
          </form>
          <div className="pulse-suggestions">
            <span>{isAssamese ? "প্ৰস্তাৱিত প্ৰশ্ন:" : "Try asking:"}</span>
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setAiQuestion(item);
                  setAiError("");
                }}
              >
                {item}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
          {aiError && <div className="duplicate-alert">{aiError}</div>}
          {aiResult && (
            <div className="pulse-answer" aria-live="polite">
              <div className="pulse-answer-heading">
                <b>
                  <Sparkles size={15} /> {isAssamese ? "AI বিশ্লেষণ উত্তৰ" : "AI Answer"}
                </b>
                <span>{aiResult.provider === "gemini" ? "Gemini · Live report grounded" : "Campus summary"}</span>
              </div>
              <p>{aiResult.answer}</p>
              <div className="pulse-scope">
                Scope: {aiResult.scope} · {aiResult.metrics.reportsInSample} recent reports examined
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4-Stage Interactive Ticket Progress Stepper */}
      {trackedTicket && (
        <section className="panel ticket-tracker-panel">
          <div className="tracker-header">
            <div className="tracker-title-col">
              <div className="tracker-kicker">
                <Activity size={15} />
                <span>{isAssamese ? "৪-স্তৰীয় প্ৰগতি ট্ৰেকাৰ" : "4-STAGE RESOLUTION TRACKER"}</span>
                <span className="tracker-ticket-chip">{trackedTicket.id}</span>
              </div>
              <h3>{trackedTicket.title}</h3>
              <div className="tracker-submeta">
                <span>
                  <MapPin size={13} /> {trackedTicket.location}
                </span>
                <span>•</span>
                <span>
                  <Building2 size={13} /> {trackedTicket.department}
                </span>
                <span>•</span>
                <span>
                  <Calendar size={13} /> {trackedTicket.createdAt}
                </span>
              </div>
            </div>

            <div className="tracker-action-col">
              <button
                type="button"
                className="secondary-button view-ticket-btn"
                onClick={() => onSelect && onSelect(trackedTicket)}
              >
                <Eye size={15} />
                <span>{isAssamese ? "সম্পূৰ্ণ বিৱৰণ খোলক" : "Inspect Full Details"}</span>
              </button>
            </div>
          </div>

          {/* Stepper Steps */}
          <div className="stepper-track-wrap">
            <TicketStepper status={trackedTicket.status} isAssamese={isAssamese} />
          </div>
        </section>
      )}

      {/* Filter, Search, and Sort Bar */}
      <section className="updates-controls-bar">
        {/* Search */}
        <div className="search-field updates-search-input">
          <Search size={16} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isAssamese
                ? "টিকট আইডি, স্থান বা সমস্যা সন্ধান কৰক (যেনে: CS-2048, Library, Water)..."
                : "Search by ticket ID, location, or issue (e.g. CS-2048, Library, Water)..."
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="updates-filter-tabs">
          <button
            type="button"
            className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            {isAssamese ? "সকলো আপডেট" : "All Updates"} ({complaints.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "in_progress" ? "active" : ""}`}
            onClick={() => setStatusFilter("in_progress")}
          >
            <Clock3 size={13} />
            {isAssamese ? "কাম চলি আছে" : "In Progress"} ({inProgressCount})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "resolved" ? "active" : ""}`}
            onClick={() => setStatusFilter("resolved")}
          >
            <CheckCircle2 size={13} />
            {isAssamese ? "সমাধান হোৱা প্ৰমাণসহ" : "Resolved Proof"} ({resolvedCount})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "submitted" ? "active" : ""}`}
            onClick={() => setStatusFilter("submitted")}
          >
            <Sparkles size={13} />
            {isAssamese ? "নতুন / AI পৰ্যালোচিত" : "AI Triaged"} (
            {complaints.filter((c) => c.status === "Submitted").length})
          </button>
        </div>

        {/* Categories & Sort */}
        <div className="updates-secondary-controls">
          <div className="select-wrap">
            <select
              aria-label={isAssamese ? "বিভাগ অনুসৰি ফিল্টাৰ কৰক" : "Filter by Category"}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="updates-select"
            >
              <option value="all">{isAssamese ? "সকলো বিভাগ" : "All Categories"}</option>
              <option value="hostel">{isAssamese ? "ছাত্ৰাবাস (Hostels & Living)" : "Hostels & Living"}</option>
              <option value="water">{isAssamese ? "পানী আৰু অনাময় (Water & Sanitation)" : "Water & Sanitation"}</option>
              <option value="electric">{isAssamese ? "বিদ্যুৎ আৰু পোহৰ (Electrical & Power)" : "Electrical & Power"}</option>
              <option value="it">{isAssamese ? "আইটি আৰু লাইব্ৰেৰী (IT & Library)" : "IT & Library"}</option>
              <option value="security">{isAssamese ? "নিৰাপত্তা আৰু পৰিৱেশ (Safety & Estate)" : "Safety & Estate"}</option>
            </select>
          </div>

          <div className="select-wrap">
            <select
              aria-label={isAssamese ? "ক্ৰম সলনি কৰক" : "Sort By"}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "upvotes" | "recent" | "priority")}
              className="updates-select"
            >
              <option value="upvotes">{isAssamese ? "🔥 সৰ্বাধিক সমৰ্থিত (Most Upvoted)" : "🔥 Most Upvoted"}</option>
              <option value="priority">{isAssamese ? "⚡ জৰুৰী অগ্ৰাধিকাৰ (Highest Priority)" : "⚡ Highest Priority"}</option>
              <option value="recent">{isAssamese ? "🕒 শেহতীয়া (Most Recent)" : "🕒 Most Recent"}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Feed Cards Section */}
      <section className="updates-feed-grid">
        {filteredComplaints.length === 0 ? (
          <div className="panel updates-empty-state">
            <div className="empty-icon-wrap">
              <Layers size={36} />
            </div>
            <h3>{isAssamese ? "কোনো আপডেট পোৱা নগ'ল" : "No updates match your filters"}</h3>
            <p>
              {isAssamese
                ? "আপোনাৰ সন্ধান বা ফিল্টাৰ সলনি কৰি চাওক অথবা আন বিভাগ বাছনি কৰক।"
                : "Try resetting your search query or selecting a different status/category filter."}
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
            >
              {isAssamese ? "সকলো ফিল্টাৰ ৰিচেট কৰক" : "Reset Filters"}
            </button>
          </div>
        ) : (
          filteredComplaints.map((item) => {
            const upvotes = upvoteCounts[item.id] ?? item.upvotes ?? 1;
            const hasUpvoted = upvotedIds.has(item.id);
            const isTracked = trackedTicketId === item.id;
            const hasBeforePhoto = Boolean(item.image);
            const hasAfterPhoto = Boolean(item.resolvedImage);

            return (
              <article
                key={item.id}
                className={`panel update-card ${isTracked ? "card-highlighted" : ""}`}
                onClick={() => onSelect && onSelect(item)}
              >
                {/* Card Top Row */}
                <div className="card-top-row">
                  <div className="card-id-badges">
                    <span className="card-ticket-id">{item.id}</span>
                    <span className={`status-pill status-${item.status === "In progress" ? "progress" : item.status.toLowerCase()}`}>
                      <i />
                      {item.status === "Resolved"
                        ? isAssamese
                          ? "সমাধান হোৱা প্ৰমাণসহ"
                          : "Resolved with Proof"
                        : item.status === "In progress"
                        ? isAssamese
                          ? "কাম চলি আছে"
                          : "Work Dispatched"
                        : isAssamese
                        ? "AI পৰ্যালোচিত"
                        : "AI Triaged"}
                    </span>
                    <span className={`priority priority-${item.priority.toLowerCase()}`}>
                      <span className="priority-dot" />
                      {item.priority}
                    </span>
                  </div>

                  <span className="card-time">
                    <Clock3 size={13} />
                    {item.createdAt}
                  </span>
                </div>

                {/* Title */}
                <h3 className="update-card-title">{item.title}</h3>

                {/* Bilingual Summary snippet */}
                <div className="update-card-summary">
                  <p>{isAssamese && item.summaryAs ? item.summaryAs : item.summaryEn || item.description}</p>
                </div>

                {/* Before & After Photo Gallery */}
                <div className="update-photos-container" onClick={(e) => e.stopPropagation()}>
                  {item.status === "Resolved" && (hasBeforePhoto || hasAfterPhoto) ? (
                    <div className="before-after-grid">
                      {hasBeforePhoto && (
                        <div
                          className="photo-box photo-before"
                          onClick={() =>
                            setPreviewImage({
                              url: item.image!,
                              caption: `${item.id} · Before Issue Evidence`,
                            })
                          }
                        >
                          <div className="photo-label">
                            <Camera size={12} />
                            <span>{isAssamese ? "সমস্যাৰ ফটো (Before)" : "Before Issue"}</span>
                          </div>
                          <img src={item.image} alt="Before issue" loading="lazy" />
                          <div className="photo-zoom-hint">
                            <Eye size={13} />
                          </div>
                        </div>
                      )}
                      {hasAfterPhoto && (
                        <div
                          className="photo-box photo-after"
                          onClick={() =>
                            setPreviewImage({
                              url: item.resolvedImage!,
                              caption: `${item.id} · Resolution Proof (Verified)`,
                            })
                          }
                        >
                          <div className="photo-label verified-label">
                            <CheckCircle2 size={12} />
                            <span>{isAssamese ? "সমাধানৰ প্ৰমাণ (Verified Proof)" : "Resolution Proof"}</span>
                          </div>
                          <img src={item.resolvedImage} alt="Resolution proof" loading="lazy" />
                          <div className="photo-zoom-hint">
                            <Eye size={13} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : hasBeforePhoto ? (
                    <div
                      className="photo-box single-photo"
                      onClick={() =>
                        setPreviewImage({
                          url: item.image!,
                          caption: `${item.id} · Attached Evidence Photo`,
                        })
                      }
                    >
                      <div className="photo-label">
                        <Camera size={12} />
                        <span>{isAssamese ? "সংলগ্ন প্ৰমাণ ফটো" : "Reported Evidence Photo"}</span>
                      </div>
                      <img src={item.image} alt="Report evidence" loading="lazy" />
                      <div className="photo-zoom-hint">
                        <Eye size={13} />
                      </div>
                    </div>
                  ) : (
                    <div className="photo-placeholder-box">
                      <div className="placeholder-content">
                        <Building2 size={24} className="placeholder-icon" />
                        <div>
                          <b>{item.category || "Campus Maintenance"}</b>
                          <span>{item.department || "Campus Estate"}</span>
                        </div>
                      </div>
                      <span className="placeholder-tag">
                        <MapPin size={12} /> {item.location}
                      </span>
                    </div>
                  )}
                </div>

                {/* Location and Department Meta */}
                <div className="update-meta-row">
                  <span className="meta-tag">
                    <MapPin size={13} />
                    <b>{item.location}</b>
                  </span>
                  <span className="meta-tag">
                    <Building2 size={13} />
                    {item.department}
                  </span>
                  <span className="meta-tag">
                    <Tag size={13} />
                    {item.category}
                  </span>
                  <span className="meta-reporter">
                    <UserRound size={13} />
                    {item.reporter}
                  </span>
                </div>

                {/* Campus Administration Response or Notes */}
                {(item.adminResponseEn || item.adminResponseAs || item.resolutionNotes) && (
                  <div className="admin-response-callout">
                    <div className="callout-head">
                      <ShieldCheck size={14} />
                      <b>{isAssamese ? "কেম্পাছ প্ৰশাসনৰ অফিচিয়েল আপডেট" : "Official Campus Response"}</b>
                    </div>
                    <p>
                      {isAssamese
                        ? item.adminResponseAs || item.adminResponseEn || item.resolutionNotes
                        : item.adminResponseEn || item.adminResponseAs || item.resolutionNotes}
                    </p>
                  </div>
                )}

                {/* Bottom Actions: Upvote Button & Track Stepper Button */}
                <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`upvote-action-btn ${hasUpvoted ? "upvoted-active" : ""}`}
                    disabled={upvotingId === item.id}
                    onClick={(e) => void handleUpvoteClick(e, item.id)}
                    aria-label={`Upvote issue ${item.id}`}
                  >
                    {upvotingId === item.id ? (
                      <Loader2 size={16} className="spin" />
                    ) : hasUpvoted ? (
                      <Check size={16} />
                    ) : (
                      <ThumbsUp size={16} />
                    )}
                    <b className="upvote-count">{upvotes}</b>
                    <span>
                      {hasUpvoted
                        ? isAssamese
                          ? "সমৰ্থিত"
                          : "Upvoted"
                        : isAssamese
                        ? "সমৰ্থন কৰক"
                        : "Upvote"}
                    </span>
                  </button>

                  {upvotes >= 10 && (
                    <span className="trending-badge">
                      <Flame size={12} />
                      {isAssamese ? "শীৰ্ষ সমস্যা" : "Top Concern"}
                    </span>
                  )}

                  <div className="card-actions-right">
                    <button
                      type="button"
                      className={`track-action-btn ${isTracked ? "active-tracked" : ""}`}
                      onClick={() => setTrackedTicketId(item.id)}
                    >
                      <Activity size={14} />
                      <span>{isTracked ? (isAssamese ? "ট্ৰেক হৈ আছে" : "Tracking") : isAssamese ? "ট্ৰেক কৰক" : "Track Progress"}</span>
                    </button>

                    <button
                      type="button"
                      className="details-action-btn"
                      onClick={() => onSelect && onSelect(item)}
                    >
                      <span>{isAssamese ? "বিৱৰণ" : "Details"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="modal-backdrop photo-lightbox-backdrop"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="photo-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-top">
              <b>{previewImage.caption}</b>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPreviewImage(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="lightbox-image-wrap">
              <img src={previewImage.url} alt={previewImage.caption} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 4-Stage Stepper Component
function TicketStepper({ status, isAssamese }: { status: Status; isAssamese: boolean }) {
  const currentStep = status === "Resolved" ? 4 : status === "In progress" ? 3 : 2;

  const steps = [
    {
      num: 1,
      titleEn: "Report Logged",
      titleAs: "ৰিপোৰ্ট দাখিল",
      descEn: "Student submission recorded",
      descAs: "ছাত্ৰ-ছাত্ৰীৰ ৰিপোৰ্ট নথিভুক্ত",
    },
    {
      num: 2,
      titleEn: "AI Triaged",
      titleAs: "AI বিশ্লেষণ",
      descEn: "Gemini priority & tag review",
      descAs: "Gemini দ্বাৰা অগ্ৰাধিকাৰ নিৰ্ধাৰণ",
    },
    {
      num: 3,
      titleEn: "Dispatched",
      titleAs: "কৰ্মী দল প্ৰেৰণ",
      descEn: "Assigned to department crew",
      descAs: "বিভাগীয় কৰ্মী দলক নিৰ্দেশ",
    },
    {
      num: 4,
      titleEn: "Resolved & Verified",
      titleAs: "সমাধান আৰু পৰীক্ষিত",
      descEn: "Photo proof verified",
      descAs: "ফটো প্ৰমাণসহ পৰীক্ষিত",
    },
  ];

  return (
    <div className="stepper-container">
      <div className="stepper-line" />
      <div
        className="stepper-line-progress"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      />
      <div className="stepper-steps">
        {steps.map((step) => {
          const isDone = currentStep > step.num;
          const isActive = currentStep === step.num;
          return (
            <div
              key={step.num}
              className={`stepper-node ${isDone ? "step-done" : isActive ? "step-active" : "step-pending"}`}
            >
              <div className="step-circle">
                {isDone ? <Check size={14} /> : <span>{step.num}</span>}
              </div>
              <div className="step-label-group">
                <b className="step-title">{isAssamese ? step.titleAs : step.titleEn}</b>
                <span className="step-desc">{isAssamese ? step.descAs : step.descEn}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
