"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ReviewPage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [fillResult, setFillResult] = useState(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem("formBharoFillResult");
      setFillResult(r ? JSON.parse(r) : null);
    } catch {}
  }, []);

  const auditLog = fillResult?.auditLog || [];
  const filledActions = auditLog.filter((a) => a.type === "FIELD_FILLED");
  const skippedActions = auditLog.filter((a) => a.type === "FIELD_SKIPPED");
  const formUrl = fillResult?.formUrl || "";

  const getConfidenceBadge = (a) => {
    if (a.type === "FIELD_FILLED") {
      if (a.confidence === "high") return { cls: "badge-green", label: "✅ GREEN — Auto-filled (High Confidence)" };
      return { cls: "badge-yellow", label: "⚠️ YELLOW — Auto-filled (Verify)" };
    }
    return { cls: "badge-red", label: "❌ RED — Not filled" };
  };

  return (
    <div className="page-wrapper">
      <Navbar lang={lang} setLang={setLang} currentStep={4} />

      <div className="container section-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="section-title">Step 4 of 4</div>
            <h1 style={{ fontSize: "1.8rem" }}>Pre-Submission Review</h1>
            <p className="mt-1" style={{ fontSize: "0.9rem" }}>
              Review every filled field below. You perform the final submission.
            </p>
          </div>
          {formUrl && (
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              🌐 Open Form & Submit
            </a>
          )}
        </div>

        {/* Legend */}
        <div className="glass-card p-4 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Legend:</span>
            <span className="badge badge-green">✅ GREEN — Auto-filled, high confidence</span>
            <span className="badge badge-yellow">⚠️ YELLOW — Auto-filled, please verify</span>
            <span className="badge badge-red">❌ RED — Not filled, action required</span>
          </div>
        </div>

        {/* Summary Cards */}
        {fillResult && (
          <div className="review-stats mb-6">
            {[
              { label: "Total Fields", value: auditLog.length, color: "var(--text-primary)" },
              { label: "Auto-Filled", value: filledActions.length, color: STATUS_COLORS.GREEN },
              { label: "Skipped / Manual", value: skippedActions.length, color: STATUS_COLORS.RED },
              { label: "High Confidence", value: filledActions.filter(a => a.confidence === "high").length, color: STATUS_COLORS.GREEN },
              { label: "Low Confidence", value: filledActions.filter(a => a.confidence === "low").length, color: STATUS_COLORS.YELLOW },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center">
                <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Form screenshot */}
        {fillResult?.screenshotBase64 && (
          <div className="glass-card p-4 mb-6">
            <div className="section-title mb-2">Form Screenshot (After Fill)</div>
            <img
              src={`data:image/png;base64,${fillResult.screenshotBase64}`}
              alt="Filled form screenshot"
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border-glass)" }}
            />
          </div>
        )}

        {/* Empty state */}
        {auditLog.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div style={{ fontSize: "3rem" }}>📋</div>
            <h3 className="mt-4">No Fill Result Yet</h3>
            <p className="mt-2" style={{ fontSize: "0.9rem" }}>
              Please go back to the Fill page and run the auto-fill first.
            </p>
            <button className="btn btn-primary mt-4" onClick={() => router.push("/fill")}>← Go to Fill Page</button>
          </div>
        )}

        {/* Audit Log Table */}
        {auditLog.length > 0 && (
          <div className="glass-card overflow-auto mb-6">
            <div className="p-4">
              <h3 style={{ fontSize: "1rem" }}>📋 Full Audit Log</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>
                Every action taken by the AI — fully transparent
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Field Label</th>
                  <th>Status</th>
                  <th>Value Filled</th>
                  <th>Profile Key Used</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a, i) => {
                  const { cls, label } = getConfidenceBadge(a);
                  return (
                    <tr key={i}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                        {a.fieldLabel || a.fieldId || "—"}
                      </td>
                      <td><span className={`badge ${cls}`} style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{label}</span></td>
                      <td style={{ fontSize: "0.88rem", fontWeight: 500, color: a.type === "FIELD_FILLED" ? "var(--accent-green)" : "var(--text-muted)" }}>
                        {a.value || "—"}
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {a.profileKey || "—"}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {a.reason || ""}
                        {a.type === "CAPTCHA_DETECTED" ? "🛑 CAPTCHA paused fill" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* RED fields alert */}
        {skippedActions.length > 0 && (
          <div className="glass-card p-6 mb-6 red-alert">
            <h3 className="mb-3" style={{ color: "var(--accent-red)" }}>❌ {skippedActions.length} Fields Need Manual Attention</h3>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {skippedActions.map((a, i) => (
                <li key={i} style={{ fontSize: "0.9rem", display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ color: "var(--accent-red)" }}>•</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    <strong>{a.fieldLabel || "Unknown field"}</strong>
                    {a.reason ? ` — ${a.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 justify-between flex-wrap">
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => router.push("/fill")}>← Refill Form</button>
            <button className="btn btn-secondary" onClick={() => router.push("/upload")}>⬆️ Upload More Docs</button>
          </div>
          {formUrl && (
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              🌐 Open Form & Submit →
            </a>
          )}
        </div>

        {/* Final note */}
        <div className="final-note glass-card p-4 mt-6 text-center">
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            🔒 All your data stays on your device. Nothing is sent to any server except the OCR API call during document extraction.<br />
            ⚠️ Always review all RED and YELLOW fields before submitting your application.
          </p>
        </div>
      </div>

      <style>{`
        .review-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
        .red-alert { border-color: rgba(255,92,117,0.25) !important; background: rgba(255,92,117,0.05) !important; }
        .final-note { border-color: rgba(108,99,255,0.15) !important; }
        @media (max-width: 768px) { .review-stats { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 480px) { .review-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
}

const STATUS_COLORS = { GREEN: "#00e5a0", YELLOW: "#ffd97d", RED: "#ff5c75" };
