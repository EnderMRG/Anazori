"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, Bot, FileText, Loader2, Sparkles } from "lucide-react";

type PulseResult = {
  answer: string;
  provider: string;
  scope: string;
  metrics: {
    reportsInSample: number;
    activeInSample: number;
    submittedInLast30Days: number;
    submittedInPrior30Days: number;
  };
  references: Array<{ id: string; title: string; category: string; status: string; location: string; createdAt: string }>;
};

const suggestedQuestions = [
  "Which issues are affecting the most students?",
  "What are the most common unresolved problems?",
  "How many reports came in during the last 30 days?",
];

export default function CampusPulse({ campusName }: { campusName: string }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<PulseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/campus-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Campus Pulse could not answer right now.");
      setResult(data as PulseResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Campus Pulse could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  const change = result?.metrics.submittedInLast30Days !== undefined
    ? result.metrics.submittedInLast30Days - result.metrics.submittedInPrior30Days
    : 0;

  return <div className="page-enter campus-pulse-page">
    <section className="page-heading-row">
      <div>
        <div className="eyebrow"><Sparkles size={14} /> CAMPUS REPORT COPILOT</div>
        <h1>Campus Pulse</h1>
        <p>Ask questions about recent campus issues. Answers are grounded in reports from {campusName}.</p>
      </div>
      <div className="pulse-provider-badge"><Bot size={16} /> Report-grounded insights</div>
    </section>

    <section className="pulse-layout">
      <div className="panel pulse-chat-panel">
        <div className="pulse-intro"><div className="pulse-icon"><Sparkles size={20} /></div><div><h2>What is happening on campus?</h2><p>Ask about issue patterns, unresolved reports, locations, or recent activity.</p></div></div>
        <form className="pulse-question-form" onSubmit={(event) => void ask(event)}>
          <label className="sr-only" htmlFor="campus-pulse-question">Ask Campus Pulse</label>
          <textarea id="campus-pulse-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} rows={3} placeholder="e.g. Which unresolved issues need attention near the library?" />
          <button className="primary-button" disabled={loading || !question.trim()}>{loading ? <><Loader2 size={16} className="spin" /> Looking at reports...</> : <><Sparkles size={16} /> Ask Campus Pulse</>}</button>
        </form>
        <div className="pulse-suggestions"><span>Try asking</span>{suggestedQuestions.map((item) => <button key={item} type="button" onClick={() => { setQuestion(item); setError(""); }}>{item}<ArrowUpRight size={13} /></button>)}</div>
        {error && <div className="duplicate-alert">{error}</div>}
        {result && <div className="pulse-answer" aria-live="polite">
          <div className="pulse-answer-heading"><b><Sparkles size={15} /> Answer</b><span>{result.provider === "gemini" ? "AI · report-grounded" : "Report summary"}</span></div>
          <p>{result.answer}</p>
          <div className="pulse-scope">Scope: {result.scope} · Most recent {result.metrics.reportsInSample} reports</div>
          {result.references.length > 0 && <div className="pulse-references"><b>Reports used</b>{result.references.map((reference) => <div className="pulse-reference" key={reference.id}><FileText size={15} /><div><b>{reference.id} · {reference.title}</b><span>{reference.category} · {reference.location} · {reference.status}</span></div></div>)}</div>}
          {result.references.length === 0 && <div className="pulse-scope">No matching report records were available to cite.</div>}
        </div>}
      </div>
      <aside className="panel pulse-metrics-panel">
        <div className="panel-heading"><div><h2>Live report snapshot</h2><p>Calculated from this campus’s recent records</p></div></div>
        {result ? <div className="pulse-metrics">
          <div><span>Reports in sample</span><b>{result.metrics.reportsInSample}</b></div>
          <div><span>Still active</span><b>{result.metrics.activeInSample}</b></div>
          <div><span>Last 30 days</span><b>{result.metrics.submittedInLast30Days}</b></div>
          <div><span>Prior 30 days</span><b>{result.metrics.submittedInPrior30Days}</b></div>
          <p>{change > 0 ? `${change} more` : change < 0 ? `${Math.abs(change)} fewer` : "The same number of"} reports than the prior 30-day period. Counts cover at most the 120 most recent records.</p>
        </div> : <div className="pulse-empty"><FileText size={21} /><p>Ask a question to load a live, campus-scoped report snapshot and its sources.</p></div>}
        <div className="pulse-trust-note"><b>Evidence first</b><span>Answers only use reports from your campus. Verify the cited reports before acting; AI summaries may miss context.</span></div>
      </aside>
    </section>
  </div>;
}
