import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: "Pending",    color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  running:    { label: "Running",    color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  collecting: { label: "Collecting", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  digesting:  { label: "Digesting",  color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  ready:      { label: "Ready",      color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  failed:     { label: "Failed",     color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  canceled:   { label: "Canceled",   color: "#374151", bg: "#f3f4f6", dot: "#9ca3af" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem",
      fontWeight: 600, letterSpacing: "0.03em",
      background: cfg.bg, color: cfg.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: cfg.dot,
        boxShadow: status === "running" || status === "collecting" ? `0 0 0 2px ${cfg.dot}40` : "none",
        animation: status === "running" || status === "collecting" ? "pulse 1.5s ease-in-out infinite" : "none",
      }} />
      {cfg.label}
    </span>
  );
}

function TriggerPanel() {
  const [datasetId, setDatasetId] = useState("gd_l1viktl72bvl7bjuj0");
  const [inputUrl, setInputUrl] = useState("https://www.linkedin.com/in/elad-moshe-05a90413/");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ snapshotId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerCollection = useAction(api.example.triggerCollection);

  const handleTrigger = async () => {
    if (!datasetId.trim() || !inputUrl.trim()) return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await triggerCollection({ datasetId, inputs: [{ url: inputUrl }] });
      setLastResult(res as any);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1.75rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem",
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>Trigger Collection</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Start an async Bright Data dataset job</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Dataset ID
        </label>
        <input
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          placeholder="gd_l1viktl72bvl7bjuj0"
          style={{
            padding: "0.6rem 0.85rem", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--input)", color: "var(--text)", fontSize: "0.85rem",
            fontFamily: "monospace", outline: "none",
          }}
        />
        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.25rem" }}>
          Input URL
        </label>
        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="https://..."
          style={{
            padding: "0.6rem 0.85rem", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--input)", color: "var(--text)", fontSize: "0.85rem",
            outline: "none",
          }}
        />
      </div>

      <button
        onClick={handleTrigger}
        disabled={loading}
        style={{
          padding: "0.6rem 1.4rem", borderRadius: 7, border: "none",
          background: loading ? "var(--border)" : "linear-gradient(135deg, #f97316, #ea580c)",
          color: "#fff", fontWeight: 700, fontSize: "0.85rem",
          cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Triggering..." : "Trigger"}
      </button>

      {lastResult && (
        <div style={{
          marginTop: "1rem", padding: "0.85rem", borderRadius: 8,
          background: "var(--success-bg)", border: "1px solid var(--success-border)",
          fontSize: "0.8rem",
        }}>
          <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>Job queued</div>
          <div style={{ fontFamily: "monospace", color: "#065f46", opacity: 0.8 }}>{lastResult.snapshotId}</div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: "1rem", padding: "0.85rem", borderRadius: 8,
          background: "#fee2e2", border: "1px solid #fca5a5",
          fontSize: "0.8rem", color: "#991b1b",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

function SnapshotsTable() {
  const snapshots = useQuery(api.example.listSnapshots, {});

  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem",
        }}>📊</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>Snapshots</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Live view of all triggered collections</div>
        </div>
        <div style={{
          marginLeft: "auto", padding: "3px 10px", borderRadius: 999,
          background: "var(--accent-bg)", color: "var(--accent)",
          fontSize: "0.75rem", fontWeight: 700,
        }}>
          {snapshots?.length ?? 0} total
        </div>
      </div>

      {!snapshots || snapshots.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          color: "var(--muted)", fontSize: "0.85rem",
          border: "1px dashed var(--border)", borderRadius: 8,
        }}>
          No snapshots yet. Trigger a collection above.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr>
                {["Snapshot ID", "Dataset ID", "Status", "Records", "Triggered"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "0.5rem 0.75rem",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--muted)", fontWeight: 600,
                    fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s: any, i: number) => (
                <tr key={s.snapshotId} style={{
                  background: i % 2 === 0 ? "transparent" : "var(--row-alt)",
                  transition: "background 0.1s",
                }}>
                  <td style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", color: "var(--accent)", fontSize: "0.78rem" }}>
                    {s.snapshotId}
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {s.datasetId}
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem" }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem", color: "var(--text)", fontWeight: 600 }}>
                    {s.recordCount ?? 0}
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem", color: "var(--muted)", fontSize: "0.78rem" }}>
                    {new Date(s.triggeredAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        :root {
          --bg: #0a0a0f;
          --panel: #111118;
          --border: #1f1f2e;
          --text: #e8e8f0;
          --muted: #6b6b80;
          --input: #0d0d15;
          --accent: #f97316;
          --accent-bg: rgba(249,115,22,0.1);
          --row-alt: rgba(255,255,255,0.02);
          --success-bg: #f0fdf4;
          --success-border: #bbf7d0;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'IBM Plex Sans', sans-serif;
          min-height: 100vh;
        }

        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        backgroundImage: "radial-gradient(ellipse at 20% 0%, rgba(249,115,22,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(99,102,241,0.06) 0%, transparent 60%)",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem" }}>

          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.75rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #f97316, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", boxShadow: "0 4px 20px rgba(249,115,22,0.3)",
              }}>🗄</div>
              <h1 style={{
                fontSize: "1.5rem", fontWeight: 700, color: "var(--text)",
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.02em",
              }}>
                convex-bright-data-datasets
              </h1>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 520, lineHeight: 1.6 }}>
              Bright Data Datasets API with reactive Convex storage. Trigger async collections, receive via webhook, and subscribe to results in real time.
            </p>
          </div>

          <TriggerPanel />
          <SnapshotsTable />

        </div>
      </div>
    </>
  );
}
