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

def extract_roll_no(text):
    m = re.search(r'(?i)(?:Roll\s*No\.?|Roll\s*Number|Anukramank)[\s:]*([A-Za-z0-9]+)', text)
    return m.group(1) if m else None

def extract_cert_no(text):
    m = re.search(r'(?i)(?:Cert(?:\.|ificate)?\s*No\.?|S\.?No\.?|Serial\s*No\.?|Praman\s*Patra\s*Kramank)[\s:]*([A-Za-z0-9/.\-]+)', text)
    return m.group(1) if m else None

def extract_passing_year(text):
    # Look for Year of Passing: 20XX or just simple 4 digits between 1980-2030 after certain words.
    m = re.search(r'(?i)(?:Year\s*of\s*Passing|Passing\s*Year)[\s:]*(\d{4})', text)
    if not m:
        m = re.search(r'\b(19\d{2}|20[0-2]\d)\b', text)
    return m.group(1) if m else None

def offline_scan_document(text, doc_type_hint):
    data = {}
    dates = extract_dates(text)
    hint = str(doc_type_hint).lower()
    
    # Try basic guesses
    data["dob"] = dates[0] if dates else ""
    # Usually the last date is issue date or the second one.
    if len(dates) > 1:
        data["issue_date"] = dates[-1]
    
    if "aadhaar" in hint or "uidai" in text.lower():
        data["aadhaar_number"] = extract_aadhaar(text)
    elif "pan" in hint or "income tax" in text.lower():
        data["pan_number"] = extract_pan(text)
    
    # Deep Scanning logic for Education
    if "10th" in hint or "12th" in hint or "graduation" in hint or "board" in text.lower() or "university" in text.lower():
        data["roll_number"] = extract_roll_no(text)
        data["certificate_number"] = extract_cert_no(text)
        data["year_of_passing"] = extract_passing_year(text)
        
        # Try to find board or university name (heuristic: line containing 'Board', 'University', 'Siksha Parishad', 'Council')
        for line in text.split('\n'):
            line_lower = line.lower()
            if "board" in line_lower or "university" in line_lower or "council" in line_lower or "parishad" in line_lower:
                data["board_name"] = line.strip()
                break
                
        # Look for Father's name / Mother's name
        m_fname = re.search(r'(?i)(?:Father\'s\s*Name|S/O|D/O|C/O)[\s:]*([A-Za-z\s]+)', text)
        if m_fname: data["father_name"] = m_fname.group(1).strip()
        m_mname = re.search(r'(?i)(?:Mother\'s\s*Name)[\s:]*([A-Za-z\s]+)', text)
        if m_mname: data["mother_name"] = m_mname.group(1).strip()
        
    # Deep Scanning logic for Category / Reservation
    if "category" in hint or "caste" in hint or "domicile" in hint or "income" in hint or "praman patra" in text.lower():
        data["certificate_number"] = extract_cert_no(text)
        
        # Determine category type
        if re.search(r'\b(SC|Scheduled Caste|अनुसचित जाति)\b', text, re.IGNORECASE):
            data["category"] = "SC"
        elif re.search(r'\b(ST|Scheduled Tribe|अनुसूचित जनजाति)\b', text, re.IGNORECASE):
            data["category"] = "ST"
        elif re.search(r'\b(OBC|Other Backward Class|अन्य पिछड़ा वर्ग)\b', text, re.IGNORECASE):
            data["category"] = "OBC"
        elif re.search(r'\b(EWS)\b', text, re.IGNORECASE):
            data["category"] = "EWS"
        elif re.search(r'\b(General|UR)\b', text, re.IGNORECASE):
            data["category"] = "General"
            
        # Determine issuing authority (heuristic matches)
        auth_patterns = [
            r'(?i)(Tehsildar|Tahsildar|Magistrate|Sub-Divisional Magistrate|SDM|District Magistrate|DM|Collector)',
            r'(?i)(Tahsil|Distt|District)[\s:]*([A-Za-z\s]+)'
        ]
        authorities = []
        for line in text.split('\n'):
            for p in auth_patterns:
                if re.search(p, line):
                    authorities.append(line.strip())
        if authorities:
            data["issuing_authority_name"] = authorities[0] # Take the most specific matching line
            
    # Extremely basic name extraction (usually caps near DOB)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if "dob" in line.lower() or "year of birth" in line.lower():
            if i > 0 and "full_name" not in data:
                data["full_name"] = lines[i-1].strip()
        if re.search(r'(?i)(?:Name|Name of Candidate)[\s:]+([A-Za-z\s]+)', line):
            m = re.search(r'(?i)(?:Name|Name of Candidate)[\s:]+([A-Za-z\s]+)', line)
            data["full_name"] = m.group(1).strip()
            
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
    if "nationality" in label_lower or "राष्ट्रीयता" in label_lower:
        return "personal.nationality"
    if "domicile" in label_lower or "निवास" in label_lower:
        return "personal.domicile_state"

        
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
    if "permanent" in label_lower or "स्थायी" in label_lower:
        if "address" in label_lower: return "contact.permanent_address.line1"
        if "state" in label_lower: return "contact.permanent_address.state"
        if "district" in label_lower: return "contact.permanent_address.district"
        if "pin" in label_lower: return "contact.permanent_address.pincode"
        
    if "correspondence" in label_lower or "present" in label_lower or "पत्राचार" in label_lower or "वर्तमान" in label_lower:
        if "address" in label_lower: return "contact.present_address.line1"
        if "state" in label_lower: return "contact.present_address.state"
        if "district" in label_lower: return "contact.present_address.district"
        if "pin" in label_lower: return "contact.present_address.pincode"

    if "address" in label_lower or "पता" in label_lower:
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
