import sys
import os
import json

# Add current dir to path to import offline_ai
sys.path.append(os.path.join(os.path.dirname(__file__), "agents"))
from offline_ai import populate_form_mappings

# Mock Profile
mock_profile = {
    "personal": {
        "full_name": "Rajesh Kumar",
        "identity_card_type": "Aadhaar Card",
        "identification_mark_1": "Mole on right cheek",
        "identification_mark_2": "Cut mark on forehead"
    },
    "education": [
        {"level": "10th", "year_of_passing": "2018", "percentage": "85"},
        {"level": "12th", "year_of_passing": "2020", "percentage": "82"},
        {"level": "Graduation", "year_of_passing": "2023", "percentage": "78"},
        {"level": "Diploma", "year_of_passing": "2021", "percentage": "75", "course_name": "Mechanical"},
        {"level": "Post Graduation", "year_of_passing": "2025", "percentage": "80", "branch": "Thermal"}
    ]
}

# Mock SSB Fields
mock_fields = [
    {"idx": 0, "label": "Full Name", "type": "text"},
    {"idx": 1, "label": "Identity Card Type", "type": "select"},
    {"idx": 2, "label": "Mark of Identification 1", "type": "text"},
    {"idx": 3, "label": "Mark of Identification 2", "type": "text"},
    {"idx": 4, "label": "Diploma Passing Year", "type": "text"},
    {"idx": 5, "label": "Post Graduate Degree", "type": "text"},
    {"idx": 6, "label": "Diploma Percentage", "type": "text"}
]

print("Running SSB Mapping Test...")
mappings = populate_form_mappings(mock_fields, mock_profile)

for m in mappings:
    print(f"Field {m['idx']} mapped to {m['profileKey']} with value: {m['fillValue']}")

# check if all expected fields are present
mapped_indices = [m['idx'] for m in mappings]
expected_indices = [0, 1, 2, 3, 4, 5, 6]

if all(idx in mapped_indices for idx in expected_indices):
    print("\n✅ SUCCESS: All SSB specific fields mapped correctly!")
else:
    missing = [idx for idx in expected_indices if idx not in mapped_indices]
    print(f"\n❌ FAILURE: Missing mappings for indices: {missing}")
