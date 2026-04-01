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
      let err;
      try {
        const jsonErr = await response.json();
        err = jsonErr.error || jsonErr.detail || JSON.stringify(jsonErr);
      } catch {
        err = await response.text();
      }
      
      console.error("[DocumentScannerAgent] API Error Response:", err);
      const is404 = response.status === 404;
      const errorMsg = is404 
        ? `Python API Error (404): Endpoint not found at ${backendUrl}. Check if backend is running on port 8000.` 
        : `Python API Error (${response.status}): ${err}`;

      return { 
        success: false, 
        error: errorMsg,
        agentSteps: [{step: "call_python", status: "failed", error: err}]
      };
    }
    
    const data = await response.json();
    if (data.success === false && data.error) {
       console.warn("[DocumentScannerAgent] Backend returned success:false", data.error);
    }
    return data;
  } catch (err) {
    console.error("[DocumentScannerAgent] Connection Error:", err);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return { 
      success: false, 
      error: `Could not connect to Python AI API at ${backendUrl}. Ensure the backend is started (py main.py). Details: ${err.message}`, 
      agentSteps: [] 
    };
  }
}
