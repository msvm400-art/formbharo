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
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${backendUrl}/api/scan-document`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const err = await response.text();
      return { 
        success: false, 
        error: "Python API Error: " + err, 
        agentSteps: [{step: "call_python", status: "failed", error: err}]
      };
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { 
      success: false, 
      error: "Could not connect to Python AI API. Make sure FastAPI is running on port 8000. " + err.message, 
      agentSteps: [] 
    };
  }
}
