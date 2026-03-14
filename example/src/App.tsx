import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Snapshot = {
  snapshotId: string;
  datasetId: string;
  status: string;
  recordCount?: number;
  triggeredAt: number;
  completedAt?: number;
  inputs?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Trigger", desc: "Action fires, job queued in Bright Data" },
  { id: 2, label: "Collecting", desc: "Bright Data scrapes the target URL" },
  { id: 3, label: "Webhook", desc: "Results delivered to Convex HTTP handler" },
  { id: 4, label: "Stored", desc: "Records parsed and saved to component tables" },
  { id: 5, label: "Ready", desc: "Frontend updates reactively via useQuery" },
];

const STATUS_STEP: Record<string, number> = {
  pending: 1,
  running: 2,
  collecting: 2,
  digesting: 3,
  ready: 5,
  failed: 0,
  canceled: 0,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  running: "#3b82f6",
  collecting: "#3b82f6",
  digesting: "#8b5cf6",
  ready: "#10b981",
  failed: "#ef4444",
  canceled: "#6b7280",
};

// ─── Pipeline visualization ───────────────────────────────────────────────────

function Pipeline({ status }: { status: string }) {
  const activeStep = STATUS_STEP[status] ?? 0;
  const failed = status === "failed" || status === "canceled";

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, position: "relative" }}>
        {STEPS.map((step, i) => {
          const done = activeStep > step.id || (activeStep === step.id && status === "ready");
          const active = activeStep === step.id && status !== "ready";
          const color = failed ? "#ef4444" : done ? "#10b981" : active ? "#f97316" : "#2a2a3a";
          const textColor = done || active ? "#e8e8f0" : "#4a4a5a";

          return (
            <div key={step.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  position: "absolute", top: 15, left: "50%", width: "100%", height: 2,
                  background: done ? "#10b981" : "#1a1a2a",
                  transition: "background 0.5s ease",
                  zIndex: 0,
                }} />
              )}

              {/* Step circle */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%", zIndex: 1,
                background: color,
                border: `2px solid ${active ? "#f97316" : color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", fontWeight: 700, color: done || active ? "#fff" : "#4a4a5a",
                boxShadow: active ? `0 0 0 4px rgba(249,115,22,0.2), 0 0 20px rgba(249,115,22,0.3)` : "none",
                animation: active ? "pulse-ring 1.5s ease-in-out infinite" : "none",
                transition: "all 0.4s ease",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {done ? "✓" : step.id}
              </div>

              {/* Label */}
              <div style={{ marginTop: "0.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: textColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#3a3a4a", marginTop: 2, maxWidth: 80, lineHeight: 1.3 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live log stream ──────────────────────────────────────────────────────────

function LogStream({ snapshot }: { snapshot: Snapshot | null }) {
  const ref = useRef<HTMLDivElement>(null);

  const logs: { time: string; msg: string; type: "info" | "success" | "warn" }[] = [];

  if (snapshot) {
    const t = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour12: false });
    logs.push({ time: t(snapshot.triggeredAt), msg: `trigger() called — dataset ${snapshot.datasetId}`, type: "info" });
    logs.push({ time: t(snapshot.triggeredAt), msg: `snapshot_id received: ${snapshot.snapshotId}`, type: "info" });
    logs.push({ time: t(snapshot.triggeredAt + 50), msg: `upsertSnapshot() — status: pending`, type: "info" });

    if (snapshot.status === "collecting" || snapshot.status === "running") {
      logs.push({ time: t(snapshot.triggeredAt + 200), msg: "Bright Data: scraping target URL...", type: "info" });
    }
    if (snapshot.status === "digesting") {
      logs.push({ time: t(snapshot.triggeredAt + 500), msg: "Bright Data: processing results...", type: "info" });
    }
    if (snapshot.status === "ready" && snapshot.completedAt) {
      logs.push({ time: t(snapshot.completedAt - 100), msg: "POST /webhooks/brightdata received", type: "success" });
      logs.push({ time: t(snapshot.completedAt - 80), msg: `handleWebhook() — parsing NDJSON records`, type: "success" });
      logs.push({ time: t(snapshot.completedAt - 60), msg: `insertRecords() — ${snapshot.recordCount ?? 1} record(s) stored`, type: "success" });
      logs.push({ time: t(snapshot.completedAt - 40), msg: `updateSnapshotStatus() — status: ready`, type: "success" });
      logs.push({ time: t(snapshot.completedAt), msg: "useQuery subscribers notified — UI updated", type: "success" });
    }
    if (snapshot.status === "failed") {
      logs.push({ time: t(snapshot.triggeredAt), msg: "Collection failed — check Bright Data dashboard", type: "warn" });
    }
  }

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs.length]);

  return (
    <div ref={ref} style={{
      background: "#070710", border: "1px solid #1a1a2a", borderRadius: 8,
      padding: "1rem", height: 160, overflowY: "auto",
      fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem",
    }}>
      {logs.length === 0 ? (
        <div style={{ color: "#2a2a3a" }}>// waiting for collection to start...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} style={{ marginBottom: "0.3rem", display: "flex", gap: "0.75rem" }}>
            <span style={{ color: "#3a3a4a", flexShrink: 0 }}>{log.time}</span>
            <span style={{
              color: log.type === "success" ? "#10b981" : log.type === "warn" ? "#f59e0b" : "#6b8cba",
            }}>
              {log.type === "success" ? "✓" : log.type === "warn" ? "⚠" : "›"} {log.msg}
            </span>
          </div>
        ))
      )}
      {snapshot && snapshot.status !== "ready" && snapshot.status !== "failed" && snapshot.status !== "canceled" && (
        <div style={{ color: "#3a3a5a", animation: "blink 1s step-end infinite" }}>█</div>
      )}
    </div>
  );
}

// ─── Record viewer ────────────────────────────────────────────────────────────

function RecordViewer({ snapshotId }: { snapshotId: string }) {
  const records = useQuery(api.example.getRecords, { snapshotId });
  const [expanded, setExpanded] = useState<number | null>(0);

  if (!records || records.length === 0) return null;

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
        {records.length} Record{records.length !== 1 ? "s" : ""} Received
      </div>
      {records.map((record: any, i: number) => {
        let parsed: any = null;
        try { parsed = JSON.parse(record.data); } catch { parsed = record.data; }
        const isArray = Array.isArray(parsed);
        const items = isArray ? parsed : [parsed];

        return (
          <div key={i} style={{ marginBottom: "0.5rem" }}>
            {items.map((item: any, j: number) => {
              const isExp = expanded === i * 100 + j;
              return (
                <div key={j} style={{
                  background: "#0d0d18", border: "1px solid #1a1a2a", borderRadius: 7,
                  overflow: "hidden", marginBottom: "0.4rem",
                }}>
                  <button
                    onClick={() => setExpanded(isExp ? null : i * 100 + j)}
                    style={{
                      width: "100%", padding: "0.65rem 0.85rem",
                      background: "transparent", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      color: "#e8e8f0",
                    }}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: "#10b981" }}>
                      {typeof item === "object" && item !== null
                        ? item.name || item.title || item.url || item.id || `Record ${j + 1}`
                        : `Record ${j + 1}`}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#4a4a5a" }}>{isExp ? "▲ collapse" : "▼ expand"}</span>
                  </button>
                  {isExp && (
                    <div style={{ borderTop: "1px solid #1a1a2a", padding: "0.85rem" }}>
                      <pre style={{
                        margin: 0, fontSize: "0.72rem", color: "#8b8baa",
                        fontFamily: "'IBM Plex Mono', monospace",
                        whiteSpace: "pre-wrap", wordBreak: "break-all",
                        maxHeight: 300, overflowY: "auto",
                      }}>
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Snapshot card ────────────────────────────────────────────────────────────

function SnapshotCard({ snapshot, isActive }: { snapshot: Snapshot; isActive: boolean }) {
  const statusColor = STATUS_COLOR[snapshot.status] ?? "#6b7280";
  const elapsed = snapshot.completedAt
    ? `${((snapshot.completedAt - snapshot.triggeredAt) / 1000).toFixed(1)}s`
    : null;

  return (
    <div style={{
      border: `1px solid ${isActive ? "#f97316" : "#1a1a2a"}`,
      borderRadius: 10, overflow: "hidden",
      boxShadow: isActive ? "0 0 20px rgba(249,115,22,0.1)" : "none",
      transition: "all 0.3s ease",
      marginBottom: "0.75rem",
    }}>
      {/* Header */}
      <div style={{
        padding: "0.85rem 1rem",
        background: isActive ? "rgba(249,115,22,0.05)" : "#0d0d18",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: statusColor,
            boxShadow: ["running", "collecting", "pending"].includes(snapshot.status)
              ? `0 0 6px ${statusColor}` : "none",
            animation: ["running", "collecting", "pending"].includes(snapshot.status)
              ? "pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: "#e8e8f0" }}>
            {snapshot.snapshotId}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {elapsed && (
            <span style={{ fontSize: "0.72rem", color: "#4a4a5a", fontFamily: "'IBM Plex Mono', monospace" }}>
              {elapsed}
            </span>
          )}
          <span style={{
            padding: "2px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
            background: `${statusColor}20`, color: statusColor,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {snapshot.status}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#3a3a4a" }}>
            {snapshot.recordCount ?? 0} records
          </span>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ padding: "0 1rem", background: "#080813" }}>
        <Pipeline status={snapshot.status} />
      </div>

      {/* Log stream */}
      <div style={{ padding: "0 1rem 1rem" , background: "#080813" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#3a3a4a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          Execution log
        </div>
        <LogStream snapshot={snapshot} />
        {snapshot.status === "ready" && (
          <RecordViewer snapshotId={snapshot.snapshotId} />
        )}
      </div>
    </div>
  );
}

// ─── Trigger panel ────────────────────────────────────────────────────────────

function TriggerPanel({ onTriggered }: { onTriggered: (id: string) => void }) {
  const [datasetId, setDatasetId] = useState("gd_l1viktl72bvl7bjuj0");
  const [inputUrl, setInputUrl] = useState("https://www.linkedin.com/in/elad-moshe-05a90413/");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerCollection = useAction(api.example.triggerCollection);

  const handleTrigger = async () => {
    if (!datasetId.trim() || !inputUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await triggerCollection({ datasetId, inputs: [{ url: inputUrl }] }) as any;
      onTriggered(res.snapshotId);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: "#0d0d18", border: "1px solid #1a1a2a", borderRadius: 12,
      padding: "1.5rem", marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e8e8f0" }}>Trigger a Collection</div>
          <div style={{ fontSize: "0.75rem", color: "#4a4a5a" }}>
            Fires an async Bright Data dataset job and watches it in real time
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#4a4a5a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            Dataset ID
          </label>
          <input
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            style={{
              width: "100%", padding: "0.6rem 0.75rem", borderRadius: 7,
              border: "1px solid #1a1a2a", background: "#070710",
              color: "#e8e8f0", fontSize: "0.78rem", fontFamily: "'IBM Plex Mono', monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#4a4a5a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            Input URL
          </label>
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            style={{
              width: "100%", padding: "0.6rem 0.75rem", borderRadius: 7,
              border: "1px solid #1a1a2a", background: "#070710",
              color: "#e8e8f0", fontSize: "0.78rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={handleTrigger}
          disabled={loading}
          style={{
            padding: "0.65rem 1.5rem", borderRadius: 8, border: "none",
            background: loading ? "#1a1a2a" : "linear-gradient(135deg, #f97316, #ea580c)",
            color: loading ? "#4a4a5a" : "#fff",
            fontWeight: 700, fontSize: "0.85rem", cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.03em", transition: "all 0.2s",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {loading ? "Queuing..." : "Trigger Collection"}
        </button>
        <div style={{ fontSize: "0.72rem", color: "#3a3a4a", fontFamily: "'IBM Plex Mono', monospace" }}>
          POST /datasets/v3/trigger → webhook → Convex → useQuery
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: "0.75rem", padding: "0.75rem", borderRadius: 7,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: "0.78rem", color: "#ef4444", fontFamily: "'IBM Plex Mono', monospace",
        }}>
          ✗ {error}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const snapshots = useQuery(api.example.listSnapshots, {}) as Snapshot[] | undefined;
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleTriggered = (id: string) => setActiveId(id);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #05050f;
          color: #e8e8f0;
          font-family: 'IBM Plex Sans', sans-serif;
          min-height: 100vh;
        }

        input:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.15) !important;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px rgba(249,115,22,0.2), 0 0 20px rgba(249,115,22,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(249,115,22,0.05), 0 0 30px rgba(249,115,22,0.15); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a14; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 15% 0%, rgba(249,115,22,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(99,102,241,0.05) 0%, transparent 55%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>

          {/* Header */}
          <div style={{ marginBottom: "2.5rem", animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.75rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, #f97316 0%, #6366f1 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", boxShadow: "0 6px 24px rgba(249,115,22,0.25)",
              }}>🗄</div>
              <div>
                <h1 style={{
                  fontSize: "1.4rem", fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "#e8e8f0", letterSpacing: "-0.02em",
                }}>
                  convex-bright-data-datasets
                </h1>
                <div style={{ fontSize: "0.75rem", color: "#4a4a5a", fontFamily: "'IBM Plex Mono', monospace" }}>
                  @sholajegede/convex-bright-data-datasets
                </div>
              </div>
            </div>
            <p style={{ color: "#5a5a70", fontSize: "0.88rem", maxWidth: 560, lineHeight: 1.65 }}>
              Watch how Bright Data's Datasets API integrates with Convex end to end —
              from trigger to webhook delivery to reactive UI updates, all in real time.
            </p>

            {/* How it works strip */}
            <div style={{
              marginTop: "1.25rem", padding: "0.85rem 1rem",
              background: "#0a0a15", border: "1px solid #151525", borderRadius: 8,
              display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "#4a4a5a",
            }}>
              <span style={{ color: "#f97316" }}>brightDatasets.trigger()</span>
              <span>→</span>
              <span style={{ color: "#6b8cba" }}>Bright Data scrapes</span>
              <span>→</span>
              <span style={{ color: "#8b5cf6" }}>POST /webhooks/brightdata</span>
              <span>→</span>
              <span style={{ color: "#10b981" }}>handleWebhook()</span>
              <span>→</span>
              <span style={{ color: "#10b981" }}>useQuery updates</span>
            </div>
          </div>

          {/* Trigger panel */}
          <div style={{ animation: "fadeIn 0.5s ease 0.1s both" }}>
            <TriggerPanel onTriggered={handleTriggered} />
          </div>

          {/* Snapshots */}
          {snapshots && snapshots.length > 0 && (
            <div style={{ animation: "fadeIn 0.5s ease 0.2s both" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "1rem",
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#3a3a4a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Collection history
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem",
                  color: "#3a3a4a",
                }}>
                  {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
                </div>
              </div>

              {[...snapshots]
                .sort((a, b) => b.triggeredAt - a.triggeredAt)
                .map((s) => (
                  <SnapshotCard
                    key={s.snapshotId}
                    snapshot={s}
                    isActive={s.snapshotId === activeId}
                  />
                ))}
            </div>
          )}

          {!snapshots || snapshots.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "4rem 1rem",
              border: "1px dashed #1a1a2a", borderRadius: 10,
              color: "#3a3a4a", fontSize: "0.85rem",
              animation: "fadeIn 0.5s ease 0.2s both",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚡</div>
              <div style={{ fontWeight: 700, color: "#4a4a5a", marginBottom: "0.35rem" }}>No collections yet</div>
              <div style={{ fontSize: "0.78rem" }}>Trigger your first collection above to see the full pipeline</div>
            </div>
          ) : null}

        </div>
      </div>
    </>
  );
}
