"use client";
import { useState } from "react";

export default function DocumentRequirementModal({ isOpen, onClose, onSave, initialReqs, fieldLabel }) {
  const [reqs, setReqs] = useState(initialReqs || { min_kb: 20, max_kb: 50, width: null, height: null, unit: 'px' });

  if (!isOpen) return null;

  const isPhoto = any(kw => fieldLabel.toLowerCase().includes(kw), ["photo", "signature", "thumb", "sign"]);

  function any(fn, arr) { return arr.some(fn); }

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card p-6" style={{ width: '400px' }}>
        <h3 className="mb-4">Resize Requirements: {fieldLabel}</h3>
        <p className="text-xs opacity-60 mb-4">
          Target Format: <b className="text-blue-400">{isPhoto ? "JPG (Photo/Sign)" : "PDF (Document)"}</b>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label text-xs">Min KB</label>
            <input className="form-input" type="number" value={reqs.min_kb || ''} onChange={(e) => setReqs({...reqs, min_kb: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label text-xs">Max KB</label>
            <input className="form-input" type="number" value={reqs.max_kb || ''} onChange={(e) => setReqs({...reqs, max_kb: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label text-xs">Width ({reqs.unit})</label>
            <input className="form-input" type="number" value={reqs.width || ''} onChange={(e) => setReqs({...reqs, width: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label text-xs">Height ({reqs.unit})</label>
            <input className="form-input" type="number" value={reqs.height || ''} onChange={(e) => setReqs({...reqs, height: e.target.value})} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
           {['px', 'cm', 'mm'].map(u => (
             <button key={u} className={`btn btn-sm ${reqs.unit === u ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReqs({...reqs, unit: u})}>
               {u}
             </button>
           ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(reqs)}>Save Rules</button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justifyContent: center; z-index: 1000; }
        .modal-content { border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
}
