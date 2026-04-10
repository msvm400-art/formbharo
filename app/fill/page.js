"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DocumentRequirementModal from "@/components/DocumentRequirementModal";
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
  const [showReqModal, setShowReqModal] = useState(null); // idx of field
  const [fieldReqs, setFieldReqs] = useState({}); // { idx: {...} }
  const [activeAiFieldIdx, setActiveAiFieldIdx] = useState(null);
  const [browserUrlDisplay, setBrowserUrlDisplay] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

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

    // 🕒 Polling for real-time visibility
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/browser/screenshot/${sessionId}`);
        const data = await res.json();
        if (data.screenshotBase64) {
          setFillResult(prev => ({ ...prev, screenshotBase64: data.screenshotBase64 }));
        }
      } catch (e) { console.error("Polling error:", e); }
    }, 2000);

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
        
        if (data.nextFields && data.nextFields.length > 0) {
          setFields(data.nextFields);
          setCurrentStepIndex(prev => prev + 1);
          setManualValues({});
          setStep("analyzed");
          
          // 🚀 AUTO-CONTINUE (Turbo Mode or User requested "Next")
          if (autoSubmit || overrideAutoSubmit) {
            console.log("[FillPage] Auto-triggering next step...");
            setTimeout(() => startFill(overrideAutoSubmit), 2000);
          }
        } else {
          setStep("done_step");
        }
      }
    } catch (e) { setError(e.message); setStep("analyzed"); }
    finally { 
      clearInterval(pollInterval);
      setFilling(false); 
    }
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

  const syncToProfile = async (idx) => {
    const val = manualValues[idx];
    if (!val) return;
    
    // We send back to backend to update learning store
    const field = fields[idx];
    try {
      await fetch("/api/profile/update-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: [{ 
            label: field.label, 
            name: field.name, 
            profileKey: `MANUAL:${field.label || field.name}`, // Special prefix for manual learning
            fillValue: val 
          }]
        })
      });
      console.log("Synced to profile!");
    } catch (e) { console.error(e); }
  };

  const handleBrowserCommand = async (command, extra = {}) => {
    if (!sessionId || filling || isNavigating) return;
    setIsNavigating(true);
    try {
       const res = await fetch("/api/browser/command", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ sessionId, command, ...extra })
       });
       const data = await res.json();
       if (data.screenshotBase64) {
          setFillResult(prev => ({ ...prev, screenshotBase64: data.screenshotBase64 }));
       }
    } catch (e) { console.error(e); }
    finally { setIsNavigating(false); }
  };

  const handleBrowserClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1366;
    const y = ((e.clientY - rect.top) / rect.height) * 768;
    handleBrowserCommand("click", { x, y });
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

        <div className="dashboard-grid-hybrid">
          <div className="preview-pane">
             <div className="browser-shell" style={{ height: 'calc(100vh - 250px)' }}>
                <div className="browser-header">
                   <div className="browser-controls">
                      <div className="browser-dot dot-red"></div>
                      <div className="browser-dot dot-yellow"></div>
                      <div className="browser-dot dot-green"></div>
                   </div>
                   <div className="browser-nav-btns">
                      <button className="browser-nav-btn" onClick={() => handleBrowserCommand("back")}>←</button>
                      <button className="browser-nav-btn" onClick={() => handleBrowserCommand("forward")}>→</button>
                      <button className="browser-nav-btn" onClick={() => handleBrowserCommand("refresh")}>↻</button>
                   </div>
                   <div className="browser-url-bar">
                      <span style={{ fontSize: '0.8rem' }}>🔒</span>
                      <input 
                        className="browser-url-input" 
                        value={browserUrlDisplay || formUrl} 
                        onChange={(e) => setBrowserUrlDisplay(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBrowserCommand("navigate", { text: browserUrlDisplay })}
                      />
                   </div>
                </div>

                <div className="screenshot-browser-container" onClick={handleBrowserClick}>
                   {fillResult?.screenshotBase64 ? (
                      <img src={`data:image/png;base64,${fillResult.screenshotBase64}`} alt="Live View" className="interactive-ss" />
                   ) : (
                      <div className="browser-placeholder">
                         {isNavigating ? <span className="spinner"></span> : <span className="spinner-sm mb-4"></span>}
                         <p>{isNavigating ? "Navigating..." : "Waiting for Browser Stream..."}</p>
                      </div>
                   )}
                   {filling && (
                     <div className="filling-overlay-v2">
                        <div className="spinner"></div>
                        <div className="mt-4 font-bold text-white tracking-widest uppercase text-xs">AI Agent Filling Form...</div>
                        <div className="browser-progress-line" style={{ width: '40%' }}></div>
                     </div>
                   )}
                </div>

                <div className="browser-status-bar">
                   <div className="ai-status-indicator">
                      <div className={filling ? "pulse-red" : "status-dot green"}></div>
                      <span className="font-semibold uppercase tracking-tighter" style={{ fontSize: '10px' }}>
                        {filling ? "AI Agent Active" : "Agent Standby"}
                      </span>
                   </div>
                   <div className="text-secondary" style={{ fontSize: '10px' }}>
                      {sessionId ? `SID: ${sessionId.substring(0,8)}...` : "No Active Session"}
                   </div>
                </div>
             </div>
          </div>

          <div className="sidebar-pane">
             {fields.length > 0 ? (
               <div className="glass-card flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
                 <div className="p-4 border-b border-glass bg-glass flex justify-between items-center">
                   <h3 style={{ fontSize: "0.8rem" }}>AI Agent Intelligence</h3>
                   <span className="badge badge-blue">{fields.length} Fields</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {fields.map((f, idx) => {
                      const mappedValue = f.profileKey ? getProfileValue(f.profileKey) : "";
                      const displayValue = manualValues[idx] !== undefined ? manualValues[idx] : mappedValue;
                      const isAiFilled = f.source === "AI" || (f.profileKey && !manualValues[idx]);

                      return (
                        <div key={idx} className={`p-3 mb-3 bg-glass rounded-lg border border-transparent hover:border-glass transition-all relative ${isAiFilled ? 'field-ai-filled' : ''}`}>
                          {isAiFilled && <div className="ai-badge-mini">AI</div>}
                          <div className="flex justify-between mb-2 items-center">
                            <span className="text-xs font-semibold opacity-70 truncate" style={{ maxWidth: '80%' }}>{f.label || f.name}</span>
                            <div className="flex gap-1 items-center">
                               {f.type === 'file' && (
                                 <button className="text-[10px] text-blue-400 underline" onClick={() => setShowReqModal(idx)}>Rules</button>
                               )}
                               <span className={`status-dot ${f.status?.toLowerCase() || (isAiFilled ? 'green' : 'red')}`}></span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <input className="form-input text-xs p-1 h-8 flex-1" value={displayValue || ""} 
                               style={isAiFilled ? { borderColor: 'rgba(0, 229, 160, 0.3)' } : {}}
                               placeholder={f.type === 'file' ? "Upload from Profile" : "Empty..."}
                               onChange={(e) => setManualValues(prev => ({ ...prev, [idx]: e.target.value }))} />
                             
                             {!f.profileKey && manualValues[idx] && (
                               <button className="btn btn-xs btn-primary p-1" title="Save to Profile" onClick={() => syncToProfile(idx)}>💾</button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                 </div>

                 <div className="p-4 border-t border-glass bg-glass">
                    <button className="btn btn-primary w-full h-12" onClick={() => startFill()} disabled={filling}>
                       {filling ? "AI Solving..." : (step === "done_step" ? "Next Step ➡️" : "✨ Run AI Auto-Fill")}
                    </button>
                    {step === "done_step" && (
                       <button className="btn btn-secondary w-full mt-2" onClick={() => router.push("/review")}>Review Audit Log</button>
                    )}
                 </div>
               </div>
             ) : (
                <div className="glass-card p-10 text-center opacity-50">
                   <p>Enter a URL above to begin.</p>
                </div>
             )}
          </div>
        </div>

        <DocumentRequirementModal 
           isOpen={showReqModal !== null} 
           onClose={() => setShowReqModal(null)}
           fieldLabel={showReqModal !== null ? (fields[showReqModal]?.label || fields[showReqModal]?.name) : ''}
           initialReqs={showReqModal !== null ? fieldReqs[showReqModal] : null}
           onSave={(data) => {
             setFieldReqs(prev => ({ ...prev, [showReqModal]: data }));
             updateFieldMapping(showReqModal, 'resizeReqs', data);
             setShowReqModal(null);
           }}
        />
      </div>

      <style>{`
        .dashboard-grid-hybrid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; margin-top: 24px; align-items: start; }
        .preview-pane { position: sticky; top: 100px; }
        .screenshot-browser-container { position: relative; width: 100%; height: 100%; cursor: pointer; background: #111; display: flex; align-items: center; justify-content: center; overflow: auto; }
        .interactive-ss { width: 100%; min-width: 1366px; height: auto; display: block; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.green { background: #00e5a0; box-shadow: 0 0 5px #00e5a0; }
        .status-dot.yellow { background: #ffd97d; }
        .status-dot.red { background: #ff5c75; }
        .btn-red { background: rgba(255, 92, 117, 0.1); color: #ff5c75; border: 1px solid rgba(255, 92, 117, 0.3); }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-primary); }
        input:checked + .slider:before { transform: translateX(20px); }
        .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(108,99,255,0.2); border-top-color: #6c63ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .pulse { animation: pulse 2s infinite; }
        .dot { width: 6px; height: 6px; border-radius: 50%; }
        .bg-green { background: #00e5a0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .browser-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; opacity: 0.5; }
      `}</style>
    </div>
  );
}
