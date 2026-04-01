from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
import uvicorn
import base64

from agents.document_scanner import run_document_scanner_agent
from browser_agent import run_browser_automation, run_analysis_automation

app = FastAPI(title="FormBharo AI API")

class AskAIRequest(BaseModel):
    prompt: str
    image: Optional[str] = None

class BrowserRequest(BaseModel):
    url: str
    profile: dict
    autoSubmit: bool = False

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[API] Incoming: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[API] Outgoing Status: {response.status_code}")
    return response

@app.get("/")
async def root():
    return {"message": "FormBharo AI Backend is running"}

@app.post("/api/start-form-fill")
async def start_form_fill(req: BrowserRequest):
    try:
        return await run_browser_automation(req.url, req.profile, req.autoSubmit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-form")
async def analyze_form(req: dict):
    try:
        url = req.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        return await run_analysis_automation(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan-document")
async def scan_document(
    file: UploadFile = File(...),
    hintDocType: Optional[str] = Form(None)
):
    try:
        print(f"[API] Received scan request: {file.filename}, type: {file.content_type}")
        content = await file.read()
        if not content:
            raise ValueError("Empty file uploaded")
            
        base64_data = base64.b64encode(content).decode('utf-8')
        mime_type = file.content_type or "image/jpeg"

        result = await run_document_scanner_agent(base64_data, mime_type, hintDocType)
        print(f"[API] Scan completed. Success: {result.get('success')}")
        return result
    except Exception as e:
        import traceback
        error_msg = f"Scanner API Error: {str(e)}"
        print(f"[API] ERROR: {error_msg}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)


# Catch-all route for better 404 debugging
@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path_name: str):
    print(f"[API] 404 ERROR: {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"success": False, "error": f"Endpoint '/{path_name}' not found on Python Backend."}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
