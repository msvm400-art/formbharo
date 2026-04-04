import re
import difflib
import json
import os

LEARNING_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "learning_store.json")

def load_learning_data():
    if os.path.exists(LEARNING_FILE):
        try:
            with open(LEARNING_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

# ─────────────────────────────────────────────────────────────────
# 1. HELPER EXTRACTORS
# ─────────────────────────────────────────────────────────────────

def extract_dates(text):
    """Extract all DD/MM/YYYY or DD-MM-YYYY dates."""
    return re.findall(r'\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b', text)

def extract_aadhaar(text):
    """Match 12-digit Aadhaar: XXXX XXXX XXXX."""
    m = re.search(r'\b(\d{4}\s\d{4}\s\d{4})\b', text)
    return m.group(1) if m else None

def extract_pan(text):
    """Match PAN card: 5 letters + 4 digits + 1 letter."""
    m = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b', text)
    return m.group(1) if m else None

def extract_roll_no(text):
    m = re.search(r'(?i)(?:Roll\s*No\.?|Roll\s*Number|Anukramank|Anukraman|अनुक्रमांक)[^\d]*(\d+[A-Za-z0-9]*)', text)
    return m.group(1) if m else None

def extract_reg_no(text):
    m = re.search(r'(?i)(?:Registration\s*No\.?|Reg\.?\s*No\.?|Panjikaran\s*Sankhya|पंजीकरण\s*संख्या)[^\d]*([A-Za-z0-9/\-]+)', text)
    return m.group(1) if m else None

def extract_cert_no(text):
    """Generic certificate number extractor."""
    patterns = [
        r'(?i)(?:Praman\s*Patra\s*Krmank|Praman\s*Ptra\s*Kramank|Pramaan|प्रमाण\s*पत्र\s*क्रमांक)[^\w]*([A-Za-z0-9/\-]+)',
        r'(?i)(?:Certificate\s*No\.?|Cert\s*No\.?|Certificate\s*Number)[^\w]*([A-Za-z0-9/\-]+)',
        r'(?i)(?:Serial\s*No\.?|S\.?No\.?)[^\w]*([A-Za-z0-9/\-]+)',
        r'(?i)(?:EWSCO|EWSDM|EWSSDO|BCCCO|BICCO|BRCCO)[/\-](\d{4}[/\-]\d+)',
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(1).strip()
    return None

def extract_ref_no(text):
    m = re.search(r'(?i)(?:Ref(?:erence)?\s*No\.?|Reference\s*Number)[^\w]*([A-Za-z0-9/\-]+)', text)
    return m.group(1).strip() if m else None

def extract_token_no(text):
    m = re.search(r'(?i)(?:Token\s*No\.?|Token\s*Number)[^\w]*([A-Za-z0-9]+)', text)
    return m.group(1).strip() if m else None

def extract_passing_year(text):
    m = re.search(r'(?i)(?:Year\s*of\s*Passing|Passing\s*Year|Uttirnata\s*Varsh)[^\d]*(\d{4})', text)
    if not m:
        m = re.search(r'\b(19[89]\d|20[012]\d)\b', text)
    return m.group(1) if m else None

def extract_month(text):
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
        "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    for m in months:
        if re.search(r'\b' + m + r'\b', text, re.IGNORECASE):
            return m
    return None

def extract_percentage(text):
    m = re.search(r'(?i)(?:Percentage|Marks\s*Obtained|प्रतिशत)[^\d]*(\d+\.?\d*)\s*%?', text)
    if not m:
        m = re.search(r'(\d{2,3}\.\d{1,2})\s*%', text)
    return m.group(1) if m else None

def extract_total_marks(text):
    m = re.search(r'(?i)(?:Total\s*Marks|Overall\s*Total)[^\d]*(\d+)\s*/\s*(\d+)', text)
    if m:
        return m.group(1), m.group(2)
    return None, None

def extract_ifsc(text):
    m = re.search(r'\b([A-Z]{4}0[A-Z0-9]{6})\b', text)
    return m.group(1) if m else None

def extract_account_no(text):
    m = re.search(r'(?i)(?:Account\s*No\.?|A/C\s*No\.?|Account\s*Number)[^\d]*(\d{9,18})', text)
    if not m:
        m = re.search(r'\b(\d{11,18})\b', text)
    return m.group(1) if m else None

def extract_pincode(text):
    m = re.search(r'\b(\d{6})\b', text)
    return m.group(1) if m else None

def extract_mobile(text):
    m = re.search(r'(?i)(?:Mobile|Phone|Mob\.?)[^\d]*([6-9]\d{9})', text)
    if not m:
        m = re.search(r'\b([6-9]\d{9})\b', text)
    return m.group(1) if m else None

def extract_name_from_line(line):
    """Extract a proper name (title case words) from a line."""
    m = re.search(r'(?i)(?:Name|Naam|नाम)[:\s]+([A-Za-z\s\.]+)', line)
    if m:
        name = m.group(1).strip()
        return name if len(name) > 2 else None
    return None

def extract_father_name(text):
    patterns = [
        r"(?i)(?:Father'?s?\s*Name|Pita\s*Ka\s*Naam|S/O|पिता का नाम|पिताजी का नाम)[:\s]+([A-Za-z\s\.]+)",
        r"(?i)(?:S/O)\s*([A-Za-z\s\.]+)",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            name = m.group(1).strip().rstrip(',.')
            if len(name) > 2:
                return name
    return None

def extract_mother_name(text):
    m = re.search(r"(?i)(?:Mother'?s?\s*Name|Mata\s*Ka\s*Naam|माता का नाम)[:\s]+([A-Za-z\s\.]+)", text)
    if m:
        return m.group(1).strip().rstrip(',.')
    return None

def extract_husband_name(text):
    m = re.search(r"(?i)(?:Husband'?s?\s*Name|Pati\s*Ka\s*Naam|W/O)[:\s]+([A-Za-z\s\.]+)", text)
    if m:
        return m.group(1).strip().rstrip(',.')
    return None

def extract_gender(text):
    if re.search(r'\b(Male|पुरुष)\b', text, re.IGNORECASE):
        return "Male"
    if re.search(r'\b(Female|स्त्री|महिला)\b', text, re.IGNORECASE):
        return "Female"
    if re.search(r'\b(Transgender|तृतीय लिंग)\b', text, re.IGNORECASE):
        return "Transgender"
    return None

def extract_category(text):
    if re.search(r'\b(OBC[-\s]NCL|Other Backward Class.*Non.Creamy)\b', text, re.IGNORECASE):
        return "OBC-NCL"
    if re.search(r'\b(SC|Scheduled\s*Caste|अनुसूचित\s*जाति)\b', text, re.IGNORECASE):
        return "SC"
    if re.search(r'\b(ST|Scheduled\s*Tribe|अनुसूचित\s*जनजाति)\b', text, re.IGNORECASE):
        return "ST"
    if re.search(r'\b(OBC|Other\s*Backward\s*Class|अन्य\s*पिछड़ा\s*वर्ग)\b', text, re.IGNORECASE):
        return "OBC"
    if re.search(r'\bEWS\b', text, re.IGNORECASE):
        return "EWS"
    if re.search(r'\b(General|UR|Unreserved|सामान्य)\b', text, re.IGNORECASE):
        return "General"
    return None

def extract_district(text):
    m = re.search(r'(?i)(?:District|Distt\.?|Jila|जिला)[:\s]+([A-Za-z\s]+)', text)
    if m:
        return m.group(1).strip().split('\n')[0].strip().rstrip(',.')
    return None

def extract_state(text):
    states = [
        "Bihar", "Uttar Pradesh", "Jharkhand", "West Bengal", "Odisha",
        "Rajasthan", "Madhya Pradesh", "Maharashtra", "Delhi", "Haryana",
        "Punjab", "Gujarat", "Karnataka", "Tamil Nadu", "Telangana",
        "Andhra Pradesh", "Assam", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh",
        "Jammu and Kashmir", "Goa", "Manipur", "Meghalaya", "Nagaland",
        "Tripura", "Arunachal Pradesh", "Mizoram", "Sikkim"
    ]
    for state in states:
        if re.search(r'\b' + re.escape(state) + r'\b', text, re.IGNORECASE):
            return state
    return None

def extract_sub_division(text):
    m = re.search(r'(?i)(?:Sub-?Division|Anumandal|अनुमंडल)[:\s]+([A-Za-z\s]+)', text)
    return m.group(1).strip().rstrip(',.') if m else None

def extract_block(text):
    m = re.search(r'(?i)(?:Block|Prakhand|प्रखंड)[:\s]+([A-Za-z\s]+)', text)
    return m.group(1).strip().rstrip(',.') if m else None

def extract_ward(text):
    m = re.search(r'(?i)(?:Ward\s*No\.?|Ward)[:\s]*(\d+)', text)
    return m.group(1) if m else None

def extract_police_station(text):
    m = re.search(r'(?i)(?:Police\s*Station|Thana|थाना)[:\s]+([A-Za-z\s]+)', text)
    return m.group(1).strip().split('\n')[0].strip().rstrip(',.') if m else None

def extract_annual_income(text):
    # Look for income figures (with or without Rs/₹)
    m = re.search(r'(?i)(?:Annual\s*Income|Total\s*Income|Varshik\s*Aay|वार्षिक\s*आय|आय)[:\s]*(?:Rs\.?|₹)?\s*([0-9,]+)', text)
    if m:
        return m.group(1).replace(',', '')
    return None

def extract_board_name(text):
    boards = [
        "Bihar School Examination Board", "BSEB",
        "Central Board of Secondary Education", "CBSE",
        "Indian Certificate of Secondary Education", "ICSE", "ISC",
        "National Institute of Open Schooling", "NIOS",
        "UP Board", "Uttar Pradesh Madhyamik Shiksha Parishad",
        "Jharkhand Academic Council", "JAC",
        "West Bengal Board",
        "Rajasthan Board of Secondary Education", "RBSE",
        "Madhya Pradesh Board", "MPBSE",
        "Maharashtra State Board", "MSBSHSE",
    ]
    for board in boards:
        if re.search(r'\b' + re.escape(board) + r'\b', text, re.IGNORECASE):
            return board
    # Generic fallback
    for line in text.split('\n'):
        if re.search(r'(?i)(board|parishad|council|university|shiksha)', line):
            return line.strip()
    return None

def extract_financial_year(text):
    m = re.search(r'\b(20\d{2}[-–]\d{2,4})\b', text)
    return m.group(1) if m else None

def extract_issuing_authority(text):
    designations = [
        "Sub-Divisional Magistrate", "SDM", "District Magistrate", "DM",
        "Collector", "Tehsildar", "Tahsildar", "Revenue Officer",
        "Circle Officer", "CO", "Block Development Officer", "BDO",
        "Sub-Divisional Officer", "SDO", "Naib Tehsildar"
    ]
    for line in text.split('\n'):
        for d in designations:
            if re.search(r'\b' + re.escape(d) + r'\b', line, re.IGNORECASE):
                return line.strip(), d
    return None, None

def extract_bank_name(text):
    banks = [
        "State Bank of India", "SBI", "Bank of India", "BOI",
        "Punjab National Bank", "PNB", "Canara Bank", "Bank of Baroda",
        "Union Bank", "HDFC Bank", "ICICI Bank", "Axis Bank",
        "UCO Bank", "Indian Bank", "Central Bank of India",
        "Allahabad Bank", "Dena Bank", "Vijaya Bank",
        "Bihar Gramin Bank", "Uttar Bihar Gramin Bank", "Dakshin Bihar Gramin Bank",
        "Post Office", "India Post Payments Bank", "IPPB"
    ]
    for bank in banks:
        if re.search(r'\b' + re.escape(bank) + r'\b', text, re.IGNORECASE):
            return bank
    return None

def extract_ident_mark(text):
    m = re.search(r'(?i)(?:Identification\s*Mark|Mark\s*of\s*Identification|Pehchaan\s*Chinh|पहचान\s*चिन्ह)[:\s]+([A-Za-z0-9\s,]+)', text)
    if m:
        return m.group(1).strip().rstrip(',.')
    return None

# ─────────────────────────────────────────────────────────────────
# 2. MAIN OFFLINE DOCUMENT SCANNER
# ─────────────────────────────────────────────────────────────────

def offline_scan_document(text: str, doc_type_hint: str) -> dict:
    """
    Heuristic-based document scanner using regex patterns.
    Used as a fast fallback when Gemini is not available.
    """
    data = {}
    hint = str(doc_type_hint or "").lower()
    dates = extract_dates(text)

    # ── Universal fields ────────────────────────────────────────
    if dates:
        data["dob"] = dates[0]
    if len(dates) > 1:
        data["issue_date"] = dates[-1]

    # Name extraction
    father = extract_father_name(text)
    if father:
        data["father_name"] = father
    mother = extract_mother_name(text)
    if mother:
        data["mother_name"] = mother
    husband = extract_husband_name(text)
    if husband:
        data["husband_name"] = husband

    gender = extract_gender(text)
    if gender:
        data["gender"] = gender

    district = extract_district(text)
    if district:
        data["district"] = district

    state = extract_state(text)
    if state:
        data["state"] = state

    pincode = extract_pincode(text)
    if pincode:
        data["pincode"] = pincode

    mobile = extract_mobile(text)
    if mobile:
        data["mobile"] = mobile

    # ── AADHAAR ──────────────────────────────────────────────────
    if "aadhaar" in hint or "uid" in hint or "uidai" in text.lower():
        data["aadhaar_number"] = extract_aadhaar(text)
        # Extract address block
        addr_m = re.search(r'(?i)(?:Address|पता)[:\s]+(.+?)(?=\n\n|\Z)', text, re.DOTALL)
        if addr_m:
            data["address_line1"] = addr_m.group(1).strip()[:100]

    # ── PAN CARD ─────────────────────────────────────────────────
    elif "pan" in hint or "income tax" in text.lower() or "permanent account" in text.lower():
        data["pan_number"] = extract_pan(text)

    # ── EDUCATION DOCUMENTS ──────────────────────────────────────
    if any(k in hint for k in ["10th", "12th", "graduation", "marksheet", "certificate", "diploma", "degree"]) or \
       any(k in text.lower() for k in ["board", "university", "roll no", "examination"]):

        data["roll_number"] = extract_roll_no(text)
        data["registration_number"] = extract_reg_no(text)
        data["certificate_number"] = extract_cert_no(text)
        data["year_of_passing"] = extract_passing_year(text)
        data["month_of_passing"] = extract_month(text)
        data["percentage"] = extract_percentage(text)
        obtained, max_marks = extract_total_marks(text)
        if obtained:
            data["total_marks_obtained"] = obtained
            data["total_max_marks"] = max_marks

        board = extract_board_name(text)
        if board:
            data["board_name"] = board
            data["board_type"] = "Central" if any(b in board.upper() for b in ["CBSE", "ICSE", "ISC", "NIOS"]) else "State"

        # Stream detection
        if re.search(r'\b(Science|PCM|PCB|Physics|Chemistry|Biology)\b', text, re.IGNORECASE):
            data["stream"] = "Science"
        elif re.search(r'\b(Commerce|Accountancy|Economics|Business)\b', text, re.IGNORECASE):
            data["stream"] = "Commerce"
        elif re.search(r'\b(Arts|History|Geography|Political|Hindi|Sanskrit)\b', text, re.IGNORECASE):
            data["stream"] = "Arts"

        # Result status
        if re.search(r'\b(PASS|Passed|Uttiirn)\b', text, re.IGNORECASE):
            data["result_status"] = "PASS"
        elif re.search(r'\b(FAIL|Anuttirn)\b', text, re.IGNORECASE):
            data["result_status"] = "FAIL"

        # Extract school/university name
        for line in text.split('\n'):
            ll = line.lower()
            if any(k in ll for k in ["school", "college", "vidyalaya", "shiksha"]) and len(line.strip()) > 5:
                data.setdefault("school_name", line.strip())
                break
        for line in text.split('\n'):
            ll = line.lower()
            if any(k in ll for k in ["university", "college", "vishwavidyalaya"]) and len(line.strip()) > 5:
                data.setdefault("university_name", line.strip())
                break

    # ── CERTIFICATES (Caste / Domicile / Income / EWS) ──────────
    if any(k in hint for k in ["category", "caste", "domicile", "income", "residence", "ews"]) or \
       any(k in text.lower() for k in ["praman patra", "certificate no", "krmank"]):

        data["certificate_number"] = extract_cert_no(text)
        data["reference_number"] = extract_ref_no(text)
        data["token_number"] = extract_token_no(text)
        data["sub_division"] = extract_sub_division(text)
        data["block"] = extract_block(text)
        data["ward_no"] = extract_ward(text)
        data["police_station"] = extract_police_station(text)
        data["financial_year"] = extract_financial_year(text)
        data["category"] = extract_category(text)
        data["identification_mark_1"] = extract_ident_mark(text)

        auth_line, auth_desig = extract_issuing_authority(text)
        if auth_line:
            data["issuing_authority_name"] = auth_line
        if auth_desig:
            data["issuing_authority_designation"] = auth_desig

        income = extract_annual_income(text)
        if income:
            data["annual_income"] = income

        # Sub-caste extraction
        m_sc = re.search(r'(?i)(?:Sub.?Caste|Upjati|उपजाति)[:\s]+([A-Za-z\s]+)', text)
        if m_sc:
            data["sub_caste"] = m_sc.group(1).strip().rstrip(',.')

        # Caste extraction
        m_c = re.search(r'(?i)(?:Jati|Caste\s*Name|जाति)[:\s]+([A-Za-z\s]+)', text)
        if m_c:
            data["caste"] = m_c.group(1).strip().rstrip(',.')

    # ── COMPUTER CERTIFICATE ─────────────────────────────────────
    if any(k in hint for k in ["computer", "adca", "dca", "ccc", "o-level"]) or \
       any(k in text.upper() for k in ["ADCA", "DCA", "DOEACC", "NIELIT", "CCC"]):
        data["certificate_number"] = extract_cert_no(text)
        data["registration_number"] = extract_reg_no(text)

        # Course name
        for course in ["ADCA", "DCA", "CCC", "O LEVEL", "A LEVEL", "B LEVEL"]:
            if course in text.upper():
                data["course_name"] = course
                break

        # Duration
        m_dur = re.search(r'(?i)(?:Duration)[:\s]+(\d+\s*(?:Month|Year|Week)s?)', text)
        if m_dur:
            data["duration"] = m_dur.group(1).strip()

        # Grade
        m_grade = re.search(r'(?i)(?:Grade|Result)[:\s]+([A-Z][+]?)', text)
        if m_grade:
            data["grade"] = m_grade.group(1).strip()

        data["percentage"] = extract_percentage(text)

    # ── BANK PASSBOOK ────────────────────────────────────────────
    if any(k in hint for k in ["bank", "passbook", "account"]) or \
       any(k in text.upper() for k in ["IFSC", "A/C NO", "ACCOUNT NO"]):
        data["account_number"] = extract_account_no(text)
        data["ifsc_code"] = extract_ifsc(text)
        data["bank_name"] = extract_bank_name(text)

        m_branch = re.search(r'(?i)(?:Branch)[:\s]+([A-Za-z\s,]+)', text)
        if m_branch:
            data["branch_name"] = m_branch.group(1).strip().rstrip(',.')

    # ── FULL NAME: best-effort from OCR ──────────────────────────
    if "full_name" not in data:
        for line in text.split('\n'):
            m = re.search(r'(?i)(?:Name(?:\s*of\s*Candidate)?|Naam|नाम)[:\s]+([A-Za-z\s\.]+)', line)
            if m:
                name = m.group(1).strip().rstrip(',.')
                if len(name) > 2:
                    data["full_name"] = name
                    break

    # Remove empty / None values
    data = {k: v for k, v in data.items() if v is not None and v != ""}
    return data


# ─────────────────────────────────────────────────────────────────
# 3. OFFLINE FORM FILLING (Heuristic Fuzzy Mapper)
# ─────────────────────────────────────────────────────────────────

def get_profile_value(profile, key):
    parts = key.split('.')
    v = profile
    for p in parts:
        if isinstance(v, dict):
            v = v.get(p)
        elif isinstance(v, list) and p.isdigit():
            v = v[int(p)]
        else:
            return None
    return str(v) if v is not None else None


def guess_field_mapping(label, field_type, profile):
    label_lower = label.lower().strip()

    # 0. Learning store lookup (user feedback — highest priority)
    learning = load_learning_data()
    saved_mappings = learning.get("form_mappings", {})
    if label_lower in saved_mappings:
        return saved_mappings[label_lower]
    for saved_label, profile_key in saved_mappings.items():
        if saved_label in label_lower or label_lower in saved_label:
            return profile_key

    # 1. File uploads (photo/signature/documents)
    if field_type == "file":
        if any(k in label_lower for k in ["aadhaar", "aadhar", "uid"]):
            return "documents.aadhaar.original_path"
        if any(k in label_lower for k in ["pan", "income tax"]):
            return "documents.pan.original_path"
        if any(k in label_lower for k in ["photo", "photograph", "swabhidhan", "स्वअभिप्रमाणित"]):
            return "documents.photo.original_path"
        if any(k in label_lower for k in ["sign", "signature", "हस्ताक्षर"]):
            return "documents.signature.original_path"
        if any(k in label_lower for k in ["10th", "matric", "high school"]):
            return "documents.10th.original_path"
        if any(k in label_lower for k in ["12th", "intermediate", "inter"]):
            return "documents.12th.original_path"
        if any(k in label_lower for k in ["caste", "category", "jaati"]):
            return "documents.caste.original_path"
        if any(k in label_lower for k in ["ews", "ewss"]):
            return "documents.ews.original_path"
        if any(k in label_lower for k in ["domicile", "niwas", "residence"]):
            return "documents.domicile.original_path"
        if any(k in label_lower for k in ["income", "aay"]):
            return "documents.income.original_path"
        if any(k in label_lower for k in ["thumb", "fingerprint"]):
            return "documents.thumb.original_path"

    # 2. Personal details
    if any(k in label_lower for k in ["father", "पिता"]):
        return "personal.father_name"
    if any(k in label_lower for k in ["mother", "माता"]):
        return "personal.mother_name"
    if any(k in label_lower for k in ["husband", "पति"]):
        return "personal.husband_name"
    if any(k in label_lower for k in ["salutation", "shri", "श्री"]):
        return "personal.salutation"
    if any(k in label_lower for k in ["name", "naam", "नाम"]):
        if not any(k in label_lower for k in ["school", "board", "university", "college", "institute"]):
            if "hindi" in label_lower or "हिंदी" in label_lower:
                return "personal.full_name_hindi"
            return "personal.full_name"
    if any(k in label_lower for k in ["dob", "birth", "जन्म", "date of birth"]):
        return "personal.dob"
    if any(k in label_lower for k in ["gender", "sex", "लिंग"]):
        return "personal.gender"
    if any(k in label_lower for k in ["religion", "धर्म"]):
        return "personal.religion"
    if any(k in label_lower for k in ["nationality", "राष्ट्रीयता"]):
        return "personal.nationality"
    if any(k in label_lower for k in ["marital", "vivah", "वैवाहिक"]):
        return "personal.marital_status"
    if any(k in label_lower for k in ["blood group", "रक्त समूह"]):
        return "personal.blood_group"
    if any(k in label_lower for k in ["profession", "occupation", "पेशा", "व्यवसाय"]):
        return "personal.profession"
    if any(k in label_lower for k in ["identification mark", "pehchaan", "पहचान"]):
        if "2" in label_lower or "second" in label_lower:
            return "personal.identification_mark_2"
        return "personal.identification_mark_1"
    if any(k in label_lower for k in ["domicile state", "niwas rajya"]):
        return "personal.domicile_state"
    if any(k in label_lower for k in ["residence type", "niwas prakar"]):
        return "personal.residence_type"
    if any(k in label_lower for k in ["card type", "id type", "identity type"]):
        return "personal.identity_card_type"

    # 3. Income details
    if any(k in label_lower for k in ["income", "aay", "आय"]):
        if any(k in label_lower for k in ["govt", "service", "sarkari"]):
            return "personal.income_details.govt_service"
        if any(k in label_lower for k in ["agri", "krishi", "farm"]):
            return "personal.income_details.agriculture"
        if any(k in label_lower for k in ["business", "vyapar", "व्यापार"]):
            return "personal.income_details.business"
        if any(k in label_lower for k in ["other", "anya", "अन्य"]):
            return "personal.income_details.other_sources"
        return "personal.income_details.total_annual"

    # 4. Caste / Category details
    if any(k in label_lower for k in ["sub-caste", "sub caste", "upjati", "उपजाति"]):
        return "personal.caste_details.sub_caste"
    if any(k in label_lower for k in ["category", "varg", "वर्ग"]):
        if "certificate" in label_lower or "no" in label_lower:
            return "certificates.category.certificate_number"
        return "personal.caste_details.category"
    if any(k in label_lower for k in ["caste", "jati", "जाति"]):
        if "serial" in label_lower or "no" in label_lower:
            return "personal.caste_details.caste_serial_no"
        return "personal.caste_details.caste"

    # 5. ID numbers
    if any(k in label_lower for k in ["aadhaar", "aadhar", "uid"]):
        return "personal.aadhaar"
    if "pan" in label_lower and "number" in label_lower:
        return "personal.pan"

    # 6. Contact
    if any(k in label_lower for k in ["mobile", "phone", "मोबाइल", "contact no"]):
        return "contact.mobile"
    if any(k in label_lower for k in ["email", "e-mail", "ईमेल"]):
        return "contact.email"

    # 7. Address fields
    if any(k in label_lower for k in ["permanent", "स्थायी"]):
        if "address" in label_lower:
            return "contact.permanent_address.line1"
        if "state" in label_lower:
            return "contact.permanent_address.state"
        if "district" in label_lower:
            return "contact.permanent_address.district"
        if "pin" in label_lower:
            return "contact.permanent_address.pincode"

    if any(k in label_lower for k in ["correspondence", "present", "current", "वर्तमान", "पत्राचार"]):
        if "address" in label_lower:
            return "contact.present_address.line1"
        if "state" in label_lower:
            return "contact.present_address.state"
        if "district" in label_lower:
            return "contact.present_address.district"
        if "pin" in label_lower:
            return "contact.present_address.pincode"

    if any(k in label_lower for k in ["address", "पता"]):
        return "contact.permanent_address.line1"
    if any(k in label_lower for k in ["state", "rajya", "राज्य"]):
        return "contact.permanent_address.state"
    if any(k in label_lower for k in ["district", "jila", "जिला"]):
        return "contact.permanent_address.district"
    if any(k in label_lower for k in ["pin", "zip", "postal", "पिन"]):
        return "contact.permanent_address.pincode"
    if any(k in label_lower for k in ["village", "town", "gram", "ग्राम", "मोहल्ला"]):
        return "contact.permanent_address.village_town"
    if any(k in label_lower for k in ["post office", "डाकघर"]):
        return "contact.permanent_address.post_office"
    if any(k in label_lower for k in ["police", "thana", "थाना"]):
        if not any(k in label_lower for k in ["domicile", "history", "residence"]):
            return "contact.permanent_address.police_station"
    if any(k in label_lower for k in ["sub-division", "anumandal", "अनुमंडल"]):
        return "contact.permanent_address.sub_division"
    if any(k in label_lower for k in ["block", "prakhand", "प्रखंड"]):
        return "contact.permanent_address.block"
    if any(k in label_lower for k in ["ward", "वार्ड"]):
        return "contact.permanent_address.ward_no"
    if any(k in label_lower for k in ["local body", "nagar", "panchayat", "निकाय"]):
        return "contact.permanent_address.local_body_type"

    # 8. Character / residence history
    if any(k in label_lower for k in ["residence history", "domicile history", "domicile", "अधिवास"]):
        if "type" in label_lower or "address" in label_lower:
            return "contact.residence_history.0.address"
        if "district" in label_lower:
            return "contact.residence_history.0.district"
        if "police" in label_lower:
            return "contact.residence_history.0.police_station"
        if "from month" in label_lower or "महीने से" in label_lower:
            return "contact.residence_history.0.from_month"
        if "from year" in label_lower or "वर्ष से" in label_lower:
            return "contact.residence_history.0.from_year"
        if "to month" in label_lower or "महीने तक" in label_lower:
            return "contact.residence_history.0.to_month"
        if "to year" in label_lower or "वर्ष तक" in label_lower:
            return "contact.residence_history.0.to_year"

    # 9. Education: 10th
    if any(k in label_lower for k in ["10th", "matric", "high school", "madhyamic", "मैट्रिक"]):
        if any(k in label_lower for k in ["board", "university"]):
            return "education.0.board"
        if any(k in label_lower for k in ["school", "institution", "college"]):
            return "education.0.school"
        if "roll" in label_lower:
            return "education.0.roll_no"
        if any(k in label_lower for k in ["year", "passing"]):
            return "education.0.year_of_passing"
        if "month" in label_lower:
            return "education.0.month_of_passing"
        if any(k in label_lower for k in ["percent", "marks", "aggregate"]):
            return "education.0.percentage"
        if "cgpa" in label_lower:
            return "education.0.cgpa"
        if "stream" in label_lower:
            return "education.0.stream"

    # 10. Education: 12th
    if any(k in label_lower for k in ["12th", "inter", "intermediate", "senior secondary"]):
        if any(k in label_lower for k in ["board", "university"]):
            return "education.1.board"
        if any(k in label_lower for k in ["school", "institution", "college"]):
            return "education.1.school"
        if "roll" in label_lower:
            return "education.1.roll_no"
        if any(k in label_lower for k in ["year", "passing"]):
            return "education.1.year_of_passing"
        if "month" in label_lower:
            return "education.1.month_of_passing"
        if any(k in label_lower for k in ["percent", "marks", "aggregate"]):
            return "education.1.percentage"
        if "cgpa" in label_lower:
            return "education.1.cgpa"
        if "stream" in label_lower:
            return "education.1.stream"

    # 11. Education: Graduation
    if any(k in label_lower for k in ["graduat", "degree", "bachelor", "b.a", "b.sc", "b.com"]):
        if "university" in label_lower:
            return "education.2.university"
        if any(k in label_lower for k in ["college", "institution"]):
            return "education.2.college"
        if any(k in label_lower for k in ["year", "passing"]):
            return "education.2.year_of_passing"
        if "month" in label_lower:
            return "education.2.month_of_passing"
        if any(k in label_lower for k in ["percent", "marks"]):
            return "education.2.percentage"
        if "cgpa" in label_lower:
            return "education.2.cgpa"
        if any(k in label_lower for k in ["branch", "specialization", "course"]):
            return "education.2.branch"

    # 12. Education: Diploma
    if "diploma" in label_lower:
        if any(k in label_lower for k in ["university", "board"]):
            return "education.3.university"
        if any(k in label_lower for k in ["college", "institution"]):
            return "education.3.college"
        if any(k in label_lower for k in ["year", "passing"]):
            return "education.3.year_of_passing"
        if any(k in label_lower for k in ["percent", "marks"]):
            return "education.3.percentage"
        if any(k in label_lower for k in ["course", "subject"]):
            return "education.3.course_name"
        if "roll" in label_lower:
            return "education.3.roll_no"

    # 13. Education: Post Graduation
    if any(k in label_lower for k in ["post grad", "pg", "master", "m.a", "m.sc", "m.com"]):
        if "university" in label_lower:
            return "education.4.university"
        if any(k in label_lower for k in ["college", "institution"]):
            return "education.4.college"
        if any(k in label_lower for k in ["year", "passing"]):
            return "education.4.year_of_passing"
        if any(k in label_lower for k in ["percent", "marks"]):
            return "education.4.percentage"
        if any(k in label_lower for k in ["branch", "degree", "course"]):
            return "education.4.branch"

    # 14. Certificate numbers by type
    if any(k in label_lower for k in ["certificate no", "cert no", "praman patra"]):
        if any(k in label_lower for k in ["ews", "ewss"]):
            return "certificates.ews.certificate_number"
        if any(k in label_lower for k in ["caste", "category", "jaati"]):
            return "certificates.category.certificate_number"
        if any(k in label_lower for k in ["income", "aay"]):
            return "certificates.income.certificate_number"
        if any(k in label_lower for k in ["domicile", "niwas"]):
            return "certificates.domicile.certificate_number"

    # 15. Agreement / checkbox
    if any(k in label_lower for k in ["i agree", "agree", "i accept", "sहमति", "घोषणा"]):
        return "LITERAL:true"

    return None


def extract_resize_reqs(label):
    reqs = {}
    kb_match = re.findall(r'(\d+)\s*k[b]?\s*(?:to|-)\s*(\d+)\s*k[b]?', label.lower())
    if kb_match:
        reqs["min_kb"] = int(kb_match[0][0])
        reqs["max_kb"] = int(kb_match[0][1])

    cm_match = re.findall(r'(\d+\.?\d*)\s*cm\s*[x×*]\s*(\d+\.?\d*)\s*cm', label.lower())
    if cm_match:
        reqs["width_cm"] = float(cm_match[0][0])
        reqs["height_cm"] = float(cm_match[0][1])

    px_match = re.findall(r'(\d+)\s*(?:px|pixel)\s*[x×*]\s*(\d+)\s*(?:px|pixel)', label.lower())
    if px_match:
        reqs["width_px"] = int(px_match[0][0])
        reqs["height_px"] = int(px_match[0][1])

    return reqs if reqs else None


def populate_form_mappings(raw_fields, profile):
    mappings = []
    for field in raw_fields:
        label = field.get("label", "")
        f_type = field.get("type", "text")
        idx = field.get("idx")

        # Skip sensitive fields
        sensitive = ["password", "otp", "captcha", "security code", "pin", "secret"]
        if any(s in label.lower() for s in sensitive):
            continue

        profile_key = guess_field_mapping(label, f_type, profile)
        if profile_key:
            if profile_key.startswith("LITERAL:"):
                val = profile_key.split(":", 1)[1]
            else:
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
