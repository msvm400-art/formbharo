import re
import difflib

# ─────────────────────────────────────────────────────────────────
# 1. OFFLINE DOCUMENT SCANNER (Regex-based Extractor)
# ─────────────────────────────────────────────────────────────────

def extract_dates(text):
    # Match DD/MM/YYYY or DD-MM-YYYY
    matches = re.findall(r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b', text)
    return matches

def extract_aadhaar(text):
    # Match XXXX XXXX XXXX
    m = re.search(r'\b\d{4}\s\d{4}\s\d{4}\b', text)
    return m.group(0) if m else None

def extract_pan(text):
    # Match 5 letters, 4 digits, 1 letter
    m = re.search(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b', text)
    return m.group(0) if m else None

def offline_scan_document(text, doc_type_hint):
    data = {}
    dates = extract_dates(text)
    
    # Try basic guesses
    data["dob"] = dates[0] if dates else ""
    data["issue_date"] = dates[1] if len(dates) > 1 else ""
    
    if "aadhaar" in str(doc_type_hint).lower() or "uidai" in text.lower():
        data["aadhaar_number"] = extract_aadhaar(text)
    elif "pan" in str(doc_type_hint).lower() or "income tax" in text.lower():
        data["pan_number"] = extract_pan(text)
        
    # Extremely basic name extraction (usually caps near DOB)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if "dob" in line.lower() or "year of birth" in line.lower():
            if i > 0: data["full_name"] = lines[i-1].strip()
            
    return data

# ─────────────────────────────────────────────────────────────────
# 2. OFFLINE FORM FILLING (Heuristic Fuzzy Matcher)
# ─────────────────────────────────────────────────────────────────

def get_profile_value(profile, key):
    parts = key.split('.')
    v = profile
    for p in parts:
        if isinstance(v, dict): v = v.get(p)
        elif isinstance(v, list) and p.isdigit(): v = v[int(p)]
        else: return None
    return str(v) if v is not None else None

def guess_field_mapping(label, field_type, profile):
    label_lower = label.lower()
    
    # 1. Photos & Signatures
    if field_type == "file":
        if "photo" in label_lower or "image" in label_lower or "picture" in label_lower:
            return "documents.photo.original_path"
        if "signature" in label_lower or "sign" in label_lower:
            return "documents.signature.original_path"
        if "10th" in label_lower and "mark" in label_lower:
            return "certificates.10th.original_path"
        if "12th" in label_lower and "mark" in label_lower:
            return "certificates.12th.original_path"
        if "aadhar" in label_lower or "aadhaar" in label_lower:
            return "documents.aadhaar.original_path"
            
    # 2. Personal Details
    if "father" in label_lower or "पिता" in label_lower:
        return "personal.father_name"
    if "mother" in label_lower or "माता" in label_lower:
        return "personal.mother_name"
    if "name" in label_lower and "school" not in label_lower and "board" not in label_lower and "university" not in label_lower:
        return "personal.full_name"
    if "dob" in label_lower or "birth" in label_lower or "जन्म" in label_lower:
        return "personal.dob"
    if "gender" in label_lower or "sex" in label_lower or "लिंग" in label_lower:
        return "personal.gender"
    if "category" in label_lower or "caste" in label_lower or "जाति" in label_lower:
        return "personal.category"
    if "religion" in label_lower or "धर्म" in label_lower:
        return "personal.religion"
    if "marital" in label_lower or "वैवाहिक" in label_lower:
        return "personal.marital_status"
        
    # 3. ID Numbers
    if "aadhar" in label_lower or "aadhaar" in label_lower:
        return "personal.aadhaar"
    if "pan" in label_lower:
        return "personal.pan"
        
    # 4. Contact
    if "mobile" in label_lower or "phone" in label_lower or "मोबाइल" in label_lower:
        return "contact.mobile"
    if "email" in label_lower or "e-mail" in label_lower:
        return "contact.email"
        
    # 5. Address
    if "address" in label_lower:
        return "contact.permanent_address.line1"
    if "state" in label_lower or "राज्य" in label_lower:
        return "contact.permanent_address.state"
    if "district" in label_lower or "जिला" in label_lower:
        return "contact.permanent_address.district"
    if "pin" in label_lower or "zip" in label_lower or "पिन" in label_lower:
        return "contact.permanent_address.pincode"
        
    # 6. Education 10th
    if "10th" in label_lower or "matric" in label_lower or "high school" in label_lower:
        if "board" in label_lower or "university" in label_lower: return "education.0.board"
        if "school" in label_lower or "institution" in label_lower: return "education.0.school"
        if "roll" in label_lower: return "education.0.roll_no"
        if "year" in label_lower or "passing" in label_lower: return "education.0.year_of_passing"
        if "percent" in label_lower or "marks" in label_lower: return "education.0.percentage"
        
    # 7. Education 12th
    if "12th" in label_lower or "inter" in label_lower or "senior secondary" in label_lower:
        if "board" in label_lower or "university" in label_lower: return "education.1.board"
        if "school" in label_lower or "institution" in label_lower: return "education.1.school"
        if "roll" in label_lower: return "education.1.roll_no"
        if "year" in label_lower or "passing" in label_lower: return "education.1.year_of_passing"
        if "percent" in label_lower or "marks" in label_lower: return "education.1.percentage"
        if "stream" in label_lower: return "education.1.stream"
        
    # 8. Graduation
    if "graduat" in label_lower or "degree" in label_lower or "bachelor" in label_lower:
        if "university" in label_lower: return "education.2.university"
        if "college" in label_lower or "institution" in label_lower: return "education.2.college"
        if "year" in label_lower or "passing" in label_lower: return "education.2.year_of_passing"
        if "percent" in label_lower or "marks" in label_lower: return "education.2.percentage"
        if "branch" in label_lower or "specialization" in label_lower: return "education.2.branch"
        
    return None

def extract_resize_reqs(label):
    reqs = {}
    kb_match = re.findall(r'(\d+)[ -]*k?b?\s*(to|-)\s*(\d+)\s*k?b?', label.lower())
    if kb_match:
        reqs["min_kb"] = int(kb_match[0][0])
        reqs["max_kb"] = int(kb_match[0][2])
    
    cm_match = re.findall(r'(\d+\.?\d*)\s*cm\s*(x|to|*)\s*(\d+\.?\d*)\s*cm', label.lower())
    if cm_match:
        reqs["width_cm"] = float(cm_match[0][0])
        reqs["height_cm"] = float(cm_match[0][2])
        
    return reqs if reqs else None

def populate_form_mappings(raw_fields, profile):
    mappings = []
    
    for field in raw_fields:
        label = field.get("label", "")
        f_type = field.get("type", "text")
        idx = field.get("idx")
        
        # skip sensitive
        sensitive = ["password", "otp", "captcha", "security code"]
        if any(s in label.lower() for s in sensitive):
            continue
            
        profile_key = guess_field_mapping(label, f_type, profile)
        if profile_key:
            val = get_profile_value(profile, profile_key)
            if val:
                reqs = extract_resize_reqs(label) if f_type == "file" else None
                mappings.append({
                    "idx": idx,
                    "profileKey": profile_key,
                    "fillValue": val,
                    "confidence": "high",
                    "resizeReqs": reqs
                })
                
    return mappings
