export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function SkeletonComplaintRows({ count = 4 }: { count?: number }) {
  return <div className="skeleton-complaint-list">{Array.from({ length: count }, (_, index) => <div className="skeleton-complaint-row" key={index}><Skeleton className="skeleton-icon" /><div className="skeleton-complaint-copy"><Skeleton className="skeleton-title" /><Skeleton className="skeleton-meta" /></div><Skeleton className="skeleton-status" /></div>)}</div>;
}

export function WorkspaceSkeleton() {
  return <div className="skeleton-page" role="status" aria-label="Loading CivicSense"><div className="skeleton-heading"><div><Skeleton className="skeleton-eyebrow" /><Skeleton className="skeleton-heading-title" /><Skeleton className="skeleton-heading-copy" /></div><Skeleton className="skeleton-button" /></div><div className="skeleton-metrics">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-metric" key={index}><Skeleton className="skeleton-metric-icon" /><Skeleton className="skeleton-metric-label" /><Skeleton className="skeleton-metric-value" /></div>)}</div><div className="skeleton-main-grid"><div className="panel skeleton-panel"><Skeleton className="skeleton-panel-title" /><SkeletonComplaintRows /></div><div className="panel skeleton-panel skeleton-actions"><Skeleton className="skeleton-panel-title" /><Skeleton className="skeleton-action" /><Skeleton className="skeleton-action" /><Skeleton className="skeleton-action" /></div></div><span className="skeleton-loading-label">Loading your campus workspace…</span></div>;
}

export function AdminSkeleton() {
  return <div className="skeleton-page" role="status" aria-label="Loading administration queue"><div className="skeleton-heading"><div><Skeleton className="skeleton-eyebrow" /><Skeleton className="skeleton-heading-title" /><Skeleton className="skeleton-heading-copy" /></div><Skeleton className="skeleton-campus-chip" /></div><div className="skeleton-admin-metrics">{Array.from({ length: 5 }, (_, index) => <div className="skeleton-metric" key={index}><Skeleton className="skeleton-metric-icon" /><Skeleton className="skeleton-metric-label" /><Skeleton className="skeleton-metric-value" /></div>)}</div><div className="panel skeleton-panel"><Skeleton className="skeleton-toolbar" /><SkeletonComplaintRows count={5} /></div></div>;
}

export function NotificationSkeleton() {
  return <div className="notification-list skeleton-notifications" role="status" aria-label="Loading notifications">{Array.from({ length: 3 }, (_, index) => <div className="notification-card" key={index}><Skeleton className="skeleton-notification-icon" /><div className="skeleton-notification-copy"><Skeleton className="skeleton-notification-title" /><Skeleton className="skeleton-notification-line" /><Skeleton className="skeleton-notification-time" /></div></div>)}</div>;
}
