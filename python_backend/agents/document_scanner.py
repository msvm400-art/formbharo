import os
import io
import base64
import json
from dotenv import load_dotenv
from agents.offline_ai import offline_scan_document

try:
    import fitz
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False


env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
load_dotenv(env_path)

# ─────────────────────────────────────────────────────────────────
# MODE CONTROL: True = use EasyOCR (offline). False = use Gemini.
# ─────────────────────────────────────────────────────────────────
OFFLINE_MODE = True

# Lazy-load EasyOCR reader to avoid slow startup if not needed
_ocr_reader = None
def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            print("[Scanner] Initializing EasyOCR reader (English + Hindi)...")
            _ocr_reader = easyocr.Reader(['en', 'hi'], gpu=False)
            print("[Scanner] EasyOCR ready.")
        except Exception as e:
            print(f"[Scanner] EasyOCR init failed: {e}")
    return _ocr_reader


def run_easyocr_scan(base64_data: str, mime_type: str, hint_doc_type: str = None):
    """Run EasyOCR on raw image/PDF bytes and extract text + structured data."""
    agent_steps = []
    agent_steps.append({"step": "init_offline_ocr", "status": "running", "note": "EasyOCR Offline Scan"})

    reader = _get_ocr_reader()
    if reader is None:
        agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": "EasyOCR not available.", "agentSteps": agent_steps}

    try:
        raw_bytes = base64.b64decode(base64_data)

        # Handle PDF: convert first page to image using PyMuPDF
        if mime_type == "application/pdf":
            if not HAS_FITZ:
                return {"success": False, "error": "PyMuPDF (fitz) not installed. Cannot process PDF offline.", "agentSteps": agent_steps}
            try:
                doc = fitz.open(stream=raw_bytes, filetype="pdf")
                page = doc.load_page(0)
                pix = page.get_pixmap(dpi=200)

                img_bytes = pix.tobytes("png")
                image_array = img_bytes
            except Exception as e:
                agent_steps[-1]["status"] = "failed"
                return {"success": False, "error": f"PDF-to-image conversion failed: {e}", "agentSteps": agent_steps}
        else:
            image_array = raw_bytes

        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(image_array)).convert("RGB")
        img_np = np.array(img)

        agent_steps.append({"step": "ocr_scan", "status": "running"})
        results = reader.readtext(img_np, detail=0, paragraph=True)
        full_text = "\n".join(results)
        agent_steps[-1]["status"] = "done"
        agent_steps[-1]["note"] = f"Extracted {len(results)} text blocks"

        # Post-process with heuristic extractor
        agent_steps.append({"step": "heuristic_extraction", "status": "running"})
        extracted_data = offline_scan_document(full_text, hint_doc_type)
        # Include raw OCR text for debugging
        extracted_data["_raw_ocr_text"] = full_text[:500]  # first 500 chars
        field_count = len([v for k, v in extracted_data.items() if v and not k.startswith("_")])
        agent_steps[-1]["status"] = "done"

        return {
            "success": True,
            "detectedDocType": hint_doc_type or "scanned_doc",
            "detectedConfidence": "medium",
            "extractedData": extracted_data,
            "fieldCount": field_count,
            "agentSteps": agent_steps,
            "modelUsed": "EasyOCR-Offline",
            "error": None
        }

    except Exception as e:
        if agent_steps:
            agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": f"Offline OCR Error: {e}", "agentSteps": agent_steps}


async def _gemini_scan(base64_data: str, mime_type: str, hint_doc_type: str = None):
    """Fallback: use Gemini Vision for document scanning."""
    agent_steps = [{"step": "init_gemini", "status": "running", "note": "Using Python Gemini 1.5 Flash Vision"}]

    if not os.getenv("GEMINI_API_KEY"):
        agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": "GEMINI_API_KEY is not set in .env.local", "agentSteps": agent_steps}

    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-1.5-flash")

        agent_steps.append({"step": "vision_processing", "status": "running"})

        prompt = f"""
You are an expert Indian Government Document Scanner Vision AI.
Extract all details from the provided document image/PDF into a clean JSON object.
Document type hint: {hint_doc_type or "Unknown"}

For 10th/12th/Graduation/Diploma marksheets or certificates, perform a DEEP SCAN. Extract exactly these keys if found:
"student_name", "father_name", "mother_name", "board_name", "school_name", "roll_number", "year_of_passing", "percentage", "total_marks_obtained", "total_max_marks", "division", "issue_date", "certificate_number".
Also extract a "subjects" array containing objects with "name", "marks_obtained", "max_marks".

For Category/Caste/Domicile/Income certificates, perform a DEEP SCAN. Extract exactly these keys if found:
"category", "sub_caste", "certificate_number", "issue_date", "validity_date", "issuing_authority_name", "issuing_authority_designation", "issuing_office", "district", "state", "father_name", "annual_income".

For Aadhaar: "full_name", "father_name", "dob", "gender", "aadhaar_number", "address_line1", "village_town", "district", "state", "pincode".

For PAN: "full_name", "father_name", "dob", "pan_number".

For EWS/Income/Other Certificates: "full_name", "father_name", "certificate_number", "issue_date", "validity_year", "issuing_authority_name", "district", "state".

Ensure all dates are formatted consistently (DD/MM/YYYY).
Respond ONLY with the pure raw JSON object. Do NOT wrap in markdown codeblocks. Do NOT include ```json.
"""
        response = await model.generate_content_async([
            {'mime_type': mime_type, 'data': base64_data},
            prompt
        ])
        raw_text = response.text.strip()
        if raw_text.startswith("```json"): raw_text = raw_text[7:]
        if raw_text.startswith("```"): raw_text = raw_text[3:]
        raw_text = raw_text.rstrip("`").strip()

        extracted_data = json.loads(raw_text)
        field_count = len([v for k, v in extracted_data.items() if v])

        agent_steps[-1]["status"] = "done"
        return {
            "success": True,
            "detectedDocType": hint_doc_type or "scanned_doc",
            "detectedConfidence": "high",
            "extractedData": extracted_data,
            "fieldCount": field_count,
            "agentSteps": agent_steps,
            "modelUsed": "Python/Gemini-1.5-Flash",
            "error": None
        }
    except Exception as e:
        if agent_steps:
            agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": f"Python AI Engine Error: {e}", "agentSteps": agent_steps}


async def run_document_scanner_agent(base64_data: str, mime_type: str, hint_doc_type: str = None):
    """Main entry point. Uses EasyOCR offline by default, falls back to Gemini if it fails."""
    
    # Force Gemini for "Deep Scan" documents as heuristic OCR is not reliable for tabular marks and complex certificates
    deep_scan_types = ["10th_marksheet", "10th_certificate", "12th_marksheet", "12th_certificate", 
                       "graduation_certificate", "category_certificate", "domicile_certificate", "income_certificate", "ews_certificate"]

    
    force_gemini = hint_doc_type in deep_scan_types
    
    if OFFLINE_MODE and not force_gemini:
        print("[Scanner] Attempting OFFLINE EasyOCR scan...")
        result = run_easyocr_scan(base64_data, mime_type, hint_doc_type)
        if result.get("success"):
            return result
        print(f"[Scanner] Offline scan failed: {result.get('error')}. Falling back to Gemini Vision...")
    elif force_gemini:
        print(f"[Scanner] Deep Scan requested for {hint_doc_type}. Bypassing offline mode to use high-accuracy Gemini extraction.")
    
    print("[Scanner] Running Gemini Vision scan...")
    return await _gemini_scan(base64_data, mime_type, hint_doc_type)
