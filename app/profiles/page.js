"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { defaultProfile } from "@/lib/profileSchema";
import { v4 as uuidv4 } from "uuid";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    try {
      const savedProfiles = localStorage.getItem("formBharoProfiles");
      const active = localStorage.getItem("formBharoActiveProfileId");
  
      if (savedProfiles) {
        const parsed = JSON.parse(savedProfiles);
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
        } else {
          throw new Error("Profiles not an array");
        }
      } else {
        // Migrate old single profile if exists
        const oldProfile = localStorage.getItem("formBharoProfile");
        const initialProfile = {
          id: uuidv4(),
          name: "Default Profile",
          data: oldProfile ? JSON.parse(oldProfile) : defaultProfile()
        };
        const newProfiles = [initialProfile];
        setProfiles(newProfiles);
        localStorage.setItem("formBharoProfiles", JSON.stringify(newProfiles));
        localStorage.setItem("formBharoActiveProfileId", initialProfile.id);
      }
  
      if (active) setActiveId(active);
    } catch (e) {
      console.error("Profiles migration error:", e);
      // Recovery: start fresh if corrupted
      const freshProfile = { id: uuidv4(), name: "Default Profile", data: defaultProfile() };
      setProfiles([freshProfile]);
      setActiveId(freshProfile.id);
    }
  }, []);

  const saveProfiles = (newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem("formBharoProfiles", JSON.stringify(newProfiles));
  };

  const addProfile = () => {
    const newProfile = {
      id: uuidv4(),
      name: `Client ${profiles.length + 1}`,
      data: defaultProfile()
    };
    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    setActiveId(newProfile.id);
    localStorage.setItem("formBharoActiveProfileId", newProfile.id);
  };

  const deleteProfile = (id) => {
    if (profiles.length === 1) return alert("You must have at least one profile.");
    const updated = profiles.filter(p => p.id !== id);
    saveProfiles(updated);
    if (activeId === id) {
      setActiveId(updated[0].id);
      localStorage.setItem("formBharoActiveProfileId", updated[0].id);
    }
  };

  const switchProfile = (id) => {
    setActiveId(id);
    localStorage.setItem("formBharoActiveProfileId", id);
  };

  const renameProfile = (id, newName) => {
    const updated = profiles.map(p => p.id === id ? { ...p, name: newName } : p);
    saveProfiles(updated);
  };

  return (
    <div className="page-wrapper">
      <Navbar lang="en" />

      <div className="container section">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800 }}>Clients & Profiles</h1>
            <p className="text-muted">Manage multiple client profiles for quick form filling.</p>
          </div>
          <button className="btn btn-primary" onClick={addProfile}>
            ➕ Add New Client
          </button>
        </div>

        <div className="profiles-grid">
          {profiles.map(profile => (
            <div key={profile.id} className={`profile-card glass-card p-6 ${activeId === profile.id ? 'active' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="profile-info">
                  <input
                    className="profile-name-input"
                    value={profile.name}
                    onChange={(e) => renameProfile(profile.id, e.target.value)}
                  />
                  <div className="text-xs opacity-50 mt-1">ID: {profile.id.substring(0, 8)}</div>
                </div>
                {activeId === profile.id && <span className="badge badge-green">ACTIVE</span>}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  className={`btn flex-1 ${activeId === profile.id ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => switchProfile(profile.id)}
                >
                  {activeId === profile.id ? 'Selected' : 'Select'}
                </button>
                <a href="/profile" className="btn btn-secondary">⚙️ Edit Data</a>
                <button className="btn btn-red-icon" onClick={() => deleteProfile(profile.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .profiles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .profile-card { border: 1px solid var(--border-glass); transition: all 0.3s ease; }
        .profile-card.active { border-color: var(--accent-primary); box-shadow: 0 0 20px rgba(108,99,255,0.2); background: rgba(108,99,255,0.05); }
        .profile-name-input { background: transparent; border: none; font-size: 1.2rem; font-weight: 700; color: white; width: 100%; outline: none; border-bottom: 1px solid transparent; }
        .profile-name-input:focus { border-bottom-color: var(--accent-primary); }
        .btn-red-icon { background: rgba(255, 92, 117, 0.1); border: 1px solid rgba(255, 92, 117, 0.2); padding: 8px 12px; border-radius: 8px; font-size: 1rem; }
        .btn-red-icon:hover { background: rgba(255, 92, 117, 0.3); border-color: #ff5c75; }
        .badge-green { background: rgba(0, 229, 160, 0.2); color: #00e5a0; border: 1px solid rgba(0, 229, 160, 0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; }
        .btn-outline { border: 1px solid var(--border-glass); background: transparent; }
        .btn-outline:hover { background: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
}
