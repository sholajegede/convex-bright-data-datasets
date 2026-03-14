import "./App.css";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";

type Snapshot = {
  snapshotId: string;
  datasetId: string;
  status: string;
  recordCount?: number;
  triggeredAt: number;
  completedAt?: number;
};

const STEPS = [
  { id: 1, label: "Trigger", desc: "Action fires, job queued" },
  { id: 2, label: "Collecting", desc: "Bright Data scrapes" },
  { id: 3, label: "Webhook", desc: "Results delivered" },
  { id: 4, label: "Stored", desc: "Records saved to Convex" },
  { id: 5, label: "Ready", desc: "useQuery updates" },
];

const STATUS_STEP: Record<string, number> = {
  pending: 1, running: 2, collecting: 2, digesting: 3, ready: 5, failed: 0, canceled: 0,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", running: "#3b82f6", collecting: "#3b82f6",
  digesting: "#8b5cf6", ready: "#059669", failed: "#dc2626", canceled: "#9ca3af",
};

function Pipeline({ status }: { status: string }) {
  const activeStep = STATUS_STEP[status] ?? 0;
  const failed = status === "failed" || status === "canceled";

  return (
    <div style={{ margin: "1.25rem 0 1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
        {STEPS.map((step, i) => {
          const done = activeStep > step.id || (activeStep === step.id && status === "ready");
          const active = activeStep === step.id && status !== "ready";
          const dotColor = failed ? "#dc2626" : done ? "#059669" : active ? "#f97316" : "#d1d5db";
          return (
            <div key={step.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {i < STEPS.length - 1 && (
                <div style={{
                  position: "absolute", top: 15, left: "50%", width: "100%", height: 2,
                  background: done ? "#059669" : "#e5e7eb", transition: "background 0.5s ease", zIndex: 0,
                }} />
              )}
              <div style={{
                width: 32, height: 32, borderRadius: "50%", zIndex: 1,
                background: done || active ? dotColor : "#f3f4f6",
                border: `2px solid ${active ? "#f97316" : done ? dotColor : "#e5e7eb"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.72rem", fontWeight: 700,
                color: done || active ? "#fff" : "#9ca3af",
                boxShadow: active ? `0 0 0 4px rgba(249,115,22,0.15)` : "none",
                animation: active ? "pulse-ring 1.5s ease-in-out infinite" : "none",
                transition: "all 0.4s ease",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {done ? "✓" : step.id}
              </div>
              <div style={{ marginTop: "0.4rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: done || active ? "#111827" : "#9ca3af", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "0.62rem", color: "#9ca3af", marginTop: 2, maxWidth: 72, lineHeight: 1.3 }}>
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

function LogStream({ snapshot }: { snapshot: Snapshot | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const logs: { time: string; msg: string; type: "info" | "success" | "warn" }[] = [];

  if (snapshot) {
    const t = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour12: false });
    logs.push({ time: t(snapshot.triggeredAt), msg: `trigger() — dataset ${snapshot.datasetId}`, type: "info" });
    logs.push({ time: t(snapshot.triggeredAt), msg: `snapshot_id: ${snapshot.snapshotId}`, type: "info" });
    logs.push({ time: t(snapshot.triggeredAt + 50), msg: `upsertSnapshot() — status: pending`, type: "info" });
    if (["collecting", "running"].includes(snapshot.status))
      logs.push({ time: t(snapshot.triggeredAt + 200), msg: "Bright Data scraping target URL...", type: "info" });
    if (snapshot.status === "digesting")
      logs.push({ time: t(snapshot.triggeredAt + 500), msg: "Bright Data processing results...", type: "info" });
    if (snapshot.status === "ready" && snapshot.completedAt) {
      logs.push({ time: t(snapshot.completedAt - 100), msg: "POST /webhooks/brightdata received", type: "success" });
      logs.push({ time: t(snapshot.completedAt - 80), msg: `handleWebhook() — parsing NDJSON`, type: "success" });
      logs.push({ time: t(snapshot.completedAt - 60), msg: `insertRecords() — ${snapshot.recordCount ?? 1} record(s) stored`, type: "success" });
      logs.push({ time: t(snapshot.completedAt - 40), msg: `updateSnapshotStatus() — ready`, type: "success" });
      logs.push({ time: t(snapshot.completedAt), msg: "useQuery subscribers notified", type: "success" });
    }
    if (snapshot.status === "failed")
      logs.push({ time: t(snapshot.triggeredAt), msg: "Collection failed — check Bright Data dashboard", type: "warn" });
  }

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs.length]);

  return (
    <div ref={ref} style={{
      background: "#0f172a", borderRadius: 8, padding: "0.85rem 1rem",
      height: 148, overflowY: "auto",
      fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
      border: "1px solid #e2e8f0",
    }}>
      {logs.length === 0
        ? <div style={{ color: "#475569" }}>// waiting for collection...</div>
        : logs.map((log, i) => (
          <div key={i} style={{ marginBottom: "0.25rem", display: "flex", gap: "0.75rem" }}>
            <span style={{ color: "#475569", flexShrink: 0 }}>{log.time}</span>
            <span style={{ color: log.type === "success" ? "#34d399" : log.type === "warn" ? "#fbbf24" : "#7dd3fc" }}>
              {log.type === "success" ? "✓" : log.type === "warn" ? "⚠" : "›"} {log.msg}
            </span>
          </div>
        ))}
      {snapshot && !["ready", "failed", "canceled"].includes(snapshot.status ?? "") && (
        <span style={{ color: "#475569", animation: "blink 1s step-end infinite" }}>█</span>
      )}
    </div>
  );
}

function JsonViewer({ data }: { data: unknown }) {
  const renderValue = (val: unknown, depth = 0): React.ReactElement => {
    if (val === null || val === undefined) return <span style={{ color: "#6366f1" }}>null</span>;
    if (typeof val === "boolean") return <span style={{ color: "#8b5cf6" }}>{String(val)}</span>;
    if (typeof val === "number") return <span style={{ color: "#059669", fontWeight: 600 }}>{val}</span>;
    if (typeof val === "string") {
      if (val.startsWith("http")) return (
        <a href={val} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
          "{val.length > 60 ? val.slice(0, 60) + "…" : val}"
        </a>
      );
      return <span style={{ color: "#b45309" }}>"{val.length > 100 ? val.slice(0, 100) + "…" : val}"</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: "#6b7280" }}>[ ]</span>;
      if (depth > 1) return <span style={{ color: "#6b7280" }}>[{val.length} items]</span>;
      return (
        <div style={{ marginLeft: 16 }}>
          {val.slice(0, 5).map((item, i) => (
            <div key={i} style={{ marginBottom: 2 }}>
              <span style={{ color: "#9ca3af" }}>{i}: </span>{renderValue(item, depth + 1)}
            </div>
          ))}
          {val.length > 5 && <div style={{ color: "#9ca3af" }}>…+{val.length - 5} more</div>}
        </div>
      );
    }
    if (typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== "");
      if (depth > 2) return <span style={{ color: "#6b7280" }}>{"{…}"}</span>;
      return (
        <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "flex-start" }}>
              <span style={{ color: "#0f766e", fontWeight: 600, flexShrink: 0, minWidth: 120 }}>{k}</span>
              <span style={{ color: "#6b7280", flexShrink: 0 }}>:</span>
              <span>{renderValue(v, depth + 1)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <span style={{ color: "#374151" }}>{String(val)}</span>;
  };

  return (
    <div style={{
      background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
      padding: "1rem", fontSize: "0.78rem",
      fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
      maxHeight: 420, overflowY: "auto",
    }}>
      {renderValue(data)}
    </div>
  );
}

function RecordViewer({ snapshotId }: { snapshotId: string }) {
  const records = useQuery(api.example.getRecords, { snapshotId });
  const [tab, setTab] = useState<"pretty" | "raw">("pretty");
  const [copied, setCopied] = useState(false);

  if (!records || records.length === 0) return null;

  const allItems: unknown[] = [];
  records.forEach((r: any) => {
    try {
      const outer = JSON.parse(r.data);
      if (Array.isArray(outer)) {
        outer.forEach((item: unknown) => {
          if (typeof item === "string") {
            try { allItems.push(JSON.parse(item)); } catch { allItems.push(item); }
          } else { allItems.push(item); }
        });
      } else if (typeof outer === "string") {
        try { allItems.push(JSON.parse(outer)); } catch { allItems.push(outer); }
      } else { allItems.push(outer); }
    } catch { allItems.push(r.data); }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(allItems, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {allItems.length} Record{allItems.length !== 1 ? "s" : ""} Received
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={handleCopy} style={{
            padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0",
            background: copied ? "#f0fdf4" : "#fff", color: copied ? "#059669" : "#6b7280",
            fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
          }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          {(["pretty", "raw"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0",
              background: tab === t ? "#0f172a" : "#fff",
              color: tab === t ? "#fff" : "#6b7280",
              fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>
      </div>
      {allItems.map((item, i) => (
        <div key={i} style={{ marginBottom: "0.75rem" }}>
          {tab === "pretty"
            ? <JsonViewer data={item} />
            : (
              <pre style={{
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "1rem", fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                maxHeight: 420, overflowY: "auto", margin: 0, color: "#374151",
              }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            )}
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({
  snapshot, isActive, defaultCollapsed, onRetrigger,
}: {
  snapshot: Snapshot;
  isActive: boolean;
  defaultCollapsed: boolean;
  onRetrigger: (datasetId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const statusColor = STATUS_COLOR[snapshot.status] ?? "#9ca3af";
  const elapsed = snapshot.completedAt
    ? `${((snapshot.completedAt - snapshot.triggeredAt) / 1000).toFixed(1)}s` : null;

  return (
    <div style={{
      border: `1.5px solid ${isActive ? "#f97316" : "#e5e7eb"}`,
      borderRadius: 12, overflow: "hidden", marginBottom: "0.85rem",
      boxShadow: isActive ? "0 4px 24px rgba(249,115,22,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
      transition: "all 0.3s ease", background: "#fff",
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: "0.85rem 1.1rem", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
          background: isActive ? "#fff7ed" : "#f9fafb",
          borderBottom: collapsed ? "none" : "1px solid #e5e7eb",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0,
            animation: ["running", "collecting", "pending"].includes(snapshot.status) ? "pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#111827", fontWeight: 600 }}>
            {snapshot.snapshotId}
          </span>
          <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date(snapshot.triggeredAt).toLocaleTimeString()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {elapsed && <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>{elapsed}</span>}
          <span style={{
            padding: "2px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
            background: `${statusColor}18`, color: statusColor,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>{snapshot.status}</span>
          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
            {snapshot.recordCount ?? 0} records
          </span>
          {snapshot.status === "ready" && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetrigger(snapshot.datasetId); }}
              style={{
                padding: "3px 10px", borderRadius: 5, border: "1px solid #e5e7eb",
                background: "#fff", color: "#6b7280", fontSize: "0.7rem",
                fontWeight: 600, cursor: "pointer",
              }}
            >
              ↻ Again
            </button>
          )}
          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: "0 1.1rem 1.1rem", background: "#fff" }}>
          <Pipeline status={snapshot.status} />
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Execution log
          </div>
          <LogStream snapshot={snapshot} />
          {snapshot.status === "ready" && <RecordViewer snapshotId={snapshot.snapshotId} />}
        </div>
      )}
    </div>
  );
}

function TriggerPanel({ onTriggered, prefillDatasetId }: {
  onTriggered: (id: string) => void;
  prefillDatasetId?: string;
}) {
  const [datasetId, setDatasetId] = useState(prefillDatasetId ?? "gd_l1viktl72bvl7bjuj0");
  const [inputUrl, setInputUrl] = useState("https://www.linkedin.com/in/elad-moshe-05a90413/");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerCollection = useAction(api.example.triggerCollection);

  const handleTrigger = async () => {
    if (!datasetId.trim() || !inputUrl.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await triggerCollection({ datasetId, inputs: [{ url: inputUrl }] }) as any;
      onTriggered(res.snapshotId);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12,
      padding: "1.5rem", marginBottom: "1.5rem",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(249,115,22,0.3)", flexShrink: 0,
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", textAlign: "left" }}>Trigger a Collection</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "left" }}>Fires an async Bright Data dataset job and watches it in real time</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Dataset ID", value: datasetId, set: setDatasetId, mono: true, placeholder: "gd_..." },
          { label: "Input URL", value: inputUrl, set: setInputUrl, mono: false, placeholder: "https://..." },
        ].map(({ label, value, set, mono, placeholder }) => (
          <div key={label}>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
              {label}
            </label>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              style={{
                width: "100%", padding: "0.6rem 0.75rem", borderRadius: 7,
                border: "1.5px solid #e5e7eb", background: "#f9fafb",
                color: "#111827", fontSize: "0.8rem",
                fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button onClick={handleTrigger} disabled={loading} style={{
          padding: "0.65rem 1.5rem", borderRadius: 8, border: "none",
          background: loading ? "#f3f4f6" : "linear-gradient(135deg, #f97316, #ea580c)",
          color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: "0.85rem",
          cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {loading ? "Queuing..." : "Trigger Collection"}
        </button>
        <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
          POST /datasets/v3/trigger → webhook → Convex → useQuery
        </span>
      </div>

      {error && (
        <div style={{
          marginTop: "0.75rem", padding: "0.75rem", borderRadius: 7,
          background: "#fef2f2", border: "1px solid #fecaca",
          fontSize: "0.78rem", color: "#dc2626", fontFamily: "'JetBrains Mono', monospace",
        }}>✗ {error}</div>
      )}
    </div>
  );
}

export default function App() {
  const snapshots = useQuery(api.example.listSnapshots, {}) as Snapshot[] | undefined;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [retriggerDatasetId, setRetriggerDatasetId] = useState<string | undefined>(undefined);

  const sorted = snapshots ? [...snapshots].sort((a, b) => b.triggeredAt - a.triggeredAt) : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; color: #111827; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        input:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.12) !important; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 4px rgba(249,115,22,0.2)} 50%{box-shadow:0 0 0 8px rgba(249,115,22,0.05)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>

          <div style={{ marginBottom: "2rem", animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.75rem" }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: "linear-gradient(135deg, #f97316, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", boxShadow: "0 6px 20px rgba(249,115,22,0.2)",
              }}>🗄</div>
              <div>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", textAlign: "left" }}>
                  convex-bright-data-datasets
                </h1>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace", textAlign: "left" }}>
                  @sholajegede/convex-bright-data-datasets
                </div>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: "0.88rem", maxWidth: 540, lineHeight: 1.65, textAlign: "left" }}>
              Watch how Bright Data's Datasets API integrates with Convex end to end — from trigger to webhook delivery to reactive UI updates, all in real time.
            </p>
            <div style={{
              marginTop: "1rem", padding: "0.75rem 1rem",
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
              display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
            }}>
              {[
                { text: "brightDatasets.trigger()", color: "#f97316" },
                { text: "→", color: "#9ca3af" },
                { text: "Bright Data scrapes", color: "#3b82f6" },
                { text: "→", color: "#9ca3af" },
                { text: "POST /webhooks/brightdata", color: "#8b5cf6" },
                { text: "→", color: "#9ca3af" },
                { text: "handleWebhook()", color: "#059669" },
                { text: "→", color: "#9ca3af" },
                { text: "useQuery updates", color: "#059669" },
              ].map((item, i) => <span key={i} style={{ color: item.color }}>{item.text}</span>)}
            </div>
          </div>

          <div style={{ animation: "fadeIn 0.4s ease 0.1s both" }}>
            <TriggerPanel
              key={retriggerDatasetId ?? "default"}
              onTriggered={(id) => { setActiveId(id); setRetriggerDatasetId(undefined); }}
              prefillDatasetId={retriggerDatasetId}
            />
          </div>

          {sorted.length > 0 && (
            <div style={{ animation: "fadeIn 0.4s ease 0.2s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Collection history
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
                    {sorted.length} snapshot{sorted.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>· click to expand/collapse</span>
                </div>
              </div>
              {sorted.map((s, i) => (
                <SnapshotCard
                  key={s.snapshotId}
                  snapshot={s}
                  isActive={s.snapshotId === activeId}
                  defaultCollapsed={i > 0 && s.snapshotId !== activeId}
                  onRetrigger={(did) => {
                    setRetriggerDatasetId(did);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          )}

          {sorted.length === 0 && (
            <div style={{
              textAlign: "center", padding: "4rem 1rem",
              background: "#fff", border: "1.5px dashed #e5e7eb", borderRadius: 12,
              animation: "fadeIn 0.4s ease 0.2s both",
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚡</div>
              <div style={{ fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>No collections yet</div>
              <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Trigger your first collection above to see the full pipeline</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}