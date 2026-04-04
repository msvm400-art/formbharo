import sys
import os
import json
import io

# Set encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add current dir to path to import offline_ai
sys.path.append(os.path.join(os.path.dirname(__file__), "agents"))
from offline_ai import populate_form_mappings

# Mock Profile
mock_profile = {
    "personal": {
        "full_name": "Aman Shrivastav",
        "salutation": "Mr.",
        "husband_name": "",
        "gender": "Male",
        "aadhaar": "1234 5678 9012",
        "residence_type": "Permanent"
    },
    "contact": {
        "mobile": "9876543210",
        "email": "aman@example.com",
        "permanent_address": {
            "sub_division": "Patna Sadar",
            "block": "Sampatchak",
            "village_town": "Marchi",
            "ward_no": "12",
            "post_office": "Sampatchak",
            "police_station": "Sampatchak",
            "pincode": "800007",
            "local_body_type": "Gram Panchayat"
        }
    },
    "documents": {
        "photo": {"original_path": "/uploads/photo.jpg"}
    }
}

# Mock Bihar ServicePlus Fields (Hindi/English Labels)
mock_fields = [
    {"idx": 0, "label": "लिंग / Gender", "type": "radio"},
    {"idx": 1, "label": "अभिवादन / Salutation", "type": "select"},
    {"idx": 2, "label": "Name of Applicant * आवेदक / आवेदिका का नाम *", "type": "text"},
    {"idx": 3, "label": "मोबाइल संख्या / Mobile No.", "type": "text"},
    {"idx": 4, "label": "अनुमंडल / Sub-Division", "type": "select"},
    {"idx": 5, "label": "प्रखंड / Block", "type": "select"},
    {"idx": 6, "label": "वार्ड संख्या / Ward No.", "type": "text"},
    {"idx": 7, "label": "ग्राम (Village) / मोहल्ला (Town)", "type": "text"},
    {"idx": 8, "label": "डाक घर / Post Office", "type": "text"},
    {"idx": 9, "label": "थाना / Police Station", "type": "select"},
    {"idx": 10, "label": "आवेदक का स्वअभिप्रमाणित फोटो / Self attested photograph", "type": "file"},
    {"idx": 11, "label": "निवास का प्रकार / Type of Residence", "type": "radio"},
    {"idx": 12, "label": "I Agree", "type": "checkbox"}
]

print("Running Bihar ServicePlus Mapping Test...")
mappings = populate_form_mappings(mock_fields, mock_profile)

mapped_keys = {m['idx']: m['profileKey'] for m in mappings}

expected_mappings = {
    0: "personal.gender",
    1: "personal.salutation",
    2: "personal.full_name",
    3: "contact.mobile",
    4: "contact.permanent_address.sub_division",
    5: "contact.permanent_address.block",
    6: "contact.permanent_address.ward_no",
    7: "contact.permanent_address.village_town",
    8: "contact.permanent_address.post_office",
    9: "contact.permanent_address.police_station",
    10: "documents.photo.original_path",
    11: "personal.residence_type",
    12: "LITERAL:true"
}

success = True
for idx, key in expected_mappings.items():
    found_key = mapped_keys.get(idx)
    if found_key == key:
        print(f"✅ Field {idx} ({mock_fields[idx]['label']}) -> {found_key}")
    else:
        print(f"❌ Field {idx} ({mock_fields[idx]['label']}) -> Expected {key}, got {found_key}")
        success = False

if success:
    print("\n🎉 ALL BIHAR SERVICEPLUS FIELDS MAPPED CORRECTLY!")
else:
    print("\n⚠️ SOME MAPPINGS FAILED.")
