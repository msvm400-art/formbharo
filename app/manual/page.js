"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { runDocumentScannerAgent } from "@/lib/agents/documentScannerAgent";
import { defaultProfile, DOCUMENT_TYPES } from "@/lib/profileSchema";

const WIZARD_STEPS = [
  { id: "identity", label: "Identity & Personal", docTypes: ["aadhaar", "pan"] },
  { id: "10th", label: "10th Details", docTypes: ["10th_marksheet"] },
  { id: "12th", label: "12th Details", docTypes: ["12th_marksheet"] },
  { id: "grad", label: "Graduation Details", docTypes: ["graduation_certificate"] },
  { id: "certs", label: "Certificates", docTypes: ["category_certificate", "income_certificate", "domicile_certificate"] },
  { id: "media", label: "Photo & Signature", docTypes: ["photo", "signature"] },
];

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
      if (!profile.personal.father_name) set("personal.father_name", d.father_name || d.full_name);
      if (!profile.personal.mother_name) set("personal.mother_name", d.mother_name);
      profile.education[0] = {
        ...profile.education[0],
        board: d.board_name || profile.education[0].board,
        board_type: d.board_type || profile.education[0].board_type,
        school: d.school_name || profile.education[0].school,
        roll_no: d.roll_number || profile.education[0].roll_no,
        month_of_passing: d.month_of_passing || profile.education[0].month_of_passing,
        year_of_passing: d.year_of_passing || profile.education[0].year_of_passing,
        percentage: d.percentage || profile.education[0].percentage,
        cgpa: d.cgpa || profile.education[0].cgpa,
        division: d.division || profile.education[0].division,
        marks_obtained: d.total_marks_obtained || profile.education[0].marks_obtained,
        total_marks: d.total_max_marks || profile.education[0].total_marks,
        certificate_number: d.certificate_number || profile.education[0].certificate_number,
        issue_date: d.issue_date || profile.education[0].issue_date,
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
        certificate_number: d.certificate_number || profile.education[1].certificate_number,
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
      };
      break;
    case "category_certificate":
      set("personal.category", d.category);
      set("personal.sub_caste", d.sub_caste || d.jati_name);
      profile.certificates.category = {
        ...profile.certificates.category,
        category_name: d.category || profile.certificates.category.category_name,
        sub_caste: d.sub_caste || d.jati_name || profile.certificates.category.sub_caste,
        certificate_number: d.certificate_number || profile.certificates.category.certificate_number,
        issue_date: d.issue_date || profile.certificates.category.issue_date,
        issuing_authority: d.issuing_authority_name || profile.certificates.category.issuing_authority,
        district: d.district || profile.certificates.category.district,
        state: d.state || profile.certificates.category.state,
      };
      break;
    case "domicile_certificate":
      profile.certificates.domicile = {
        ...profile.certificates.domicile,
        certificate_number: d.certificate_number || profile.certificates.domicile.certificate_number,
        issue_date: d.issue_date || profile.certificates.domicile.issue_date,
        issuing_authority: d.issuing_authority_name || profile.certificates.domicile.issuing_authority,
        district: d.district || profile.certificates.domicile.district,
        state: d.state || profile.certificates.domicile.state,
      };
      break;
    case "income_certificate":
      profile.certificates.income = {
        ...profile.certificates.income,
        annual_income: d.annual_income || profile.certificates.income.annual_income,
        certificate_number: d.certificate_number || profile.certificates.income.certificate_number,
        issue_date: d.issue_date || profile.certificates.income.issue_date,
      };
      break;
    case "photo":
      profile.documents.photo.original_path = extractedData._filePath || "";
      break;
    case "signature":
      profile.documents.signature.original_path = extractedData._filePath || "";
      break;
  }
  return profile;
}

export default function ManualProfileBuilder() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [profile, setProfile] = useState(defaultProfile());
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loadingType, setLoadingType] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedUploadType, setSelectedUploadType] = useState("");

  // Load existing profile once
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
      const legacy = localStorage.getItem("formBharoProfile");
      if (legacy) setProfile(JSON.parse(legacy));
    } catch {}
  }, []);

  const saveProfile = (newProfile) => {
    localStorage.setItem("formBharoProfile", JSON.stringify(newProfile));
    
    const saved = localStorage.getItem("formBharoProfiles");
    const activeId = localStorage.getItem("formBharoActiveProfileId");
    if (saved && activeId) {
      const profiles = JSON.parse(saved);
      const updatedProfiles = profiles.map(p => 
        p.id === activeId ? { ...p, data: newProfile } : p
      );
      localStorage.setItem("formBharoProfiles", JSON.stringify(updatedProfiles));
    }
  };

  const handleManualChange = (section, path, value) => {
    const p = { ...profile };
    // Simple deep set for manual
    let obj = p[section];
    const parts = path.split(".");
    for(let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    
    setProfile(p);
    saveProfile(p);
  };

  const updateEdu = (idx, key, val) => {
    const p = { ...profile };
    p.education[idx][key] = val;
    setProfile(p);
    saveProfile(p);
  };

  const handleUploadClick = (docId) => {
    setSelectedUploadType(docId);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUploadType) return;
    
    setLoadingType(selectedUploadType);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise(resolve => {
         reader.onload = () => resolve(reader.result.split(',')[1]); 
         reader.readAsDataURL(file);
      });
      const base64data = await base64Promise;
      
      const result = await runDocumentScannerAgent(base64data, file.type, selectedUploadType);
      
      if (result.success || selectedUploadType === "photo" || selectedUploadType === "signature") {
          const filePath = `data:${file.type};base64,${base64data}`;
          
          let p = { ...profile };
          if (selectedUploadType === "aadhaar") p.documents.files.aadhaar = filePath;
          else if (selectedUploadType === "pan") p.documents.files.pan = filePath;
          else if (p.documents.files[selectedUploadType] !== undefined) p.documents.files[selectedUploadType] = filePath;
          
          p = mergeProfileData(p, selectedUploadType, {
              ...(result.data || {}),
              _filePath: filePath,
          });
          
          setProfile(p);
          saveProfile(p);
          alert("Data extracted and fields populated successfully!");
      } else {
          alert("Extraction failed. You can still fill the fields manually. Error: " + result.error);
      }
    } catch(err) {
      alert("Error: " + err.message);
    }
    setLoadingType(null);
    e.target.value = '';
  };

  const step = WIZARD_STEPS[currentStepIdx];

  return (
    <div className="page-wrapper">
      <Navbar lang={lang} setLang={setLang} currentStep={1} />
      
      <div className="container section-sm">
        <div className="text-center mb-6">
          <div className="section-title">Manual Profile Builder</div>
          <h1>{step.label}</h1>
          <p className="mt-2 text-muted">Fill out the fields manually, or upload the requested document to auto-fill these specific fields.</p>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex justify-between items-center mb-8 glass-card p-4 overflow-auto flex-wrap gap-4">
           {WIZARD_STEPS.map((s, idx) => (
               <div key={s.id} className={`flex items-center gap-2 px-3 py-1 rounded whitespace-nowrap opacity-60 ${idx === currentStepIdx ? 'opacity-100 font-bold active-step-bg' : ''}`}>
                   <span className="step-circle step-circle-sm active">{idx + 1}</span>
                   {s.label}
               </div>
           ))}
        </div>

        <div className="manual-grid-layout">
            {/* LEFT: Upload Prompts */}
            <div className="manual-left-panel flex flex-col gap-4">
                <div className="glass-card p-6">
                    <h3 className="mb-4">Do you want to upload a document?</h3>
                    <p className="text-sm text-gray-400 mb-4">If you have the document, you can upload it here to auto-fill the fields on the right instantly.</p>
                    
                    <div className="flex flex-col gap-3">
                        {step.docTypes.map(docId => {
                            const docInfo = DOCUMENT_TYPES.find(d => d.id === docId);
                            const isUploading = loadingType === docId;
                            return (
                                <button key={docId} onClick={() => handleUploadClick(docId)} disabled={isUploading} className="btn btn-secondary w-full flex justify-between items-center text-sm">
                                    <span>{docInfo?.icon} {docInfo?.label}</span>
                                    <span>{isUploading ? "⏳" : "Upload"}</span>
                                </button>
                            );
                        })}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={onFileChange} style={{display: 'none'}} accept="image/*,.pdf" />
                </div>
            </div>

            {/* RIGHT: Manual Fields */}
            <div className="manual-right-panel flex flex-col gap-4">
                <div className="glass-card p-6">
                    <h3 className="mb-4">{step.label} Fields</h3>
                    <div className="grid-2">
                        
                        {currentStepIdx === 0 && (
                            <>
                                <InputField label="Full Name" val={profile.personal.full_name} onChange={v => handleManualChange('personal', 'full_name', v)} />
                                <InputField label="Father's Name" val={profile.personal.father_name} onChange={v => handleManualChange('personal', 'father_name', v)} />
                                <InputField label="Mother's Name" val={profile.personal.mother_name} onChange={v => handleManualChange('personal', 'mother_name', v)} />
                                <InputField label="Date of Birth" val={profile.personal.dob} onChange={v => handleManualChange('personal', 'dob', v)} />
                                <InputField label="Gender" val={profile.personal.gender} onChange={v => handleManualChange('personal', 'gender', v)} />
                                <InputField label="Category" val={profile.personal.category} onChange={v => handleManualChange('personal', 'category', v)} />
                                <InputField label="Aadhaar" val={profile.personal.aadhaar} onChange={v => handleManualChange('personal', 'aadhaar', v)} />
                                <InputField label="PAN" val={profile.personal.pan} onChange={v => handleManualChange('personal', 'pan', v)} />
                                <InputField label="Mobile" val={profile.contact.mobile} onChange={v => handleManualChange('contact', 'mobile', v)} />
                                <InputField label="Email" val={profile.contact.email} onChange={v => handleManualChange('contact', 'email', v)} />
                                <InputField label="Address" val={profile.contact.permanent_address.line1} onChange={v => handleManualChange('contact', 'permanent_address.line1', v)} />
                                <InputField label="District" val={profile.contact.permanent_address.district} onChange={v => handleManualChange('contact', 'permanent_address.district', v)} />
                                <InputField label="State" val={profile.contact.permanent_address.state} onChange={v => handleManualChange('contact', 'permanent_address.state', v)} />
                                <InputField label="Pincode" val={profile.contact.permanent_address.pincode} onChange={v => handleManualChange('contact', 'permanent_address.pincode', v)} />
                            </>
                        )}

                        {currentStepIdx === 1 && (
                            <>
                                <InputField label="Board Name" val={profile.education[0].board} onChange={v => updateEdu(0, 'board', v)} />
                                <InputField label="School Name" val={profile.education[0].school} onChange={v => updateEdu(0, 'school', v)} />
                                <InputField label="Roll Number" val={profile.education[0].roll_no} onChange={v => updateEdu(0, 'roll_no', v)} />
                                <InputField label="Passing Year" val={profile.education[0].year_of_passing} onChange={v => updateEdu(0, 'year_of_passing', v)} />
                                <InputField label="Percentage / CGPA" val={profile.education[0].percentage || profile.education[0].cgpa} onChange={v => updateEdu(0, 'percentage', v)} />
                                <InputField label="Certificate Number" val={profile.education[0].certificate_number} onChange={v => updateEdu(0, 'certificate_number', v)} />
                            </>
                        )}

                        {currentStepIdx === 2 && (
                            <>
                                <InputField label="Board Name" val={profile.education[1].board} onChange={v => updateEdu(1, 'board', v)} />
                                <InputField label="Stream" val={profile.education[1].stream} onChange={v => updateEdu(1, 'stream', v)} />
                                <InputField label="School Name" val={profile.education[1].school} onChange={v => updateEdu(1, 'school', v)} />
                                <InputField label="Roll Number" val={profile.education[1].roll_no} onChange={v => updateEdu(1, 'roll_no', v)} />
                                <InputField label="Passing Year" val={profile.education[1].year_of_passing} onChange={v => updateEdu(1, 'year_of_passing', v)} />
                                <InputField label="Percentage / CGPA" val={profile.education[1].percentage || profile.education[1].cgpa} onChange={v => updateEdu(1, 'percentage', v)} />
                                <InputField label="Certificate Number" val={profile.education[1].certificate_number} onChange={v => updateEdu(1, 'certificate_number', v)} />
                            </>
                        )}
                        
                        {currentStepIdx === 3 && (
                            <>
                                <InputField label="University / College Name" val={profile.education[2].university} onChange={v => updateEdu(2, 'university', v)} />
                                <InputField label="Degree Name" val={profile.education[2].degree} onChange={v => updateEdu(2, 'degree', v)} />
                                <InputField label="Branch" val={profile.education[2].branch} onChange={v => updateEdu(2, 'branch', v)} />
                                <InputField label="Enrollment No" val={profile.education[2].enrollment_no} onChange={v => updateEdu(2, 'enrollment_no', v)} />
                                <InputField label="Passing Year" val={profile.education[2].year_of_passing} onChange={v => updateEdu(2, 'year_of_passing', v)} />
                                <InputField label="Percentage / CGPA" val={profile.education[2].percentage || profile.education[2].cgpa} onChange={v => updateEdu(2, 'percentage', v)} />
                            </>
                        )}
                        
                        {currentStepIdx === 4 && (
                            <>
                                <div className="sm:col-span-2 text-primary font-bold mt-2">Caste / Category</div>
                                <InputField label="Category" val={profile.certificates.category.category_name} onChange={v => handleManualChange('certificates', 'category.category_name', v)} />
                                <InputField label="Cert Number" val={profile.certificates.category.certificate_number} onChange={v => handleManualChange('certificates', 'category.certificate_number', v)} />
                                
                                <div className="sm:col-span-2 text-primary font-bold mt-2">Domicile</div>
                                <InputField label="Cert Number" val={profile.certificates.domicile.certificate_number} onChange={v => handleManualChange('certificates', 'domicile.certificate_number', v)} />
                                <InputField label="Issue Date" val={profile.certificates.domicile.issue_date} onChange={v => handleManualChange('certificates', 'domicile.issue_date', v)} />

                                <div className="sm:col-span-2 text-primary font-bold mt-2">Income</div>
                                <InputField label="Annual Income" val={profile.certificates.income.annual_income} onChange={v => handleManualChange('certificates', 'income.annual_income', v)} />
                                <InputField label="Cert Number" val={profile.certificates.income.certificate_number} onChange={v => handleManualChange('certificates', 'income.certificate_number', v)} />
                            </>
                        )}

                        {currentStepIdx === 5 && (
                            <div className="sm:col-span-2 flex flex-col gap-4">
                                <p className="text-sm">Your uploaded Photo & Signature will appear below. These are mandatory for form filling.</p>
                                <div className="flex gap-4">
                                     {profile.documents.photo.original_path ? (
                                         <img src={profile.documents.photo.original_path} style={{maxWidth: 150, borderRadius: 8}} />
                                     ) : (
                                         <div className="w-[150px] h-[150px] border border-dashed border-gray-500 rounded flex items-center justify-center text-sm text-gray-400">No Photo</div>
                                     )}
                                     
                                     {profile.documents.signature.original_path ? (
                                          <img src={profile.documents.signature.original_path} style={{maxWidth: 150, borderRadius: 8}} />
                                      ) : (
                                          <div className="w-[150px] h-[150px] border border-dashed border-gray-500 rounded flex items-center justify-center text-sm text-gray-400">No Signature</div>
                                      )}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="mt-8 flex justify-between">
                         <button 
                             className="btn btn-ghost" 
                             disabled={currentStepIdx === 0} 
                             onClick={() => setCurrentStepIdx(p => p - 1)}>
                             ← Back
                         </button>
                         
                         {currentStepIdx < WIZARD_STEPS.length - 1 ? (
                              <button className="btn btn-primary" onClick={() => setCurrentStepIdx(p => p + 1)}>
                                  Next Step →
                              </button>
                         ) : (
                              <button className="btn btn-primary" onClick={() => router.push('/profile')}>
                                  Finish & Review Profile →
                              </button>
                         )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <style>{`
        .manual-grid-layout { display: grid; grid-template-columns: 1fr 2fr; gap: 32px; align-items: start; }
        .manual-left-panel { flex: 1; }
        .manual-right-panel { flex: 2; }
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.85rem; }
        .text-muted { color: var(--text-muted); }
        .text-primary { color: var(--accent-primary); }
        .col-span-2 { grid-column: span 2; }
        .active-step-bg { background: rgba(255,255,255,0.08); }
        .step-circle-sm { width: 24px !important; height: 24px !important; font-size: 0.75rem !important; border:none !important; }
        .field-empty { border-color: rgba(255,92,117,0.3) !important; }
        .field-filled { border-color: rgba(0,229,160,0.2) !important; }
        @media (max-width: 768px) {
           .manual-grid-layout { grid-template-columns: 1fr; }
           .col-span-2 { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
}

function InputField({ label, val, onChange }) {
    const isEmpty = !val || val === "";
    return (
        <div className="flex flex-col gap-1">
             <label className="text-xs text-muted" style={{fontWeight: 500}}>{label}</label>
             <input 
                 className={`form-input ${(isEmpty) ? 'field-empty' : 'field-filled'}`} 
                 value={val || ""} 
                 onChange={e => onChange(e.target.value)} 
                 placeholder={`Enter ${label}`}
             />
        </div>
    );
}
