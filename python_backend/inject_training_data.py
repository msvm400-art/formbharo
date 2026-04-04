import json
import os
import sys

LEARNING_FILE = r'C:\Users\ALOK\Desktop\formbharo\python_backend\data\learning_store.json'
PROFILES_FILE = r'C:\Users\ALOK\Desktop\formbharo\python_backend\data\shabhya_kumari_profile.json'

# --- 1. THE GOLD EXTRACTION DATA ---
shabhya_extracted = {
    "personal": {
        "full_name": "Shabhya Kumari",
        "father_name": "Rana Pratap Singh",
        "mother_name": "Sangita Devi",
        "dob": "20/10/2003",
        "gender": "Female",
        "aadhaar": "704258600319",
        "profession": "Student",
        "caste_details": {
            "category": "General (EWS)",
            "caste": "Rajput",
            "caste_serial_no": "Not Found"
        },
        "identification_mark_1": "Mole on face",
        "income_details": {
            "govt_service": "0",
            "agriculture": "Not Specified",
            "business": "0",
            "other_sources": "Not Specified",
            "total_annual": "800000"
        }
    },
    "contact": {
        "permanent_address": {
            "line1": "Village Marchi, Patar",
            "village_town": "Patar",
            "post_office": "Patar",
            "police_station": "Raghunathpur",
            "sub_division": "Siwan Sadar",
            "district": "Siwan",
            "state": "Bihar",
            "pincode": "841502",
            "local_body_type": "Gram Panchayat"
        }
    },
    "education": [
        {
            "level": "10th",
            "board": "CBSE",
            "school": "Mahabiri Saraswati Vidya Mandir, Siwan",
            "roll_no": "7211892",
            "year_of_passing": "2017",
            "cgpa": "08.8",
            "result_status": "Pass"
        },
        {
            "level": "12th",
            "board": "CBSE",
            "school": "Mahabiri Saraswati Vidya Mandir, Siwan",
            "roll_no": "7669266",
            "year_of_passing": "2019",
            "subjects": [
                {"name": "English Core", "total_marks": "45"},
                {"name": "Biology", "total_marks": "71"},
                {"name": "Physics", "total_marks": "54"},
                {"name": "Chemistry", "total_marks": "55"},
                {"name": "Physical Education", "total_marks": "71"}
            ],
            "result_status": "Pass"
        }
    ],
    "certificates": {
        "ews": {
            "certificate_number": "EWSCO/2023/58398",
            "issue_date": "21/02/2023",
            "issuing_office": "Anchal Karyalay, Ander",
            "financial_year": "2022-2023",
            "annual_income": "800000"
        }
    }
}

# --- 2. THE LEARNING EXAMPLES (Training the AI) ---
learning_examples = [
    {
        "doc_type": "AADHAAR CARD",
        "json": {
            "full_name": "Shabhya Kumari",
            "dob": "20/10/2003",
            "gender": "Female",
            "aadhaar_number": "704258600319"
        }
    },
    {
        "doc_type": "12th MARKSHEET",
        "json": {
            "student_name": "SHABHYA KUMARI",
            "roll_number": "7669266",
            "father_name": "RANA PRATAP SINGH",
            "mother_name": "SANGITA DEVI",
            "school_name": "MAHABIRI SARASWATI VIDYA MANDIR M PURAM SIWAN BR",
            "subjects": [
                {"name": "ENGLISH CORE", "total_marks": "45"},
                {"name": "BIOLOGY", "total_marks": "71"},
                {"name": "PHYSICS", "total_marks": "54"},
                {"name": "CHEMISTRY", "total_marks": "55"},
                {"name": "PHYSICAL EDUCATION", "total_marks": "71"}
            ]
        }
    },
    {
        "doc_type": "EWS CERTIFICATE",
        "json": {
            "full_name": "Shabhya Kumari",
            "father_name": "Rana Pratap Singh",
            "mother_name": "Sangita Devi",
            "certificate_number": "EWSCO/2023/58398",
            "issue_date": "21/02/2023",
            "annual_income": "800000",
            "district": "Siwan",
            "state": "Bihar",
            "pincode": "841502"
        }
    }
]

def main():
    try:
        # Load Existing Learning Store
        store = {"form_mappings": {}, "scan_corrections": []}
        if os.path.exists(LEARNING_FILE):
            with open(LEARNING_FILE, 'r', encoding='utf-8') as f:
                store = json.load(f)
        
        # Add training examples
        store["scan_corrections"].extend(learning_examples)
        
        # Save Learning Store (This "trains" the AI via few-shot in document_scanner.py)
        with open(LEARNING_FILE, 'w', encoding='utf-8') as f:
            json.dump(store, f, indent=2)
        print(f"✅ AI Scanner trained with {len(learning_examples)} new gold examples.")

        # Save Shabhya's Profile
        with open(PROFILES_FILE, 'w', encoding='utf-8') as f:
            json.dump(shabhya_extracted, f, indent=2)
        print(f"✅ Detailed profile created for Shabhya Kumari at {PROFILES_FILE}")

        # Also inject current mappings to "lock in" Shabhya's field preferences
        shabhya_mappings = {
           "name of candidate": "personal.full_name",
           "apna naam": "personal.full_name",
           "school name": "education.1.school",
           "certificate no": "certificates.ews.certificate_number"
        }
        store["form_mappings"].update(shabhya_mappings)
        with open(LEARNING_FILE, 'w', encoding='utf-8') as f:
            json.dump(store, f, indent=2)
        print(f"✅ Form-filling rules updated for Shabhya's common field labels.")

    except Exception as e:
        print(f"❌ Error during training: {e}")

if __name__ == "__main__":
    main()
