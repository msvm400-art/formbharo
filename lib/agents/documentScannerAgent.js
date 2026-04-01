/**
 * lib/agents/documentScannerAgent.js
 * 
 * 🤖 DOCUMENT SCANNER AGENT (Routed to Custom Python AI Engine)
 * Replaces earlier Javascript/Gemini implementation.
 */

export async function runDocumentScannerAgent(base64Data, mimeType, hintDocType = null) {
  try {
    const formData = new FormData();
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    formData.append("file", blob, "document");
    
    if (hintDocType) formData.append("hintDocType", hintDocType);

    // Call the Python AI API Backend (Production Render URL or local fallback)
    // Priority: .env.local -> Environment -> Hardcoded Fallback
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      process.env.BACKEND_URL || 
                      "http://127.0.0.1:8000";
    
    console.log(`[DocumentScannerAgent] Calling backend: ${backendUrl}/api/scan-document`);
    
    const response = await fetch(`${backendUrl}/api/scan-document`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error("[DocumentScannerAgent] API Error Response:", err);
      return { 
        success: false, 
        error: `Python API Error (${response.status}): ${err}`, 
        agentSteps: [{step: "call_python", status: "failed", error: err}]
      };
    }
    
    const data = await response.json();
    console.log("[DocumentScannerAgent] Scan successful:", data.success);
    return data;
  } catch (err) {
    console.error("[DocumentScannerAgent] Connection Error:", err);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return { 
      success: false, 
      error: `Could not connect to Python AI API at ${backendUrl}. Check if your backend is running. Details: ${err.message}`, 
      agentSteps: [] 
    };
  }
}
