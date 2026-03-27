import os
import json
import base64
from playwright.async_api import async_playwright
from utils import resize_image, resize_pdf
from agents.offline_ai import populate_form_mappings
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

# ─────────────────────────────────────────────────────────────────
# MODE CONTROL: Set to True for 100% offline. False = use Gemini.
# ─────────────────────────────────────────────────────────────────
OFFLINE_MODE = True

# Lazily import Gemini only if not using offline mode
_gemini_model = None
def _get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
            _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        except Exception as e:
            print(f"[Agent] Gemini not available: {e}")
    return _gemini_model


async def get_yt_knowledge(url, page_title):
    kb_path = os.path.join(os.path.dirname(__file__), "..", "lib", "agents", "formKnowledgeBase.json")
    specialized_rules = ""
    try:
        if os.path.exists(kb_path):
            with open(kb_path, "r", encoding="utf-8") as f:
                kb = json.load(f)
            text_to_match = (str(page_title) + " " + str(url)).lower()

            for exam_id, data in kb.items():
                keywords = [exam_id] + data.get("exam_keywords", [])
                match = any(kw.lower() in text_to_match for kw in keywords if len(kw) > 2)
                if match:
                    specialized_rules = f"\n🔥 EXPERT RULES FOR THIS EXAM ({exam_id}) FROM YOUTUBE KNOWLEDGE BASE:\n"
                    if data.get("filling_rules"):
                        specialized_rules += "\n".join([f"- {r}" for r in data["filling_rules"]]) + "\n"
                    if data.get("photo_signature_rules"):
                        specialized_rules += f"- Photo/Signature Requirements: {data['photo_signature_rules']}\n"
                    if data.get("document_rules"):
                        specialized_rules += f"- Document Requirements: {data['document_rules']}\n"
                    break
    except Exception as e:
        print("KB Error:", e)
    return specialized_rules


async def analyze_form_advanced(page_title, page_url, profile, raw_fields, screenshot_b64):
    """Analyze form fields and return mappings.
    Uses offline heuristic engine by default. Falls back to Gemini if OFFLINE_MODE is False."""

    # ── OFFLINE PATH ──────────────────────────────────────────────
    if OFFLINE_MODE:
        print("[Agent] Running 100% OFFLINE heuristic form mapping...")
        return populate_form_mappings(raw_fields, profile)

    # ── ONLINE PATH (Gemini) ────────────────────────────────────────
    model = _get_gemini_model()
    if model is None:
        print("[Agent] Gemini unavailable, falling back to offline engine.")
        return populate_form_mappings(raw_fields, profile)

    yt_rules = await get_yt_knowledge(page_url, page_title)

    prompt = f"""
You are an advanced AI specialized in Indian Government forms (UPSC, SSC, Banking, State PSC).
You must route the exact data from the applicant's profile to the form fields intelligently.

PAGE CONTEXT: Title: {page_title}, URL: {page_url}

APPLICANT PROFILE DATA (USE ONLY THIS):
{json.dumps(profile, indent=2)}
{yt_rules}

DETECTED FIELDS:
{json.dumps(raw_fields, indent=2)}

YOUR TASK:
Return a JSON array where each object has:
- "idx": The field index.
- "profileKey": A descriptive key or null.
- "fillValue": The exact text/value to type or select.
  - For files (photo/signature/cert), use the absolute path from the profile.
- "confidence": "high" or "low".
- "resizeReqs": (ONLY FOR FILE UPLOADS) If the field label/text demands specific file size/dimensions, provide:
  {{"min_kb": 50, "max_kb": 100, "width_cm": 3.5, "height_cm": 4.5}} or null if not specified.

CRITICAL: Leave sensitive fields (password, CAPTCHA, OTP) empty (fillValue: null).
Respond ONLY with the pure raw JSON array. DO NOT wrap in markdown codeblocks. Do not include ```json.
"""
    try:
        parts = [prompt]
        if screenshot_b64:
            parts.insert(0, {'mime_type': 'image/png', 'data': screenshot_b64})

        res = await model.generate_content_async(parts)
        raw_text = res.text.strip()
        if raw_text.startswith("```json"): raw_text = raw_text[7:]
        if raw_text.startswith("```"): raw_text = raw_text[3:]
        raw_text = raw_text.rstrip("`").strip()

        return json.loads(raw_text)
    except Exception as e:
        print("AI Mapping failed, falling back to offline engine:", e)
        return populate_form_mappings(raw_fields, profile)


async def run_browser_automation(url, profile, auto_submit=False):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
        context = await browser.new_context(no_viewport=True)
        page = await context.new_page()

        audit_log = []
        def log(msg):
            print(f"[Agent] {msg}")
            audit_log.append(msg)

        log(f"Navigating to {url}")
        await page.goto(url, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(2000)

        page_title = await page.title()

        has_captcha = await page.evaluate("!!document.querySelector('.g-recaptcha, .h-captcha, iframe[src*=\"captcha\"]')")
        if has_captcha:
            log("CAPTCHA detected on page.")

        raw_fields = await page.evaluate('''() => {
            const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea');
            return Array.from(inputs).map((el, i) => {
                let label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
                if(el.id) {
                    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
                    if(l) label = label || l.innerText;
                }
                const parent = el.closest('label');
                if(parent && !label) label = parent.innerText;
                if(!label && el.previousElementSibling) label = el.previousElementSibling.innerText;

                return {
                    idx: i,
                    type: el.tagName.toLowerCase() === 'select' ? 'select' : el.getAttribute('type') || 'text',
                    id: el.id,
                    name: el.getAttribute('name'),
                    label: (label||"").trim(),
                    options: el.tagName.toLowerCase() === 'select' ? Array.from(el.options).map(o=>o.text) : []
                }
            });
        }''')

        screenshot_bytes = await page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')

        mode_label = "OFFLINE heuristic" if OFFLINE_MODE else "Gemini AI"
        log(f"Found {len(raw_fields)} fields. Sending to {mode_label} engine for mapping...")
        mappings = await analyze_form_advanced(page_title, url, profile, raw_fields, screenshot_b64)

        if not isinstance(mappings, list):
            mappings = []

        log(f"Engine returned {len(mappings)} mappings.")

        filled = 0
        for m in mappings:
            idx = m.get("idx")
            val = m.get("fillValue")
            reqs = m.get("resizeReqs")

            if val is None or val == "":
                continue

            field = next((f for f in raw_fields if f["idx"] == idx), None)
            if not field: continue

            locator = None
            if field["id"]: locator = page.locator(f"#{field['id']}").first
            elif field["name"]: locator = page.locator(f"[name='{field['name']}']").first
            else: locator = page.locator("input, select, textarea").nth(idx)

            try:
                await locator.scroll_into_view_if_needed()

                if field["type"] == "file":
                    if reqs and os.path.exists(val):
                        ext = val.lower().split(".")[-1]
                        target_path = val.replace(f".{ext}", f"_resized.{ext}")
                        log(f"Resizing file {val} with reqs: {reqs}")

                        if ext in ["jpg", "jpeg", "png"]:
                            val = resize_image(val, target_path, reqs.get("min_kb"), reqs.get("max_kb"), reqs.get("width_cm"), reqs.get("height_cm"))
                        elif ext == "pdf":
                            val = resize_pdf(val, target_path, reqs.get("min_kb"), reqs.get("max_kb"))

                    if val and os.path.exists(val):
                        await locator.set_input_files(val)
                        log(f"Uploaded file to field: {field['label']}")
                    else:
                        log(f"Skipped file upload (file not found): {val}")
                elif field["type"] == "select":
                    await locator.select_option(label=val)
                    log(f"Selected '{val}' for '{field['label']}'")
                elif field["type"] in ["radio", "checkbox"]:
                    await locator.check()
                    log(f"Checked '{field['label']}'")
                else:
                    await locator.fill(str(val))
                    log(f"Filled '{field['label']}' = '{val}'")
                filled += 1
                await page.wait_for_timeout(150)
            except Exception as e:
                log(f"Failed to fill field {idx} ('{field['label']}'): {e}")

        final_screenshot = base64.b64encode(await page.screenshot(full_page=True)).decode('utf-8')
        await browser.close()

        return {
            "success": True,
            "filledCount": filled,
            "auditLog": audit_log,
            "hasCaptcha": has_captcha,
            "screenshotBase64": final_screenshot
        }


async def run_analysis_automation(url):
    """Scan a page for form fields and take a screenshot without filling anything."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            print(f"[Scanner] Analyzing {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            await page.wait_for_timeout(1000)
            
            page_title = await page.title()
            
            has_captcha = await page.evaluate("!!document.querySelector('.g-recaptcha, .h-captcha, iframe[src*=\"captcha\"]')")
            
            raw_fields = await page.evaluate('''() => {
                const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea');
                return Array.from(inputs).map((el, i) => {
                    let label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
                    if(el.id) {
                        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
                        if(l) label = label || l.innerText;
                    }
                    const parent = el.closest('label');
                    if(parent && !label) label = parent.innerText;
                    if(!label && el.previousElementSibling) label = el.previousElementSibling.innerText;
                    
                    return {
                        idx: i,
                        type: el.tagName.toLowerCase() === 'select' ? 'select' : el.getAttribute('type') || 'text',
                        id: el.id,
                        name: el.getAttribute('name'),
                        label: (label||"").trim(),
                        options: el.tagName.toLowerCase() === 'select' ? Array.from(el.options).map(o=>o.text) : []
                    }
                });
            }''')
            
            screenshot_bytes = await page.screenshot(full_page=False)
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            return {
                "success": True,
                "url": url,
                "pageTitle": page_title,
                "fields": raw_fields,
                "hasCaptcha": has_captcha,
                "screenshotBase64": screenshot_b64
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            await browser.close()
