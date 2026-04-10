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
    url: Optional[str] = None
    profile: dict
    autoSubmit: bool = False
    fieldMappings: Optional[list] = None
    sessionId: Optional[str] = None

class BrowserCommand(BaseModel):
    sessionId: str
    command: str  # click | type | scroll | refresh | back | forward | navigate
    idx: Optional[int] = None
    text: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

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

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Backend is awake"}

@app.post("/api/start-form-fill")
async def start_form_fill(req: BrowserRequest):
    try:
        from browser_agent import run_browser_automation
        return await run_browser_automation(req.url, req.profile, req.autoSubmit, req.fieldMappings, req.sessionId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/browser/command")
async def browser_command(req: BrowserCommand):
    try:
        from browser_agent import SESSIONS, click_coordinates
        if req.sessionId not in SESSIONS:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = SESSIONS[req.sessionId]
        page = session.page
        
        if req.command == "click" and req.x is not None and req.y is not None:
            await click_coordinates(req.sessionId, req.x, req.y)
        elif req.command == "type" and req.idx is not None:
            # Type into field by index
            await page.evaluate(f'''(idx, txt) => {{
                const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea');
                if(inputs[idx]) {{
                    inputs[idx].value = txt;
                    inputs[idx].dispatchEvent(new Event('input', {{ bubbles: true }}));
                    inputs[idx].dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            }}''', req.idx, req.text)
        elif req.command == "scroll":
            await page.mouse.wheel(0, req.y or 300)
        elif req.command == "back":
            from browser_agent import go_back
            screenshot_bytes = await go_back(req.sessionId)
        elif req.command == "forward":
            from browser_agent import go_forward
            screenshot_bytes = await go_forward(req.sessionId)
        elif req.command == "refresh":
            from browser_agent import reload_page
            screenshot_bytes = await reload_page(req.sessionId)
        elif req.command == "navigate" and req.text:
            from browser_agent import navigate_to
            screenshot_bytes = await navigate_to(req.sessionId, req.text)

        if not screenshot_bytes:
            screenshot_bytes = await page.screenshot()
        
        screenshot = base64.b64encode(screenshot_bytes).decode('utf-8')
        return {"success": True, "screenshotBase64": screenshot}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/browser/screenshot/{session_id}")
async def get_screenshot(session_id: str):
    from browser_agent import SESSIONS
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = SESSIONS[session_id]
    screenshot = base64.b64encode(await session.page.screenshot()).decode('utf-8')
    return {"screenshotBase64": screenshot}


@app.post("/api/save-feedback")
async def save_feedback(req: dict):
    try:
        from agents.offline_ai import LEARNING_FILE
        import json
        import os
        
        data = req.get("feedback", {})
        if not data: return {"success": False, "error": "No data"}
        
        # Load existing
        store = {}
        if os.path.exists(LEARNING_FILE):
            with open(LEARNING_FILE, "r", encoding="utf-8") as f:
                store = json.load(f)
        
        # Merge form mappings
        if "form_mappings" not in store: store["form_mappings"] = {}
        store["form_mappings"].update(data.get("form_mappings", {}))
        
        # Save
        os.makedirs(os.path.dirname(LEARNING_FILE), exist_ok=True)
        with open(LEARNING_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)
            
        return {"success": True}
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


@app.post("/api/profile/update-key")
async def update_profile_key(req: dict):
    """Allows saving new mappings to the learning store from manual sidebar input."""
    try:
        from browser_agent import save_learning_feedback
        mappings = req.get("mappings", [])
        await save_learning_feedback(mappings)
        return {"success": True}
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
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

