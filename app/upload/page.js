"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { DOCUMENT_TYPES } from "@/lib/profileSchema";
import { defaultProfile } from "@/lib/profileSchema";

const LANG = {
  en: {
    title: "Upload Your Documents",
    subtitle: "Upload any of your official documents. AI will extract all data automatically.",
    selectType: "Select Document Type",
    drag: "Drag & drop files here, or click to browse",
    dragSub: "JPG, PNG, PDF supported • Multiple files allowed",
    uploading: "Extracting data...",
    buildProfile: "Build My Profile →",
    extracted: "fields extracted",
    success: "Extracted successfully",
    failed: "Extraction failed — please verify fields manually",
    chooseFile: "Choose File",
    docList: "Uploaded Documents",
    noDoc: "No documents uploaded yet",
    tip: "💡 Tip: Upload Aadhaar card first for best results",
  },
  hi: {
    title: "दस्तावेज़ अपलोड करें",
    subtitle: "अपने कोई भी सरकारी दस्तावेज़ अपलोड करें। AI सभी जानकारी अपने आप निकाल लेगा।",
    selectType: "दस्तावेज़ का प्रकार चुनें",
    drag: "फ़ाइलें यहाँ खींचें, या ब्राउज़ करने के लिए क्लिक करें",
    dragSub: "JPG, PNG, PDF समर्थित • एकाधिक फ़ाइलें अनुमत",
    uploading: "डेटा निकाला जा रहा है...",
    buildProfile: "प्रोफ़ाइल बनाएं →",
    extracted: "फ़ील्ड निकाले गए",
    success: "सफलतापूर्वक निकाला गया",
    failed: "निष्कर्षण विफल — कृपया मैन्युअल रूप से सत्यापित करें",
    chooseFile: "फ़ाइल चुनें",
    docList: "अपलोड किए गए दस्तावेज़",
    noDoc: "अभी तक कोई दस्तावेज़ अपलोड नहीं किया",
    tip: "💡 सुझाव: सर्वोत्तम परिणामों के लिए पहले आधार कार्ड अपलोड करें",
  },
};

function mergeProfileData(base, docType, extractedData) {
  const profile = JSON.parse(JSON.stringify(base));

  const set = (path, val) => {
    if (!val || val === "") return;
    const parts = path.split(".");
    let obj = profile;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] === undefined) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    if (!obj[parts[parts.length - 1]]) obj[parts[parts.length - 1]] = val;
  };

  const d = extractedData;
  switch (docType) {
    case "aadhaar":
      set("personal.full_name", d.full_name);
      set("personal.father_name", d.father_name);
      set("personal.dob", d.dob);
      set("personal.gender", d.gender);
      set("personal.aadhaar", d.aadhaar_number);
      set("contact.permanent_address.line1", d.address_line1);
      set("contact.permanent_address.village_town", d.village_town);
      set("contact.permanent_address.district", d.district);
      set("contact.permanent_address.state", d.state);
      set("contact.permanent_address.pincode", d.pincode);
      set("contact.mobile", d.mobile);
      break;
    case "pan":
      set("personal.full_name", d.full_name);
      set("personal.father_name", d.father_name);
      set("personal.dob", d.dob);
      set("personal.pan", d.pan_number);
      break;
    case "10th_marksheet":
    case "10th_certificate":
      if (!profile.personal.full_name) set("personal.full_name", d.student_name);
      if (!profile.personal.father_name) set("personal.father_name", d.father_name);
      if (!profile.personal.mother_name) set("personal.mother_name", d.mother_name);
      profile.education[0] = {
        ...profile.education[0],
        board: d.board_name || profile.education[0].board,
        school: d.school_name || profile.education[0].school,
        roll_no: d.roll_number || profile.education[0].roll_no,
        year_of_passing: d.year_of_passing || profile.education[0].year_of_passing,
        percentage: d.percentage || profile.education[0].percentage,
        division: d.division || profile.education[0].division,
        marks_obtained: d.total_marks_obtained || profile.education[0].marks_obtained,
        total_marks: d.total_max_marks || profile.education[0].total_marks,
        certificate_number: d.certificate_number || profile.education[0].certificate_number,
        issue_date: d.issue_date || profile.education[0].issue_date,
        subjects: d.subjects?.length ? d.subjects : profile.education[0].subjects,
      };
      break;
    case "12th_marksheet":
    case "12th_certificate":
      profile.education[1] = {
        ...profile.education[1],
        board: d.board_name || profile.education[1].board,
        school: d.school_name || profile.education[1].school,
        stream: d.stream || profile.education[1].stream,
        roll_no: d.roll_number || profile.education[1].roll_no,
        year_of_passing: d.year_of_passing || profile.education[1].year_of_passing,
        percentage: d.percentage || profile.education[1].percentage,
        division: d.division || profile.education[1].division,
        marks_obtained: d.total_marks_obtained || profile.education[1].marks_obtained,
        total_marks: d.total_max_marks || profile.education[1].total_marks,
        certificate_number: d.certificate_number || profile.education[1].certificate_number,
        issue_date: d.issue_date || profile.education[1].issue_date,
        subjects: d.subjects?.length ? d.subjects : profile.education[1].subjects,
      };
      break;
    case "graduation_certificate":
      profile.education[2] = {
        ...profile.education[2],
        university: d.university_name || profile.education[2].university,
        college: d.college_name || profile.education[2].college,
        enrollment_no: d.enrollment_number || profile.education[2].enrollment_no,
        degree: d.degree_name || profile.education[2].degree,
        branch: d.branch_specialization || profile.education[2].branch,
        year_of_passing: d.year_of_passing || profile.education[2].year_of_passing,
        percentage: d.percentage || profile.education[2].percentage,
        division: d.division_class || profile.education[2].division,
        certificate_number: d.certificate_number || profile.education[2].certificate_number,
        degree_number: d.degree_number || profile.education[2].degree_number,
        issue_date: d.issue_date || profile.education[2].issue_date,
      };
      break;
    case "category_certificate":
      set("personal.category", d.category);
      set("personal.sub_caste", d.sub_caste || d.jati_name);
      set("personal.father_name", d.father_name);
      profile.certificates.category = {
        ...profile.certificates.category,
        category_name: d.category || profile.certificates.category.category_name,
        sub_caste: d.sub_caste || d.jati_name || profile.certificates.category.sub_caste,
        certificate_number: d.certificate_number || profile.certificates.category.certificate_number,
        issue_date: d.issue_date || profile.certificates.category.issue_date,
        validity_date: d.validity_date || profile.certificates.category.validity_date,
        issuing_authority: (d.issuing_authority_name || "") + (d.issuing_authority_designation ? ", " + d.issuing_authority_designation : "") || profile.certificates.category.issuing_authority,
        issuing_office: d.issuing_office || profile.certificates.category.issuing_office,
        district: d.district || profile.certificates.category.district,
        state: d.state || profile.certificates.category.state,
      };
      break;
    case "domicile_certificate":
      profile.certificates.domicile = {
        ...profile.certificates.domicile,
        certificate_number: d.certificate_number || profile.certificates.domicile.certificate_number,
        issue_date: d.issue_date || profile.certificates.domicile.issue_date,
        validity_date: d.validity_date || profile.certificates.domicile.validity_date,
        issuing_authority: d.issuing_authority_name || profile.certificates.domicile.issuing_authority,
        issuing_office: d.issuing_office || profile.certificates.domicile.issuing_office,
        district: d.district || profile.certificates.domicile.district,
        state: d.state || profile.certificates.domicile.state,
      };
      break;
    case "income_certificate":
      profile.certificates.income = {
        ...profile.certificates.income,
        annual_income: d.annual_income || profile.certificates.income.annual_income,
        annual_income_words: d.annual_income_words || profile.certificates.income.annual_income_words,
        certificate_number: d.certificate_number || profile.certificates.income.certificate_number,
        issue_date: d.issue_date || profile.certificates.income.issue_date,
        issuing_authority: d.issuing_authority_name || profile.certificates.income.issuing_authority,
        district: d.district || profile.certificates.income.district,
        state: d.state || profile.certificates.income.state,
      };
      break;
    case "photo":
      profile.documents.photo.original_path = extractedData._filePath || "";
      break;
    case "signature":
      profile.documents.signature.original_path = extractedData._filePath || "";
      break;
    default:
      profile.certificates.other.push({ docType, ...d });
  }
  profile._meta.updated_at = new Date().toISOString();
  return profile;
}

export default function UploadPage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const [selectedDocType, setSelectedDocType] = useState("aadhaar");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [profile, setProfile] = useState(null); // Lazy init
  const fileInputRef = useRef(null);

  const getProfile = () => {
    if (typeof window === "undefined") return defaultProfile();
    try {
      const saved = localStorage.getItem("formBharoProfiles");
      const activeId = localStorage.getItem("formBharoActiveProfileId");
      if (saved && activeId) {
        const profiles = JSON.parse(saved);
        if (Array.isArray(profiles)) {
          const active = profiles.find(p => p.id === activeId);
          if (active) return active.data;
        }
      }
      const legacy = localStorage.getItem("formBharoProfile");
      return legacy ? JSON.parse(legacy) : defaultProfile();
    } catch { return defaultProfile(); }
  };

  const saveProfile = (updatedData) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("formBharoProfiles");
      const activeId = localStorage.getItem("formBharoActiveProfileId");
      if (saved && activeId) {
        const profiles = JSON.parse(saved);
        const updatedProfiles = profiles.map(p => 
          p.id === activeId ? { ...p, data: updatedData } : p
        );
        localStorage.setItem("formBharoProfiles", JSON.stringify(updatedProfiles));
      } else {
        localStorage.setItem("formBharoProfile", JSON.stringify(updatedData));
      }
    }
  };

  const handleFiles = useCallback(async (files) => {
    const fileArr = Array.from(files);
    if (!fileArr.length) return;

    for (const file of fileArr) {
      setIsExtracting(true);
      const docId = Date.now() + Math.random();
      const pendingDoc = {
        id: docId,
        docType: selectedDocType,
        fileName: file.name,
        fileSize: file.size,
        status: "extracting",
        fieldCount: 0,
        data: {},
        filePath: null,
      };
      setUploadedDocs((prev) => [...prev, pendingDoc]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (selectedDocType) {
          formData.append("hintDocType", selectedDocType);
        }

        // 1. Get backend URL to bypass Vercel 10s timeout
        const cfgRes = await fetch("/api/config");
        const cfg = await cfgRes.json();
        
        // 2. Fetch directly from Python API
        const res = await fetch(`${cfg.backendUrl}/api/scan-document`, { 
          method: "POST", 
          body: formData 
        });
        
        // 3. Convert file to Base64 in parallel for saving to profile
        // This solves the Cloud Filesystem problem where Python on Render can't read Vercel's disk.
        const reader = new FileReader();
        const base64Promise = new Promise(resolve => {
           reader.onload = () => resolve(reader.result);
           reader.readAsDataURL(file);
        });
        const base64data = await base64Promise;

        let result;
        const textRes = await res.text();
        try {
          result = JSON.parse(textRes);
        } catch (e) {
          const is404 = res.status === 404;
          const wakeUpMsg = "AI Engine is waking up (takes ~50s on free tier). Please try uploading again.";
          const notFoundMsg = `Backend endpoint /api/scan-document not found at ${cfg.backendUrl}. Check if your Python backend is running on port 8000.`;
          
          let errorMsg = `Server error (${res.status}): `;
          if (res.status === 504 || res.status === 502) errorMsg += wakeUpMsg;
          else if (is404) errorMsg += notFoundMsg;
          else errorMsg += textRes.substring(0, 100) || "Unknown error";
          
          throw new Error(errorMsg);
        }

        if (!res.ok || result.success === false) {
           throw new Error(result.error || `Server responded with status ${res.status}`);
        }
        
        // Use the Base64 string as the filePath so the Python bot has the raw image data later.
        result.filePath = base64data;

        // Special handling for photo/signature
        if (selectedDocType === "photo" || selectedDocType === "signature") {
          const currentProfile = getProfile();
          if (selectedDocType === "photo") {
            currentProfile.documents.photo.original_path = result.filePath || "";
            currentProfile.documents.photo.size_kb = Math.round(file.size / 1024).toString();
          } else {
            currentProfile.documents.signature.original_path = result.filePath || "";
            currentProfile.documents.signature.size_kb = Math.round(file.size / 1024).toString();
          }
          saveProfile(currentProfile);
          setUploadedDocs((prev) =>
            prev.map((d) =>
              d.id === docId ? { ...d, status: "saved", filePath: result.filePath, fieldCount: 0 } : d
            )
          );
          setIsExtracting(false);
          continue;
        }

        if (result.success) {
          const currentProfile = getProfile();

          // Update the file path in the profile for auto-fill usage
          const dt = selectedDocType;
          if (dt === "aadhaar") currentProfile.documents.files.aadhaar = result.filePath;
          else if (dt === "pan") currentProfile.documents.files.pan = result.filePath;
          else if (currentProfile.documents.files[dt] !== undefined) {
             currentProfile.documents.files[dt] = result.filePath;
          }

          const merged = mergeProfileData(currentProfile, selectedDocType, {
            ...result.data,
            _filePath: result.filePath,
          });
          saveProfile(merged);

          setUploadedDocs((prev) =>
            prev.map((d) =>
              d.id === docId
                ? {
                    ...d,
                    status: "done",
                    fieldCount: result.fieldCount || 0,
                    data: result.data,
                    filePath: result.filePath,
                    confidence: result.confidence,
                  }
                : d
            )
          );
        } else {
          setUploadedDocs((prev) =>
            prev.map((d) =>
              d.id === docId ? { ...d, status: "error", error: result.error } : d
            )
          );
        }
      } catch (err) {
        setUploadedDocs((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, status: "error", error: err.message } : d
          )
        );
      }
      setIsExtracting(false);
    }
  }, [selectedDocType]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => handleFiles(e.target.files);

  const removeDoc = (id) => setUploadedDocs((prev) => prev.filter((d) => d.id !== id));

  const handleBuildProfile = () => {
    router.push("/profile");
  };

  const docTypeInfo = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);

  return (
    <div className="page-wrapper">
      <Navbar lang={lang} setLang={setLang} currentStep={1} />

      <div className="container section-sm">
        <div className="text-center mb-6">
          <div className="section-title">Step 1 of 4</div>
          <h1>{t.title}</h1>
          <p className="mt-4" style={{ maxWidth: 560, margin: "16px auto 0" }}>{t.subtitle}</p>
        </div>

        <div className="upload-layout">
          {/* LEFT: uploader */}
          <div className="upload-left">
            {/* Doc type selector */}
            <div className="glass-card p-6 mb-4">
              <label className="form-label mb-2 flex gap-2 items-center">
                <span>📂</span> {t.selectType}
              </label>
              <select
                className="form-select"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.icon} {dt.label}
                  </option>
                ))}
              </select>
              <div className="mt-3 tip-box">
                💡 Selected: <strong>{docTypeInfo?.label}</strong>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`drop-zone ${isDragging ? "active" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-icon">
                {isExtracting ? <div className="spinner" style={{ margin: "0 auto" }}></div> : "⬆️"}
              </div>
              <div className="drop-text">
                {isExtracting ? t.uploading : t.drag}
              </div>
              <div className="drop-sub">{t.dragSub}</div>
              <button className="btn btn-secondary btn-sm mt-4" type="button" disabled={isExtracting}>
                {t.chooseFile}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                style={{ display: "none" }}
                onChange={handleInputChange}
              />
            </div>

            <div className="tip-text mt-4">{t.tip}</div>
          </div>

          {/* RIGHT: uploaded docs list */}
          <div className="upload-right">
            <h3 className="mb-4" style={{ fontSize: "1rem" }}>{t.docList}</h3>

            {uploadedDocs.length === 0 ? (
              <div className="empty-docs glass-card p-6 text-center">
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📁</div>
                <p style={{ fontSize: "0.9rem" }}>{t.noDoc}</p>
              </div>
            ) : (
              <div className="doc-list">
                {uploadedDocs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} t={t} onRemove={() => removeDoc(doc.id)} />
                ))}
              </div>
            )}

            {uploadedDocs.some((d) => d.status === "done" || d.status === "saved") && (
              <div className="mt-6">
                <button className="btn btn-primary w-full" onClick={handleBuildProfile}>
                  {t.buildProfile}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .upload-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
        .upload-left { display: flex; flex-direction: column; gap: 16px; }
        .upload-right {}
        .drop-icon { font-size: 2.5rem; margin-bottom: 12px; text-align: center; }
        .drop-text { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
        .drop-sub { font-size: 0.83rem; color: var(--text-muted); margin-top: 6px; }
        .tip-box { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.15); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.85rem; color: var(--text-secondary); }
        .tip-text { font-size: 0.85rem; color: var(--text-muted); text-align: center; }
        .doc-list { display: flex; flex-direction: column; gap: 12px; }
        .empty-docs { opacity: 0.7; }
        @media (max-width: 768px) { .upload-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function DocCard({ doc, t, onRemove }) {
  const statusIcon = doc.status === "extracting" ? "⏳"
    : doc.status === "done" ? "✅"
    : doc.status === "saved" ? "💾"
    : doc.status === "error" ? "❌" : "📄";

  const statusClass = doc.status === "done" || doc.status === "saved" ? "badge-green"
    : doc.status === "error" ? "badge-red"
    : "badge-blue";

  const docTypeInfo = DOCUMENT_TYPES.find((d) => d.id === doc.docType);

  return (
    <div className="doc-card glass-card p-4">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          <div className="doc-icon">{docTypeInfo?.icon || "📄"}</div>
          <div style={{ minWidth: 0 }}>
            <div className="doc-name truncate">{doc.fileName}</div>
            <div className="doc-meta">
              {docTypeInfo?.label} • {Math.round(doc.fileSize / 1024)} KB
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRemove}
          style={{ padding: "4px 8px", flexShrink: 0 }}
          title="Remove"
        >✕</button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="badge">{statusIcon}</span>
        <span className={`badge ${statusClass}`} style={{ fontSize: "0.78rem" }}>
          {doc.status === "done" ? `${doc.fieldCount} ${t.extracted}`
            : doc.status === "saved" ? t.success
            : doc.status === "error" ? t.failed
            : doc.status === "extracting" ? t.uploading : "Queued"}
        </span>
      </div>
      {doc.status === "error" && doc.error && (
        <div className="doc-error">{doc.error}</div>
      )}
      
      {doc.status === "done" && doc.data && (
        <div className="mt-3 deep-scan-results text-xs p-2 rounded bg-opacity-50 text-[var(--text-secondary)]" style={{ background: "rgba(108,99,255,0.05)", border: "1px solid rgba(108,99,255,0.1)" }}>
          <div className="font-semibold mb-1 text-[var(--text-primary)]">Scanned Details:</div>
          {doc.data.student_name && <div>• Name: {doc.data.student_name}</div>}
          {doc.data.full_name && <div>• Name: {doc.data.full_name}</div>}
          {doc.data.roll_number && <div>• Roll No: {doc.data.roll_number}</div>}
          {doc.data.certificate_number && <div>• Cert No: {doc.data.certificate_number}</div>}
          {doc.data.board_name && <div className="truncate">• Board: {doc.data.board_name}</div>}
          {doc.data.category && <div>• Category: {doc.data.category}</div>}
          {doc.data.issuing_authority_name && <div className="truncate">• Authority: {doc.data.issuing_authority_name}</div>}
          {doc.data.issuing_authority && <div className="truncate">• Authority: {doc.data.issuing_authority}</div>}
          {doc.data.subjects && Array.isArray(doc.data.subjects) && <div>• Found {doc.data.subjects.length} Subjects/Marks</div>}
        </div>
      )}

      {doc.status === "done" && doc.confidence === "low" && (
        <div className="doc-warn">⚠️ Low confidence — please verify on Profile page</div>
      )}
    </div>
  );
}
