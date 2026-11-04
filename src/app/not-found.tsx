import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "8px" }}>Page Not Found</h2>
      <p style={{ color: "#64748b", marginBottom: "20px" }}>The requested campus page could not be found.</p>
      <Link href="/" style={{ color: "#2b8f85", fontWeight: 600, textDecoration: "none" }}>
        Return to Home
      </Link>
    </div>
  );
}

