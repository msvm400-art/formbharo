"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PhotoEditor from "@/components/PhotoEditor";
import { defaultProfile } from "@/lib/profileSchema";

const SECTIONS = [
  { key: "personal", label: "👤 Personal Information", fields: [
    ["full_name","Full Name"],["father_name","Father's Name"],["mother_name","Mother's Name"],
    ["dob","Date of Birth"],["gender","Gender"],["category","Category"],["sub_caste","Sub-Caste / Jati"],
    ["religion","Religion"],["nationality","Nationality"],["marital_status","Marital Status"],
    ["aadhaar","Aadhaar Number"],["pan","PAN Number"],
  ]},
  { key: "contact", label: "📱 Contact", fields: [
    ["mobile","Mobile Number"],["alternate_mobile","Alternate Mobile"],["email","Email Address"],
  ]},
  { key: "address", label: "🏠 Permanent Address", fields: [
    ["line1","House / Flat No."],["village_town","Village / Town"],["post_office","Post Office"],
    ["tehsil","Tehsil / Block"],["city","City"],["district","District"],["state","State"],["pincode","PIN Code"],
  ]},
];

const EDU_LEVELS = [
  { idx: 0, label: "📄 10th Class", fields: [
    ["board","Board Name"],["school","School Name"],["school_code","School Code"],
    ["roll_no","Roll Number"],["year_of_passing","Year of Passing"],
    ["percentage","Percentage"],["cgpa","CGPA"],["division","Division"],
    ["marks_obtained","Marks Obtained"],["total_marks","Total Marks"],
    ["certificate_number","Certificate Number"],["issue_date","Issue Date"],
  ]},
  { idx: 1, label: "📄 12th Class", fields: [
    ["board","Board Name"],["school","School / College Name"],["stream","Stream"],
    ["roll_no","Roll Number"],["year_of_passing","Year of Passing"],
    ["percentage","Percentage"],["cgpa","CGPA"],["division","Division"],
    ["marks_obtained","Marks Obtained"],["total_marks","Total Marks"],
    ["certificate_number","Certificate Number"],["issue_date","Issue Date"],
  ]},
  { idx: 2, label: "🎓 Graduation", fields: [
    ["university","University Name"],["college","College Name"],["enrollment_no","Enrollment No."],
    ["degree","Degree"],["branch","Branch / Specialization"],
    ["year_of_passing","Year of Passing"],["percentage","Percentage"],["cgpa","CGPA"],["division","Division"],
    ["certificate_number","Certificate Number"],["degree_number","Degree Number"],["issue_date","Issue Date"],
  ]},
];

const CERT_SECTIONS = [
  { key: "category", label: "📋 Category / Caste Certificate", fields: [
    ["category_name","Category"],["sub_caste","Sub-Caste"],
    ["certificate_number","Certificate Number ⚡"],["issue_date","Issue Date ⚡"],
    ["validity_date","Validity Date"],["issuing_authority","Issuing Authority"],
    ["issuing_office","Issuing Office"],["district","District"],["state","State"],
  ]},
  { key: "domicile", label: "🏠 Domicile Certificate", fields: [
    ["certificate_number","Certificate Number ⚡"],["issue_date","Issue Date ⚡"],
    ["validity_date","Validity Date"],["issuing_authority","Issuing Authority"],
    ["issuing_office","Issuing Office"],["district","District"],["state","State"],
  ]},
  { key: "income", label: "💰 Income Certificate", fields: [
    ["annual_income","Annual Income (Figures)"],["annual_income_words","Annual Income (Words)"],
    ["certificate_number","Certificate Number ⚡"],["issue_date","Issue Date ⚡"],
    ["issuing_authority","Issuing Authority"],["issuing_office","Issuing Office"],
    ["district","District"],["state","State"],
  ]},
];

function ValueField({ label, value, onChange }) {
  const isEmpty = !value || value === "";
  return (
    <div className="profile-field">
      <div className="profile-label">{label}</div>
      <input
        className={`form-input ${isEmpty ? "field-empty" : "field-filled"}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Not extracted — enter manually"
      />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

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
      // Fallback
      const p = localStorage.getItem("formBharoProfile");
      setProfile(p ? JSON.parse(p) : defaultProfile());
    } catch { setProfile(defaultProfile()); }
  }, []);

  const saveProfile = (updatedData) => {
    const saved = localStorage.getItem("formBharoProfiles");
    const activeId = localStorage.getItem("formBharoActiveProfileId");
    
    if (saved && activeId) {
      const profiles = JSON.parse(saved);
      const updatedProfiles = profiles.map(p => 
        p.id === activeId ? { ...p, data: updatedData } : p
      );
      localStorage.setItem("formBharoProfiles", JSON.stringify(updatedProfiles));
    } else {
      // Legacy fallback
      localStorage.setItem("formBharoProfile", JSON.stringify(updatedData));
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updatePersonal = (key, val) => {
    const p = { ...profile, personal: { ...profile.personal, [key]: val } };
    setProfile(p); saveProfile(p);
  };

  const updateContact = (key, val) => {
    const p = { ...profile, contact: { ...profile.contact, [key]: val } };
    setProfile(p); saveProfile(p);
  };

  const updateAddress = (key, val) => {
    const p = { ...profile, contact: { ...profile.contact, permanent_address: { ...profile.contact.permanent_address, [key]: val } } };
    setProfile(p); saveProfile(p);
  };

  const updateEdu = (idx, key, val) => {
    const edu = [...profile.education];
    edu[idx] = { ...edu[idx], [key]: val };
    const p = { ...profile, education: edu };
    setProfile(p); saveProfile(p);
  };

  const updateCert = (certKey, field, val) => {
    const p = { ...profile, certificates: { ...profile.certificates, [certKey]: { ...profile.certificates[certKey], [field]: val } } };
    setProfile(p); saveProfile(p);
  };

  if (!profile) return (
    <div className="page-wrapper">
      <div className="text-center p-8">
        <div className="spinner" style={{ margin: "0 auto" }}></div>
        <p className="mt-4">Loading profile...</p>
      </div>
    </div>
  );

  // Count filled fields
  const countFilled = (obj) => Object.values(obj).filter(v => v && v !== "" && typeof v !== "object").length;
  const totalPersonal = countFilled(profile.personal);
  const totalCertNumbers = [
    profile.certificates.category.certificate_number,
    profile.certificates.domicile.certificate_number,
    profile.certificates.income.certificate_number,
  ].filter(Boolean).length;

  const TABS = [
    { id: "personal", label: "Personal" },
    { id: "education", label: "Education" },
    { id: "certificates", label: "Certificates" },
  ];

  return (
    <div className="page-wrapper">
      <Navbar lang={lang} setLang={setLang} currentStep={2} />

      <div className="container section-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="section-title">Step 2 of 4</div>
            <h1 style={{ fontSize: "1.8rem" }}>Your Extracted Profile</h1>
            <p className="mt-1" style={{ fontSize: "0.9rem" }}>
              Review and edit any field. Changes are saved automatically.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {saved && <span className="badge badge-green">✓ Saved</span>}
            <div className="profile-stats">
              <span className="badge badge-purple">{totalPersonal} personal fields</span>
              <span className="badge badge-green">{totalCertNumbers}/3 cert numbers</span>
            </div>
            <button className="btn btn-primary" onClick={() => router.push("/fill")}>
              Fill a Form →
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs mb-6">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* PERSONAL TAB */}
        {activeTab === "personal" && (
          <div className="profile-sections">
            {SECTIONS.map(sec => (
              <div key={sec.key} className="glass-card p-6 mb-4">
                <h3 className="mb-4" style={{ fontSize: "1rem" }}>{sec.label}</h3>
                <div className="profile-grid">
                  {sec.fields.map(([key, label]) => (
                    <ValueField
                      key={key}
                      label={label}
                      value={sec.key === "personal" ? profile.personal[key] : sec.key === "contact" ? profile.contact[key] : profile.contact.permanent_address[key]}
                      onChange={(v) => sec.key === "personal" ? updatePersonal(key, v) : sec.key === "contact" ? updateContact(key, v) : updateAddress(key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === "education" && (
          <div>
            {EDU_LEVELS.map(level => (
              <div key={level.idx} className="glass-card p-6 mb-4">
                <h3 className="mb-4" style={{ fontSize: "1rem" }}>{level.label}</h3>
                <div className="profile-grid">
                  {level.fields.map(([key, label]) => (
                    <ValueField
                      key={key}
                      label={label}
                      value={profile.education[level.idx][key]}
                      onChange={(v) => updateEdu(level.idx, key, v)}
                    />
                  ))}
                </div>
                {/* Subjects table */}
                {profile.education[level.idx].subjects?.length > 0 && (
                  <div className="mt-4 overflow-auto">
                    <div className="section-title mb-2">Subjects</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Subject</th><th>Marks Obtained</th><th>Max Marks</th><th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.education[level.idx].subjects.map((s, si) => (
                          <tr key={si}>
                            <td>{s.name}</td>
                            <td>{s.marks_obtained}</td>
                            <td>{s.max_marks}</td>
                            <td>{s.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CERTIFICATES TAB */}
        {activeTab === "certificates" && (
          <div>
            {CERT_SECTIONS.map(cert => (
              <div key={cert.key} className="glass-card p-6 mb-4">
                <h3 className="mb-4 flex items-center gap-2" style={{ fontSize: "1rem" }}>
                  {cert.label}
                  {profile.certificates[cert.key]?.certificate_number && (
                    <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>✓ Cert No. Found</span>
                  )}
                </h3>
                <div className="profile-grid">
                  {cert.fields.map(([key, label]) => (
                    <ValueField
                      key={key}
                      label={label}
                      value={profile.certificates[cert.key]?.[key] || ""}
                      onChange={(v) => updateCert(cert.key, key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Documents section */}
            <div className="glass-card p-6">
              <h3 className="mb-4" style={{ fontSize: "1rem" }}>📎 Uploaded Files</h3>
              <div className="profile-grid">
                {[
                  ["photo", "Applicant Photo", profile.documents.photo.original_path],
                  ["signature", "Applicant Signature", profile.documents.signature.original_path],
                ].map(([key, label, path]) => (
                  <div key={key} className="profile-field">
                    <div className="profile-label">{label}</div>
                    {path ? (
                      <div className="flex flex-col gap-3">
                        <div className="file-preview">
                          <img src={path} alt={label} style={{ maxHeight: 80, maxWidth: 120, borderRadius: 6, border: "1px solid var(--border-glass)" }} />
                          <span className="badge badge-green ml-2">Uploaded</span>
                        </div>
                        <PhotoEditor
                          src={path}
                          type={key}
                          onSave={(newSrc) => {
                            const p = { ...profile };
                            p.documents[key].original_path = newSrc;
                            setProfile(p);
                            saveProfile(p);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="badge badge-red">Not uploaded</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-between mt-6 flex-wrap">
          <button className="btn btn-secondary" onClick={() => router.push("/upload")}>
            ← Upload More Documents
          </button>
          <button className="btn btn-primary" onClick={() => router.push("/fill")}>
            Fill a Form →
          </button>
        </div>
      </div>

      <style>{`
        .profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .profile-field { display: flex; flex-direction: column; gap: 5px; }
        .profile-label { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
        .field-empty { border-color: rgba(255,92,117,0.3) !important; }
        .field-filled { border-color: rgba(0,229,160,0.2) !important; }
        .profile-stats { display: flex; gap: 8px; flex-wrap: wrap; }
        .file-preview { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border-glass); }
        @media (max-width: 600px) { .profile-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
