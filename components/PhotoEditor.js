"use client";
import { useState } from "react";

export default function PhotoEditor({ src, type = "photo", onSave }) {
  const [width, setWidth] = useState(type === "photo" ? 200 : 300);
  const [height, setHeight] = useState(type === "photo" ? 230 : 100);
  const [maxKB, setMaxKB] = useState(type === "photo" ? 50 : 20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState(src);
  const [stats, setStats] = useState(null);

  const processImage = async () => {
    setIsProcessing(true);
    try {
      // Get the actual file from the path if it's a URL
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], "temp.jpg", { type: blob.type });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("width", width);
      formData.append("height", height);
      formData.append("maxKB", maxKB);
      formData.append("format", "jpeg");

      const res = await fetch("/api/process-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const newSrc = `data:${data.mimeType};base64,${data.base64}`;
        setPreview(newSrc);
        setStats({
          width: data.width,
          height: data.height,
          sizeKB: data.sizeKB,
          quality: data.qualityUsed
        });
        if (onSave) onSave(newSrc, data);
      }
    } catch (err) {
      console.error("Image processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="photo-editor glass-card p-4 mt-2">
      <div className="flex gap-4 flex-wrap">
        <div className="editor-controls" style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: "0.85rem", marginBottom: 12 }}>📏 Resize & Compress</h4>
          <div className="grid-2 gap-2">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.7rem" }}>Width (px)</label>
              <input type="number" className="form-input" style={{ padding: "6px 10px", fontSize: "0.8rem" }} value={width} onChange={e => setWidth(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.7rem" }}>Height (px)</label>
              <input type="number" className="form-input" style={{ padding: "6px 10px", fontSize: "0.8rem" }} value={height} onChange={e => setHeight(e.target.value)} />
            </div>
          </div>
          <div className="form-group mt-2">
            <label className="form-label" style={{ fontSize: "0.7rem" }}>Max File Size (KB)</label>
            <input type="number" className="form-input" style={{ padding: "6px 10px", fontSize: "0.8rem" }} value={maxKB} onChange={e => setMaxKB(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm w-full mt-4" onClick={processImage} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "✨ Apply Changes"}
          </button>
        </div>

        <div className="preview-area text-center" style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: "0.85rem", marginBottom: 12 }}>Preview</h4>
          <div className="image-preview-box" style={{ border: "1px solid var(--border-glass)", borderRadius: 8, padding: 8, background: "rgba(0,0,0,0.2)", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 4 }} />
          </div>
          {stats && (
            <div className="mt-2" style={{ fontSize: "0.75rem", color: "var(--accent-green)" }}>
              {stats.width}x{stats.height} px • {stats.sizeKB} KB
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
