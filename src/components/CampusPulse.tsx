"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"upvotes" | "recent" | "priority">("upvotes");

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
        await fetch(`/api/complaints/${encodeURIComponent(complaintId)}/upvote`, {
          method: "POST",
        });
      }
    } catch (err) {
      console.warn("Upvote background error:", err);
    } finally {
      setUpvotingId(null);
    }
  }

  // Handle Ask AI Copilot
  async function handleAskAi(e: FormEvent) {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/campus-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion.trim(),
          language: isAssamese ? "as" : "en",
          campusName,
        }),
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
  }, [complaints, categoryFilter, searchQuery, sortBy, upvoteCounts]);

  // Aggregate metrics
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) => c.status === "In progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;
  const totalUpvotes = complaints.reduce((sum, c) => sum + (upvoteCounts[c.id] ?? c.upvotes ?? 1), 0);

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
          <div className="stat-info">
            <span className="stat-label">{isAssamese ? "মুঠ প্ৰতিবেদন" : "Total Updates"}</span>
            <b className="stat-value">{totalCount}</b>
          </div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-progress">
            <Clock3 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{isAssamese ? "কাম চলি আছে" : "In Progress"}</span>
            <b className="stat-value">{inProgressCount}</b>
          </div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-resolved">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{isAssamese ? "সমাধান হোৱা" : "Resolved"}</span>
            <b className="stat-value">{resolvedCount}</b>
          </div>
        </div>

        <div className="update-stat-card">
          <div className="stat-icon-wrap stat-upvotes">
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{isAssamese ? "মুঠ সমৰ্থন (Upvotes)" : "Community Upvotes"}</span>
            <b className="stat-value">{totalUpvotes}</b>
          </div>
        </div>
      </section>

      {/* Campus Pulse AI Assistant Dropdown */}
      {showAiCopilot && (
        <section className="panel pulse-ai-panel">
          <div className="pulse-ai-head">
            <div className="pulse-ai-title">
              <Bot size={18} />
              <b>{isAssamese ? "কেম্পাছ পালছ এআই সহায়ক" : "Campus Pulse AI Intelligence"}</b>
            </div>
            <span className="pulse-ai-badge">
              <Zap size={13} /> {isAssamese ? "লাইভ অন্তৰ্দৃষ্টি" : "Live Grounded"}
            </span>
          </div>

          <form onSubmit={handleAskAi} className="pulse-ai-form">
            <div className="pulse-ai-input-wrap">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder={
                  isAssamese
                    ? "কেম্পাছৰ সমস্যাৰ বিষয়ে যিকোনো কথা সোধক..."
                    : "Ask anything about campus issues, water leaks, repairs, or student votes..."
                }
                disabled={aiLoading}
              />
              <button
                type="submit"
                className="primary-button pulse-ai-submit"
                disabled={aiLoading || !aiQuestion.trim()}
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>{isAssamese ? "বিশ্লেষণ হৈ আছে..." : "Analyzing..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>{isAssamese ? "উত্তৰ দিয়ক" : "Ask"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Prompts */}
          <div className="pulse-ai-chips">
            <span className="chip-label">{isAssamese ? "প্ৰস্তাৱিত প্ৰশ্নসমূহ:" : "Suggested questions:"}</span>
            {suggestedQuestions.map((q, idx) => (
              <button
                type="button"
                key={idx}
                className="ai-chip-btn"
                onClick={() => {
                  setAiQuestion(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* AI Response Display */}
          {aiError && <div className="pulse-ai-error">{aiError}</div>}

          {aiResult && (
            <div className="pulse-ai-response">
              <div className="response-header">
                <Sparkles size={15} />
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
                : "Try resetting your search query or selecting a different category filter."}
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearchQuery("");
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
            const hasBeforePhoto = Boolean(item.image);
            const hasAfterPhoto = Boolean(item.resolvedImage);

            return (
              <article
                key={item.id}
                className="panel update-card"
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
                          <div className="photo-badge before-badge">
                            <Camera size={11} /> {isAssamese ? "আগতে (Before)" : "Before Issue"}
                          </div>
                          <img src={item.image} alt="Before evidence" loading="lazy" />
                        </div>
                      )}
                      {hasAfterPhoto && (
                        <div
                          className="photo-box photo-after"
                          onClick={() =>
                            setPreviewImage({
                              url: item.resolvedImage!,
                              caption: `${item.id} · Resolution Proof (Verified by Admin)`,
                            })
                          }
                        >
                          <div className="photo-badge after-badge">
                            <CheckCircle2 size={11} /> {isAssamese ? "সমাধান (Resolved)" : "Verified Proof"}
                          </div>
                          <img src={item.resolvedImage} alt="Resolution proof" loading="lazy" />
                        </div>
                      )}
                    </div>
                  ) : hasBeforePhoto ? (
                    <div
                      className="single-photo-box"
                      onClick={() =>
                        setPreviewImage({
                          url: item.image!,
                          caption: `${item.id} · Reported Evidence Photo`,
                        })
                      }
                    >
                      <div className="photo-badge before-badge">
                        <Camera size={11} /> {isAssamese ? "প্ৰমাণ চিত্ৰ" : "Attached Photo"}
                      </div>
                      <img src={item.image} alt="Attached complaint evidence" loading="lazy" />
                    </div>
                  ) : null}
                </div>

                {/* Meta details footer line */}
                <div className="card-meta-row">
                  <div className="card-meta-item">
                    <MapPin size={13} />
                    <span>{item.location}</span>
                  </div>
                  <div className="card-meta-item">
                    <Building2 size={13} />
                    <span>{item.department}</span>
                  </div>
                  <div className="card-meta-item">
                    <UserRound size={13} />
                    <span>{item.reporter}</span>
                  </div>
                </div>

                {/* Official Department Update if available */}
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

                {/* Bottom Actions: Upvote Button & Inspect Details */}
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
                      className="details-action-btn"
                      onClick={() => onSelect && onSelect(item)}
                    >
                      <Eye size={14} />
                      <span>{isAssamese ? "বিৱৰণ চাওক" : "Inspect Details"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div className="modal-backdrop pulse-lightbox" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span>{previewImage.caption}</span>
              <button
                type="button"
                className="icon-button close-lightbox-btn"
                onClick={() => setPreviewImage(null)}
                aria-label="Close photo preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="lightbox-image-wrap">
              <img src={previewImage.url} alt="Expanded preview" />
            </div>
            <div className="lightbox-footer">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-button"
              >
                <ExternalLink size={14} />
                <span>Open original in new tab</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
