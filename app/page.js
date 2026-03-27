"use client";
import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  { icon: "🪪", title: "Aadhaar & PAN Extract", desc: "Auto-extract name, DOB, address, Aadhaar number from your ID cards using AI vision." },
  { icon: "📄", title: "Marksheet Deep Scan", desc: "All subjects, marks, percentages, roll numbers, and certificate numbers — extracted instantly." },
  { icon: "📋", title: "Certificate Data Harvest", desc: "Caste, domicile, income certificates — certificate numbers & issue dates extracted with priority." },
  { icon: "🤖", title: "Smart Form Fill", desc: "Paste any government form URL. AI maps and fills every field using your extracted documents." },
  { icon: "🖼️", title: "Photo & Signature Resize", desc: "Automatically resize and compress photos to exact pixel dimensions and KB limits required by forms." },
  { icon: "🔒", title: "100% Private & Secure", desc: "All data stays locally in your session. No cloud storage. No third-party sharing. Ever." },
];

const STEPS = [
  { num: "01", title: "Upload Documents", desc: "Upload Aadhaar, PAN, marksheets, certificates, photo and signature in any order.", icon: "⬆️" },
  { num: "02", title: "AI Extracts Data", desc: "Gemini Vision AI deep-scans every document and builds your complete applicant profile.", icon: "🧠" },
  { num: "03", title: "Paste Form URL", desc: "Enter the URL of any government/scholarship/admission form. AI analyzes all form fields.", icon: "🔗" },
  { num: "04", title: "Review & Submit", desc: "Review every filled field (GREEN/YELLOW/RED). You always do the final submission.", icon: "✅" },
];

const SUPPORTED = [
  "SSC / UPSC / BPSC", "UPPSC / State PSCs", "RRB (Railways)",
  "IBPS / SBI Banking", "University Admissions", "NSP Scholarships",
  "State Scholarship Portals", "Government Welfare Schemes",
];

export default function Home() {
  const [lang, setLang] = useState("en");

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner-home">
          <div className="brand">
            <span style={{ fontSize: "1.6rem" }}>📝</span>
            <span className="brand-name text-gradient">FormBharo</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
            >
              {lang === "en" ? "🇮🇳 हिंदी" : "🇬🇧 English"}
            </button>
            <Link href="/upload" className="btn btn-primary btn-sm">
              {lang === "hi" ? "शुरू करें →" : "Get Started →"}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="section hero-section">
        <div className="container text-center">
          <div className="hero-badge">
            <span className="badge badge-purple">
              🤖 Powered by Gemini AI Vision
            </span>
          </div>
          <h1 className="hero-title">
            {lang === "hi" ? (
              <>भरो हर सरकारी फॉर्म<br /><span className="text-gradient">AI से — खुद-ब-खुद</span></>
            ) : (
              <>Fill Every Government Form<br /><span className="text-gradient">Automatically with AI</span></>
            )}
          </h1>
          <p className="hero-subtitle">
            {lang === "hi"
              ? "अपने दस्तावेज़ अपलोड करें। AI सब कुछ पढ़ेगा — आधार, पैन, मार्कशीट, जाति प्रमाण पत्र। फिर किसी भी ऑनलाइन फॉर्म को अपने आप भर देगा।"
              : "Upload your documents once — Aadhaar, PAN, marksheets, caste & domicile certificates. Our AI reads everything and auto-fills any online application form in minutes."}
          </p>
          <div className="hero-actions">
            <Link href="/upload" className="btn btn-primary btn-lg">
              {lang === "hi" ? "⬆️ दस्तावेज़ अपलोड करें" : "⬆️ Upload Documents"}
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              {lang === "hi" ? "यह कैसे काम करता है?" : "How it works"}
            </a>
          </div>

          {/* STATS */}
          <div className="hero-stats">
            {[
              { value: "15+", label: lang === "hi" ? "दस्तावेज़ प्रकार" : "Document Types" },
              { value: "100+", label: lang === "hi" ? "फ़ील्ड मैपिंग" : "Field Mappings" },
              { value: "100%", label: lang === "hi" ? "गोपनीय" : "Private" },
              { value: "0", label: lang === "hi" ? "मैन्युअल टाइपिंग" : "Manual Typing" },
            ].map((s) => (
              <div key={s.label} className="stat-item glass-card p-4">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-sm" id="how-it-works">
        <div className="container">
          <div className="text-center mb-6">
            <div className="section-title">{lang === "hi" ? "प्रक्रिया" : "Process"}</div>
            <h2>{lang === "hi" ? "सिर्फ 4 आसान कदम" : "Just 4 Simple Steps"}</h2>
          </div>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={s.num} className="step-card glass-card p-6">
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p className="mt-2" style={{ fontSize: "0.9rem" }}>{s.desc}</p>
                {i < STEPS.length - 1 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/upload" className="btn btn-primary btn-lg">
              {lang === "hi" ? "अभी शुरू करें →" : "Start Now →"}
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-6">
            <div className="section-title">{lang === "hi" ? "विशेषताएं" : "Features"}</div>
            <h2>{lang === "hi" ? "हर दस्तावेज़ का गहरा विश्लेषण" : "Deep Analysis of Every Document"}</h2>
          </div>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card p-6 feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="mt-4 mb-2">{f.title}</h3>
                <p style={{ fontSize: "0.9rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED FORMS */}
      <section className="section-sm supported-section">
        <div className="container">
          <div className="text-center mb-6">
            <div className="section-title">{lang === "hi" ? "समर्थित" : "Supported"}</div>
            <h2>{lang === "hi" ? "किन फॉर्म को भर सकते हैं?" : "Which Forms Can Be Filled?"}</h2>
          </div>
          <div className="supported-grid">
            {SUPPORTED.map((s) => (
              <div key={s} className="supported-tag">
                <span>✓</span> {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container text-center">
          <div className="cta-box glass-card p-8">
            <h2>{lang === "hi" ? "अभी शुरू करें — बिल्कुल मुफ़्त" : "Start Now — Completely Free"}</h2>
            <p className="mt-4" style={{ maxWidth: 500, margin: "16px auto 0" }}>
              {lang === "hi"
                ? "कोई अकाउंट नहीं, कोई सब्सक्रिप्शन नहीं। बस अपलोड करें और AI को काम करने दें।"
                : "No account needed, no subscription. Just upload your documents and let AI do the work."}
            </p>
            <div className="mt-6">
              <Link href="/upload" className="btn btn-primary btn-lg">
                {lang === "hi" ? "⬆️ दस्तावेज़ अपलोड करें" : "⬆️ Upload Your Documents"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container text-center">
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            FormBharo — AI Document Parsing & Form-Filling Agent &nbsp;|&nbsp;
            All data is processed locally and never stored on any server.
          </p>
        </div>
      </footer>

      <style>{`
        .navbar { position: sticky; top: 0; z-index: 100; background: rgba(10,10,15,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-light); padding: 14px 0; }
        .navbar-inner-home { display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 8px; }
        .brand-name { font-size: 1.4rem; font-weight: 800; }

        .hero-section { padding-top: 100px; padding-bottom: 80px; }
        .hero-badge { margin-bottom: 24px; }
        .hero-title { font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 900; margin-bottom: 24px; line-height: 1.15; }
        .hero-subtitle { font-size: 1.1rem; max-width: 620px; margin: 0 auto 40px; line-height: 1.75; }
        .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 60px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .stat-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }

        .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; position: relative; }
        .step-card { position: relative; overflow: visible; }
        .step-num { font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 0.1em; margin-bottom: 12px; }
        .step-icon { font-size: 2rem; margin-bottom: 12px; }
        .step-arrow { position: absolute; right: -18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1.2rem; z-index: 2; }

        .feature-card { transition: all 0.3s; }
        .feature-icon { font-size: 2.4rem; }

        .supported-section { background: rgba(108,99,255,0.03); border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); }
        .supported-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
        .supported-tag { background: rgba(0,229,160,0.08); border: 1px solid rgba(0,229,160,0.2); color: var(--accent-green); padding: 8px 18px; border-radius: var(--radius-full); font-size: 0.9rem; display: flex; gap: 8px; align-items: center; }

        .cta-box { background: var(--gradient-card) !important; border-color: rgba(108,99,255,0.2) !important; }
        .footer { padding: 32px 0; border-top: 1px solid var(--border-light); }

        @media (max-width: 768px) {
          .hero-stats { grid-template-columns: repeat(2, 1fr); }
          .steps-grid { grid-template-columns: repeat(2, 1fr); }
          .step-arrow { display: none; }
        }
        @media (max-width: 480px) {
          .hero-stats { grid-template-columns: repeat(2, 1fr); }
          .steps-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
