import sys
import os
import json
import io

# Set encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add current dir to path to import offline_ai
sys.path.append(os.path.join(os.path.dirname(__file__), "agents"))
from offline_ai import populate_form_mappings

# Mock Profile with full new fields
mock_profile = {
    "personal": {
        "full_name": "Aman Shrivastav",
        "profession": "Farmer",
        "caste_details": {
            "category": "OBC",
            "caste": "Kushwaha",
            "caste_serial_no": "123"
        },
        "income_details": {
            "govt_service": "0",
            "agriculture": "150000",
            "business": "0",
            "other_sources": "10000",
            "total_annual": "160000"
        }
    },
    "contact": {
        "residence_history": [
            {
                "address": "Village Marchi, Patna",
                "district": "Patna",
                "police_station": "Sampatchak",
                "from_month": "January",
                "from_year": "2024",
                "to_month": "March",
                "to_year": "2026"
            }
        ]
    }
}

# Mock Bihar Certificate Fields
mock_fields = [
    # Caste Form
    {"idx": 0, "label": "पेशा / Profession", "type": "select"},
    {"idx": 1, "label": "वर्ग / Category", "type": "select"},
    {"idx": 2, "label": "जाति / Caste", "type": "select"},
    {"idx": 3, "label": "जाति अनुक्रमांक / Caste Serial number", "type": "text"},
    
    # Income Form
    {"idx": 4, "label": "सरकारी सेवा से आय / Income from Govt. Service", "type": "text"},
    {"idx": 5, "label": "कृषि से आय / Income from Agriculture", "type": "text"},
    {"idx": 6, "label": "व्यवसायिक आय / Income from Business", "type": "text"},
    {"idx": 7, "label": "अन्य स्रोतों से आय / Income from Other Sources", "type": "text"},
    {"idx": 8, "label": "कुल आय (वार्षिक) / Total income (Annual)", "type": "text"},
    
    # Character Certificate Table (Simulated labels)
    {"idx": 9, "label": "अधिवास प्रकार / Domicile Type", "type": "text"},
    {"idx": 10, "label": "जिला (अधिवास) / District (Domicile)", "type": "select"},
    {"idx": 11, "label": "थाना (अधिवास) / Police Station (Domicile)", "type": "select"},
    {"idx": 12, "label": "महीने से / From Month", "type": "select"},
    {"idx": 13, "label": "वर्ष से / From Year", "type": "select"}
]

print("Running Bihar Certificate Suite Mapping Test...")
mappings = populate_form_mappings(mock_fields, mock_profile)

mapped_keys = {m['idx']: m['profileKey'] for m in mappings}

expected_mappings = {
    0: "personal.profession",
    1: "personal.caste_details.category",
    2: "personal.caste_details.caste",
    3: "personal.caste_details.caste_serial_no",
    4: "personal.income_details.govt_service",
    5: "personal.income_details.agriculture",
    6: "personal.income_details.business",
    7: "personal.income_details.other_sources",
    8: "personal.income_details.total_annual",
    9: "contact.residence_history.0.address",
    10: "contact.residence_history.0.district",
    11: "contact.residence_history.0.police_station",
    12: "contact.residence_history.0.from_month",
    13: "contact.residence_history.0.from_year"
}

success = True
for field in mock_fields:
    res = populate_form_mappings([field], mock_profile)
    mapping = res[0] if res else None
    
    label = field['label']
    idx = field['idx']
    
    # Also get the raw guess to see if it's get_profile_value failing
    from offline_ai import guess_field_mapping
    g_key = guess_field_mapping(label, field['type'], mock_profile)
    
    found_key = mapping['profileKey'] if mapping else None
    expected_key = expected_mappings.get(idx)
    
    if found_key == expected_key:
        print(f"✅ Field {idx} ({label}) -> {found_key}")
    else:
        print(f"❌ Field {idx} ({label}) -> Expected {expected_key}, found {found_key} (Guess: {g_key})")
        success = False

if success:
    print("\n🎉 ALL BIHAR SUITE FIELDS MAPPED CORRECTLY!")
else:
    print("\n⚠️ SOME MAPPINGS FAILED.")
