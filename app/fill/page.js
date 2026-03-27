"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { defaultProfile, DOCUMENT_TYPES } from "@/lib/profileSchema";

const STATUS_COLORS = { GREEN: "#00e5a0", YELLOW: "#ffd97d", RED: "#ff5c75" };

export default function FillPage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [formUrl, setFormUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fields, setFields] = useState([]);
  const [hasCaptcha, setHasCaptcha] = useState(false);
  const [error, setError] = useState(null);
  const [fillResult, setFillResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const [manualValues, setManualValues] = useState({});
  const [step, setStep] = useState("input"); // input | analyzed | filling | captcha | done_step
  const [sessionId, setSessionId] = useState(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("formBharoProfiles");
      const activeId = localStorage.getItem("formBharoActiveProfileId");
      if (saved && activeId) {
        const profiles = JSON.parse(saved);
        if (Array.isArray(profiles)) {
          const active = profiles.find(p => p.id === activeId);
          if (active) {
            setProfile(active.data);
            return;
          }
        }
      }
      const p = localStorage.getItem("formBharoProfile");
      setProfile(p ? JSON.parse(p) : defaultProfile());
    } catch { setProfile(defaultProfile()); }
  }, []);

  useEffect(() => {
    const isUrl = (string) => {
      try { return new URL(string); } catch (_) { return false; }
    };
    if (formUrl && isUrl(formUrl) && !analyzing && fields.length === 0 && !sessionId) {
      const timer = setTimeout(() => analyzeForm(), 800);
      return () => clearTimeout(timer);
    }
  }, [formUrl]);

  const analyzeForm = async (silent = false) => {
    if (!formUrl.trim() && !sessionId) return;
    if (!silent) setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/form-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, sessionId }),
      });
      const data = await res.json();
      if (data.error) { if(!silent) setError(data.error); return null; }
      else {
        setFields(data.fields || []);
        setHasCaptcha(data.hasCaptcha || false);
        setStep("analyzed");
        return data.fields;
      }
    } catch (e) { if(!silent) setError(e.message); return null; }
    finally { if(!silent) setAnalyzing(false); }
  };

  const startFill = async (overrideAutoSubmit = false) => {
    setFilling(true);
    setError(null);
    setStep("filling");

    const enrichedFields = fields.map((f, idx) => ({
      ...f,
      _manualValue: manualValues[idx] || null,
    }));

    try {
      const res = await fetch("/api/form-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: formUrl, 
          profile, 
          fieldMappings: enrichedFields, 
          sessionId, 
          autoSubmit: autoSubmit || overrideAutoSubmit 
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("analyzed"); }
      else {
        setFillResult(data);
        localStorage.setItem("formBharoFillResult", JSON.stringify(data));
        setSessionId(data.sessionId);
        setHasCaptcha(data.hasCaptcha || false);
        
        if (data.nextFields) {
          setFields(data.nextFields);
          setCurrentStepIndex(prev => prev + 1);
          setManualValues({});
          setStep("analyzed");
        } else {
          setStep("done_step");
        }
      }
    } catch (e) { setError(e.message); setStep("analyzed"); }
    finally { setFilling(false); }
  };

  const turboFill = async () => {
    setAutoSubmit(true);
    const detectedFields = await analyzeForm(true);
    if (detectedFields) startFill(true);
  };

  const getProfileValue = (key) => {
    if (!profile || !key) return "";
    try {
      const parts = key.replace(/\[(\d+)\]/g, ".$1").split(".");
      let v = profile;
      for (const p of parts) { v = v?.[p]; }
      return v || "";
    } catch { return ""; }
  };

  const updateFieldMapping = (idx, key, value) => {
    const newFields = [...fields];
    newFields[idx][key] = value;
    setFields(newFields);
  };

  return (
    <div className="page-wrapper">
      <Navbar lang={lang} setLang={setLang} currentStep={3} />

      <div className="container section-sm">
        <div className="text-center mb-6">
          <div className="section-title">Step 3 of 4 {sessionId ? `— Session Active` : ""}</div>
          <h1 style={{ fontSize: "1.8rem" }}>AI-Powered Multi-Step Fill</h1>
          <p className="mt-2" style={{ maxWidth: 560, margin: "8px auto 0", fontSize: "0.95rem" }}>
            The AI handles multiple pages automatically. Toggle <b>Turbo Flow</b> if you want the AI to submit steps on your behalf.
          </p>
        </div>

        <div className="glass-card p-6 mb-6">
          <div className="form-group">
            <label className="form-label">🔗 Target Form URL</label>
            <div className="url-input-row">
              <input
                className="form-input"
                type="url"
                placeholder="https://example.gov.in/registration"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeForm()}
                disabled={!!sessionId}
              />
              <div className="flex gap-2">
                {!sessionId && (
                   <>
                    <button className="btn btn-secondary" onClick={() => analyzeForm()} disabled={analyzing || filling || !formUrl.trim()}>
                      {analyzing ? "..." : "🔍 Analyze"}
                    </button>
                    <button className="btn btn-primary" onClick={turboFill} disabled={analyzing || filling || !formUrl.trim()}
                      style={{ background: "var(--gradient-royal)", border: "none", boxShadow: "0 0 15px rgba(108,99,255,0.4)" }}>
                      🚀 Turbo Mode
                    </button>
                   </>
                )}
                {sessionId && (
                  <button className="btn btn-red btn-sm" onClick={() => { setSessionId(null); setStep("input"); setFields([]); setFormUrl(""); setCurrentStepIndex(1); }}>
                    ❌ Close Session
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-3 bg-glass rounded">
             <div className="flex items-center gap-3">
                <span style={{ fontSize: "1.2rem" }}>🔥</span>
                <div>
                   <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Turbo Flow (Auto-Submit)</div>
                   <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>AI will automatically click "Next/Submit" after filling each step.</div>
                </div>
             </div>
             <label className="switch">
                <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
                <span className="slider round"></span>
             </label>
          </div>

          {analyzing && <div className="mt-3 text-blue-400 text-sm">Scanning...</div>}
          {error && <div className="error-box mt-3">❌ {error}</div>}
        </div>

        <div className="dashboard-grid">
          <div className="fields-column">
            {fields.length > 0 && (
              <div className="glass-card mb-6 overflow-hidden">
                <div className="p-4 border-b border-glass bg-glass flex justify-between">
                  <h3 style={{ fontSize: "0.9rem" }}>Step {currentStepIndex} Fields</h3>
                  <span className="badge badge-blue">{fields.length}</span>
                </div>
                <div className="fields-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {fields.map((f, idx) => {
                    const mappedValue = f.profileKey ? getProfileValue(f.profileKey) : "";
                    const displayValue = manualValues[idx] !== undefined ? manualValues[idx] : mappedValue;
                    return (
                      <div key={idx} className="p-3 border-b border-glass last:border-0 hover:bg-glass-light transition-colors">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold opacity-80">{f.label || f.name}</span>
                          <span className={`status-dot ${f.status?.toLowerCase() || 'red'}`}></span>
                        </div>
                        <input className="form-input text-xs p-1 h-8" value={displayValue || ""} placeholder="..."
                          onChange={(e) => setManualValues(prev => ({ ...prev, [idx]: e.target.value }))} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="preview-column">
             {(step === "analyzed" || step === "done_step") && fields.length > 0 && (
                <div className="glass-card p-6 mb-6 text-center">
                   <h3 className="mb-4">{step === "done_step" ? "Step AI Fill Complete" : `Ready to Fill Step ${currentStepIndex}`}</h3>
                   <div className="flex gap-4">
                     {step === "done_step" && (
                        <button className="btn btn-secondary w-full btn-lg" onClick={() => router.push("/review")}>
                          📋 View AI Audit Log
                        </button>
                     )}
                     <button className="btn btn-primary w-full btn-lg" onClick={() => startFill()} disabled={filling}>
                        {filling ? "AI Thinking..." : (step === "done_step" ? "➡️ AI Fetch Next Step" : "✨ AI Agent: Fill This Step")}
                     </button>
                   </div>
                </div>
             )}

             {(step === "filling" || step === "captcha" || step === "done_step") && (
                <div className="glass-card p-6">
                   <div className="flex items-center gap-3 mb-4">
                      {filling ? <span className="spinner-sm"></span> : <span>📺</span>}
                      <h3 style={{ fontSize: "1rem" }}>{filling ? "AI working..." : "Browser Preview"}</h3>
                   </div>
                   {fillResult?.screenshotBase64 ? (
                      <div className="screenshot-wrapper">
                         <img src={`data:image/png;base64,${fillResult.screenshotBase64}`} alt="Live View" style={{ borderRadius: '8px' }} />
                         <div className="live-overlay">Step {currentStepIndex}</div>
                      </div>
                   ) : (
                      <div className="browser-placeholder" style={{ height: '300px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                         Preparing browser instance...
                      </div>
                   )}
                </div>
             )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-grid { display: grid; grid-template-columns: 350px 1fr; gap: 24px; margin-top: 24px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.green { background: #00e5a0; box-shadow: 0 0 5px #00e5a0; }
        .status-dot.yellow { background: #ffd97d; }
        .status-dot.red { background: #ff5c75; }
        .screenshot-wrapper { position: relative; }
        .live-overlay { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; backdrop-filter: blur(4px); }
        .btn-red { background: rgba(255, 92, 117, 0.1); color: #ff5c75; border: 1px solid rgba(255, 92, 117, 0.3); }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-primary); }
        input:checked + .slider:before { transform: translateX(20px); }
        .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(108,99,255,0.2); border-top-color: #6c63ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
