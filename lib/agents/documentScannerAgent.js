/**
 * lib/agents/documentScannerAgent.js
 * 
 * 🤖 DOCUMENT SCANNER AGENT (Routed to Custom Python AI Engine)
 * Replaces earlier Javascript/Gemini implementation.
 */

export async function runDocumentScannerAgent(base64Data, mimeType, hintDocType = null) {
  try {
    // Using browser-compatible way to convert base64 to Blob (avoids 'Buffer is not defined' error)
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const formData = new FormData();
    formData.append("file", blob, "document");
    
    if (hintDocType) formData.append("hintDocType", hintDocType);

    // Call the Python AI API Backend (Production Render URL or local fallback)
    // Priority: NEXT_PUBLIC_BACKEND_URL -> Environment -> Hardcoded Fallback
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      "http://127.0.0.1:8080";

    
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
        ? `Python API Error (404): Endpoint not found at ${backendUrl}. Check if backend is running on port 8080.` 
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8080";

    return { 
      success: false, 
      error: `Could not connect to Python AI API at ${backendUrl}. Ensure the backend is started (py main.py). Details: ${err.message}`, 
      agentSteps: [] 
    };
  }
}
