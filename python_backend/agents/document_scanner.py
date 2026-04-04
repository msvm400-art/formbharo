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
# Deep-scan documents always fall through to Gemini Vision.
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


# ─────────────────────────────────────────────────────────────────
# GEMINI VISION PROMPT (Heavily improved for Indian documents)
# ─────────────────────────────────────────────────────────────────
GEMINI_PROMPT = """
You are an expert Indian Government Document Scanner AI with specialization in all types of
official Indian documents including state and central government certificates, marksheets,
ID cards, and financial documents.

Your task: Extract ALL possible data from the provided document image/PDF into a clean, valid JSON object.
Be thorough — extract EVERY field you can read, even if it is partially visible or in Hindi.

{few_shot}

Document type hint: {doc_type_hint}

════════════════════════════════════════════════════════════════
DOCUMENT-SPECIFIC EXTRACTION RULES (FOLLOW STRICTLY)
════════════════════════════════════════════════════════════════

1. 🪪 AADHAAR CARD:
   Extract: "full_name", "full_name_hindi", "father_name", "husband_name", "dob" (DD/MM/YYYY),
   "gender", "aadhaar_number" (12 digits, format: XXXX XXXX XXXX), "address_line1",
   "address_line2", "village_town", "post_office", "district", "state", "pincode",
   "mobile_linked" (last 3 digits if shown), "vid" (Virtual ID if shown).
   CRITICAL: The 12-digit UID must be exact. Full address is mandatory.

2. 🪪 PAN CARD:
   Extract: "pan_number" (10-char like ABCDE1234F), "full_name", "father_name",
   "dob" (DD/MM/YYYY), "signature_visible" (true/false).
   NOTE: PAN is always 5 letters + 4 digits + 1 letter.

3. 📋 10th / MATRICULATION MARKSHEET OR CERTIFICATE:
   Extract: "student_name", "student_name_hindi", "father_name", "father_name_hindi",
   "mother_name", "mother_name_hindi", "dob" (DD/MM/YYYY), "roll_number",
   "certificate_number", "registration_number", "issue_date" (DD/MM/YYYY),
   "board_name" (full name, e.g. "Bihar School Examination Board", "CBSE", "ICSE"),
   "board_code", "board_type" ("Central" or "State"), "school_name", "school_code",
   "center_code", "center_name", "month_of_passing", "year_of_passing",
   "total_marks_obtained", "total_max_marks", "percentage", "cgpa", "division",
   "result_status" ("PASS" or "FAIL"),
   "subjects": array of {{"name", "theory_marks", "practical_marks", "total_marks", "grade", "code"}}.
   For Bihar Board: also extract "anukramank" (roll no), "panjikaran_sankhya" (registration no).
   CRITICAL: Extract ALL subjects. Do NOT leave subjects array empty.

4. 📋 12th / INTERMEDIATE MARKSHEET OR CERTIFICATE:
   Extract same fields as 10th PLUS: "stream" (Science/Arts/Commerce), "exam_type".
   For Bihar Board: extract anukramank, panjikaran_sankhya, intermediate board.
   CRITICAL: Capture subjects array with all marks. Identify if it is a passing certificate.

5. 🎓 GRADUATION / DEGREE MARKSHEET or CERTIFICATE:
   Extract: "student_name", "father_name", "roll_number", "enrollment_number",
   "university_name", "college_name", "course_name" (e.g. "B.A.", "B.Sc.", "B.Com"),
   "branch_specialization", "year_of_passing", "month_of_passing",
   "total_marks_obtained", "total_max_marks", "percentage", "cgpa", "division",
   "result_status", "semester" (if semester marksheet),
   "subjects": array of {{"name", "theory_marks", "practical_marks", "total_marks", "grade"}}.

6. 📜 CASTE / CATEGORY CERTIFICATE (SC, ST, OBC, OBC-NCL, EWS):
   Extract: "category" (SC/ST/OBC/OBC-NCL/EWS/General), "sub_caste", "caste",
   "full_name", "father_name", "mother_name", "husband_name",
   "certificate_number", "reference_number", "token_number",
   "issue_date" (DD/MM/YYYY), "valid_upto" (DD/MM/YYYY if shown), "financial_year",
   "issuing_authority_name", "issuing_authority_designation"
   (e.g. SDM, DM, Tehsildar, Collector, Revenue Officer, CO, SDO),
   "issuing_office", "district", "state", "taluka", "block", "village_town",
   "address", "annual_income" (for EWS/income certs), "pincode".
   CRITICAL: Certificate number, reference number and issuing authority designation are mandatory.

7. 🏠 DOMICILE / RESIDENCE / NIWAS PRAMAN PATRA:
   Extract: "full_name", "father_name", "husband_name", "dob", "gender",
   "certificate_number", "reference_number", "token_number", "issue_date" (DD/MM/YYYY),
   "district", "state", "sub_division", "block", "village_town", "ward_no",
   "police_station", "address", "identification_mark_1", "identification_mark_2",
   "issuing_authority_designation", "issuing_authority_name".

8. 💰 INCOME CERTIFICATE / AAY PRAMAN PATRA:
   Extract same as domicile PLUS:
   "annual_income", "income_govt_service", "income_agriculture",
   "income_business", "income_other_sources", "profession".

9. 🖥️ COMPUTER CERTIFICATE (ADCA, DCA, CCC, O-Level, etc.):
   Extract: "student_name", "father_name", "mother_name", "dob",
   "course_name" (e.g. ADCA, DCA, CCC), "duration", "grade", "marks_obtained",
   "total_marks", "percentage", "issue_date" (DD/MM/YYYY), "valid_upto",
   "center_name", "center_code", "certificate_number", "registration_number",
   "institue_name", "board_university" (e.g. NIELIT, DOEACC).

10. 🏦 BANK PASSBOOK / ACCOUNT DOCUMENT:
    Extract: "account_holder_name", "account_number", "ifsc_code", "bank_name",
    "branch_name", "branch_address", "account_type" (Savings/Current/Jan Dhan),
    "micr_code", "opening_date", "nominee_name", "father_husband_name".

11. 🚔 CHARACTER / POLICE VERIFICATION CERTIFICATE:
    Extract: "full_name", "father_name", "dob", "address", "character_certificate_number",
    "issue_date" (DD/MM/YYYY), "police_station", "district", "state",
    "issuing_officer_name", "issuing_officer_designation",
    "residence_history": array of {{"address", "district", "police_station", "from_month", "from_year", "to_month", "to_year"}}.

12. 🎓 ADMIT CARD / HALL TICKET:
    Extract: "candidate_name", "roll_number", "registration_number", "exam_name",
    "exam_date", "exam_time", "exam_center", "center_code", "father_name",
    "category", "dob", "gender", "post_applied".

13. 📱 VOTER ID / EPIC CARD:
    Extract: "full_name", "father_husband_name", "dob", "gender", "age",
    "epic_number", "constituency", "part_number", "serial_number",
    "address", "district", "state".

14. 🚗 DRIVING LICENCE:
    Extract: "holder_name", "dob", "dl_number", "issue_date", "valid_upto",
    "vehicle_class", "blood_group", "address", "issuing_rto".

15. 📚 SCHOLARSHIP / FEE RECEIPT / PAYMENT RECEIPT:
    Extract: "applicant_name", "application_number", "scholarship_type",
    "amount_paid", "payment_date", "transaction_id", "bank_name",
    "academic_year", "course", "institution_name", "district", "state".

════════════════════════════════════════════════════════════════
GENERAL EXTRACTION RULES:
════════════════════════════════════════════════════════════════
- Extract BOTH English and Hindi text where applicable (suffix _hindi for Hindi fields).
- NEVER leave a visible field blank — if partially legible, include what you can see.
- For dates always use DD/MM/YYYY format.
- For certificate numbers include the full number with slashes, hyphens as printed.
- For names use TITLE CASE (e.g., "Rana Pratap Singh" not "RANA PRATAP SINGH").
- For Hindi text: include it as-is in Unicode.
- If a field is genuinely not present, omit it from JSON (do not write null or empty string).
- For Bihar government certificates, look for: "Praman Patra Krmank" (certificate no),
  "Anumandal" (sub-division), "Prakhand" (block), "Thana" (police station),
  "Panjikaran Sankhya" (registration  number).

RESPOND ONLY WITH PURE RAW JSON. DO NOT WRAP IN MARKDOWN CODEBLOCKS. DO NOT WRITE ```json.
"""


async def _gemini_scan(base64_data: str, mime_type: str, hint_doc_type: str = None):
    """High-accuracy Gemini Vision scan for all document types."""
    agent_steps = [{"step": "init_gemini", "status": "running", "note": "Gemini 1.5 Flash Vision — Enhanced Extraction"}]

    if not os.getenv("GEMINI_API_KEY"):
        agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": "GEMINI_API_KEY is not set in .env.local", "agentSteps": agent_steps}

    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-1.5-flash")

        agent_steps.append({"step": "vision_processing", "status": "running"})

        # Load few-shot examples from learning store
        from agents.offline_ai import load_learning_data
        learning = load_learning_data()
        corrections = learning.get("scan_corrections", [])
        few_shot = ""
        if corrections:
            # Filter relevant corrections for this doc type
            relevant = [c for c in corrections if hint_doc_type and (
                hint_doc_type.lower() in str(c.get("doc_type", "")).lower() or
                str(c.get("doc_type", "")).lower() in hint_doc_type.lower()
            )]
            # If no specific match, take last 3 general ones
            samples = relevant[:3] if relevant else corrections[-3:]
            if samples:
                few_shot = "\n--- FEW-SHOT EXAMPLES FROM PREVIOUS SCANS ---\n"
                for c in samples:
                    few_shot += f"Doc: {c.get('doc_type', c.get('filename', 'Unknown'))}\n"
                    few_shot += f"Extracted JSON: {json.dumps(c.get('json', c.get('extracted', {})), ensure_ascii=False)}\n\n"

        prompt = GEMINI_PROMPT.format(
            few_shot=few_shot,
            doc_type_hint=hint_doc_type or "Unknown — auto-detect document type"
        )

        response = await model.generate_content_async([
            {'mime_type': mime_type, 'data': base64_data},
            prompt
        ])
        raw_text = response.text.strip()

        # Strip markdown wrappers if model adds them
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        raw_text = raw_text.rstrip("`").strip()

        extracted_data = json.loads(raw_text)
        field_count = len([v for k, v in extracted_data.items() if v])

        agent_steps[-1]["status"] = "done"
        agent_steps[-1]["note"] = f"{field_count} fields extracted"

        return {
            "success": True,
            "detectedDocType": hint_doc_type or "auto_detected",
            "detectedConfidence": "high",
            "extractedData": extracted_data,
            "fieldCount": field_count,
            "agentSteps": agent_steps,
            "modelUsed": "Gemini-1.5-Flash-Enhanced",
            "error": None
        }
    except json.JSONDecodeError as je:
        # Try to salvage partial JSON
        agent_steps[-1]["status"] = "partial"
        agent_steps[-1]["note"] = "JSON parse error — attempting recovery"
        try:
            # Find first { and last }
            start = raw_text.find("{")
            end = raw_text.rfind("}") + 1
            if start != -1 and end > start:
                extracted_data = json.loads(raw_text[start:end])
                field_count = len([v for k, v in extracted_data.items() if v])
                return {
                    "success": True,
                    "detectedDocType": hint_doc_type or "auto_detected",
                    "detectedConfidence": "medium",
                    "extractedData": extracted_data,
                    "fieldCount": field_count,
                    "agentSteps": agent_steps,
                    "modelUsed": "Gemini-1.5-Flash-Enhanced",
                    "error": None
                }
        except Exception:
            pass
        return {"success": False, "error": f"JSON Parse Error: {je}", "agentSteps": agent_steps}
    except Exception as e:
        if agent_steps:
            agent_steps[-1]["status"] = "failed"
        return {"success": False, "error": f"Python AI Engine Error: {e}", "agentSteps": agent_steps}


# ─────────────────────────────────────────────────────────────────
# Deep-scan doc types — always use Gemini (skip offline OCR)
# ─────────────────────────────────────────────────────────────────
DEEP_SCAN_TYPES = {
    "aadhaar", "pan_card", "pan",
    "10th_marksheet", "10th_certificate",
    "12th_marksheet", "12th_certificate",
    "graduation_certificate", "graduation_marksheet",
    "category_certificate", "caste_certificate",
    "domicile_certificate", "income_certificate",
    "ews_certificate", "ews", "character_certificate",
    "computer_certificate", "bank_passbook",
    "admit_card", "voter_id", "driving_licence",
    "scholarship", "fee_receipt"
}


async def run_document_scanner_agent(base64_data: str, mime_type: str, hint_doc_type: str = None):
    """Main entry point. Uses EasyOCR offline by default, falls back to Gemini for complex docs."""

    force_gemini = (hint_doc_type or "").lower().replace(" ", "_") in DEEP_SCAN_TYPES

    if OFFLINE_MODE and not force_gemini:
        print("[Scanner] Attempting OFFLINE EasyOCR scan...")
        result = run_easyocr_scan(base64_data, mime_type, hint_doc_type)
        if result.get("success"):
            return result
        print(f"[Scanner] Offline scan failed: {result.get('error')}. Falling back to Gemini Vision...")
    elif force_gemini:
        print(f"[Scanner] Deep Scan → {hint_doc_type}. Using Gemini Vision for high-accuracy extraction.")

    print("[Scanner] Running Gemini Vision scan...")
    return await _gemini_scan(base64_data, mime_type, hint_doc_type)
