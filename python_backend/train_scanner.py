"""
FormBharo - Document Scanner Training Script
Scans 10 diverse documents from the 'doc datsheet' folder using Gemini Vision
and saves the extraction results into the learning store for continuous improvement.
"""

import os
import base64
import json
import asyncio
import sys
from pathlib import Path

# Setup path
sys.path.insert(0, os.path.dirname(__file__))

# Load env
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

LEARNING_FILE = os.path.join(os.path.dirname(__file__), "data", "learning_store.json")
DOC_DIR = r"C:\Users\ALOK\Desktop\formbharo\doc datsheet"

# ─────────────────────────────────────────────────────────────────
#  10 training documents: (filename, doc_type_hint)
# ─────────────────────────────────────────────────────────────────
TRAINING_DOCS = [
    ("SHALU ADHAR.pdf",              "aadhaar"),
    ("ABHPAN.pdf",                   "pan_card"),
    ("SHALU 10TH MARKSHEET.pdf",     "10th_marksheet"),
    ("ASHU12TH.pdf",                 "12th_marksheet"),
    ("Caste Certificate.pdf",        "category_certificate"),
    ("Income Certificate.pdf",       "income_certificate"),
    ("CertificateEWS.pdf",           "ews_certificate"),
    ("Residential Certificate.pdf",  "domicile_certificate"),
    ("ABHAY PASSBOOK.pdf",           "bank_passbook"),
    ("ADCA CERT MRKSHT.pdf",         "computer_certificate"),
]


def load_learning_store():
    if os.path.exists(LEARNING_FILE):
        with open(LEARNING_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"form_mappings": {}, "scan_corrections": [], "training_results": []}


def save_learning_store(store):
    os.makedirs(os.path.dirname(LEARNING_FILE), exist_ok=True)
    with open(LEARNING_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)


def encode_file(filepath: str) -> tuple:
    """Returns (base64_data, mime_type)"""
    ext = Path(filepath).suffix.lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    mime = mime_map.get(ext, "application/octet-stream")
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8"), mime


async def scan_one(filename: str, doc_type: str, idx: int):
    filepath = os.path.join(DOC_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  [!] File not found: {filepath}")
        return None

    print(f"\n{'='*60}")
    print(f"[{idx}/10] Scanning: {filename}")
    print(f"  Doc Type Hint: {doc_type}")
    print(f"  File Size: {os.path.getsize(filepath):,} bytes")

    try:
        b64, mime = encode_file(filepath)
        from agents.document_scanner import _gemini_scan  # always use Gemini for training
        result = await _gemini_scan(b64, mime, doc_type)

        if result.get("success"):
            data = result.get("extractedData", {})
            fields = [k for k, v in data.items() if v and not k.startswith("_")]
            print(f"  ✅ SUCCESS — {len(fields)} fields extracted")
            print(f"  Fields: {', '.join(fields[:12])}{'...' if len(fields) > 12 else ''}")
            # Pretty print extracted data
            print("  Extracted JSON:")
            print(json.dumps(data, indent=4, ensure_ascii=False))
        else:
            print(f"  ❌ FAILED: {result.get('error')}")

        return {
            "filename": filename,
            "doc_type": doc_type,
            "success": result.get("success"),
            "extracted": result.get("extractedData", {}),
            "field_count": result.get("fieldCount", 0),
            "error": result.get("error"),
        }

    except Exception as e:
        print(f"  ❌ EXCEPTION: {e}")
        return {"filename": filename, "doc_type": doc_type, "success": False, "error": str(e)}


async def main():
    print("\n" + "="*60)
    print("  FormBharo - Document Scanner Training Session")
    print("  Training on 10 diverse documents")
    print("="*60)

    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("\n❌ ERROR: GEMINI_API_KEY not set in .env.local")
        print("   Please add your API key to .env.local and try again.")
        return

    print(f"\n✅ Gemini API Key: {api_key[:12]}...")
    print(f"   Source folder: {DOC_DIR}\n")

    store = load_learning_store()
    if "training_results" not in store:
        store["training_results"] = []

    results = []
    for i, (filename, doc_type) in enumerate(TRAINING_DOCS, 1):
        result = await scan_one(filename, doc_type, i)
        if result:
            results.append(result)

            # Save successful extractions as scan_corrections for few-shot learning
            if result.get("success") and result.get("extracted"):
                # Avoid duplicates
                existing = [c for c in store.get("scan_corrections", [])
                            if c.get("filename") == filename]
                if not existing:
                    store.setdefault("scan_corrections", []).append({
                        "filename": filename,
                        "doc_type": doc_type,
                        "json": result["extracted"]
                    })

        # Small delay to avoid rate limiting
        await asyncio.sleep(1.5)

    # Save training batch to store
    store["training_results"].append({
        "batch_date": __import__("datetime").datetime.now().isoformat(),
        "docs_scanned": len(results),
        "successful": len([r for r in results if r.get("success")]),
        "results": results
    })
    save_learning_store(store)

    # Final summary
    print("\n" + "="*60)
    print("  TRAINING SUMMARY")
    print("="*60)
    success_count = len([r for r in results if r.get("success")])
    print(f"  Documents scanned : {len(results)}/10")
    print(f"  Successful        : {success_count}")
    print(f"  Failed            : {len(results) - success_count}")
    print(f"  Learning file     : {LEARNING_FILE}")
    print("\n  Per-document results:")
    for r in results:
        status = "✅" if r.get("success") else "❌"
        fc = r.get("field_count", 0)
        print(f"    {status} [{r['doc_type']:<30}] {r['filename']} ({fc} fields)")

    print("\n✅ Training complete. The scanner has learned from these documents.")
    print("   The extracted data is now stored in learning_store.json for few-shot use.\n")


if __name__ == "__main__":
    asyncio.run(main())
