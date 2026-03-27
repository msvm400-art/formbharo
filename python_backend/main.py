from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
        content = await file.read()
        base64_data = base64.b64encode(content).decode('utf-8')
        mime_type = file.content_type

        result = await run_document_scanner_agent(base64_data, mime_type, hintDocType)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
