"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Navbar = ({ lang, setLang, currentStep }) => {
  const router = useRouter();

  const HINDI = {
    brand: "FormBharo",
    upload: "दस्तावेज़",
    profile: "प्रोफ़ाइल",
    fill: "भरें",
  };

  const ENGLISH = {
    brand: "FormBharo",
    upload: "Documents",
    profile: "Profile",
    fill: "Fill",
  };

  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("formBharoProfiles");
      const activeId = localStorage.getItem("formBharoActiveProfileId");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
          if (activeId) {
            setActiveProfile(parsed.find(p => p.id === activeId) || parsed[0]);
          } else {
            setActiveProfile(parsed[0]);
          }
        }
      }
    } catch (e) { console.error("Navbar profile sync error:", e); }
  }, []);

  const switchProfile = (id) => {
    localStorage.setItem("formBharoActiveProfileId", id);
    window.location.reload(); // Simple sync
  };

  const t = lang === "hi" ? HINDI : ENGLISH;

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link href="/" className="navbar-brand">
          <div className="logo-wrapper">
            <Image 
              src="/logo.png" 
              alt="FormBharo Logo" 
              width={32} 
              height={32} 
              className="logo-img"
            />
            <div className="logo-glow"></div>
          </div>
          <span className="brand-text">Form<span className="text-gradient">Bharo</span></span>
        </Link>

        {currentStep > 0 && (
          <nav className="navbar-steps">
            <div className={`nav-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`}>
              <span className="step-num">1</span>
              <span className="step-txt">{t.upload}</span>
            </div>
            <div className="nav-step-divider"></div>
            <div className={`nav-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'done' : ''}`}>
              <span className="step-num">2</span>
              <span className="step-txt">{t.profile}</span>
            </div>
            <div className="nav-step-divider"></div>
            <div className={`nav-step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'done' : ''}`}>
              <span className="step-num">3</span>
              <span className="step-txt">{t.fill}</span>
            </div>
          </nav>
        )}

        <div className="navbar-actions">
          {profiles.length > 0 && (
            <div className="profile-switcher">
              <span className="label">Client:</span>
              <select 
                className="switcher-select"
                value={activeProfile?.id || ""} 
                onChange={(e) => switchProfile(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Link href="/profiles" className="manage-link">Manage All</Link>
            </div>
          )}

          <button 
            className="lang-toggle"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            suppressHydrationWarning
          >
            {lang === "en" ? "🇮🇳 Hindi" : "🇬🇧 English"}
          </button>
          
          <Link href="/profile" className="btn btn-secondary btn-sm" suppressHydrationWarning>
            Edit Profile
          </Link>
        </div>
      </div>

      <style jsx>{`
        .navbar-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.7);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 0;
        }
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .logo-wrapper {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .logo-img {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 0 8px rgba(108, 99, 255, 0.5));
        }
        .logo-glow {
          position: absolute;
          inset: -4px;
          background: var(--gradient-primary);
          border-radius: 50%;
          filter: blur(10px);
          opacity: 0.4;
          z-index: 1;
        }
        .brand-text {
          font-size: 1.4rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }
        .navbar-steps {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }
        .nav-step-item.active { opacity: 1; }
        .nav-step-item.done { opacity: 0.8; color: var(--accent-green); }
        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .step-txt { font-size: 0.85rem; font-weight: 600; }
        .nav-step-divider { width: 24px; height: 1px; background: rgba(255,255,255,0.1); }
        .navbar-actions { display: flex; align-items: center; gap: 16px; }
        
        .profile-switcher { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
        .profile-switcher .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; }
        .switcher-select { background: transparent; border: none; color: #6c63ff; font-weight: 700; font-size: 0.85rem; outline: none; cursor: pointer; }
        .switcher-select option { background: #0a0a0f; color: white; }
        .manage-link { font-size: 0.7rem; color: var(--text-muted); text-decoration: none; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 8px; }
        .manage-link:hover { color: white; }

        .lang-toggle {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }
        .lang-toggle:hover { color: white; }
        @media (max-width: 900px) { 
          .navbar-steps { display: none; }
          .profile-switcher .label, .manage-link { display: none; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
