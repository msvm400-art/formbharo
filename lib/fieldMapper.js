/**
 * lib/fieldMapper.js
 * Semantic mapping of form field labels → profile JSON keys
 * Supports English and Hindi label patterns
 */

// Each entry: [regex pattern, profile key path, transform function name]
export const FIELD_MAPPINGS = [
  // === PERSONAL ===
  [/full\s*name|applicant\s*name|candidate\s*name|naam|पूरा नाम|अभ्यर्थी का नाम/i, "personal.full_name", null],
  [/father['s]*\s*name|पिता का नाम|pita ka naam/i, "personal.father_name", null],
  [/mother['s]*\s*name|माता का नाम|mata ka naam/i, "personal.mother_name", null],
  [/date\s*of\s*birth|dob|d\.o\.b|जन्म\s*तिथि|janm tithi/i, "personal.dob", "formatDate"],
  [/gender|sex|लिंग|ling/i, "personal.gender", "normalizeGender"],
  [/category|वर्ग|जाति वर्ग|caste\s*category/i, "personal.category", "normalizeCategory"],
  [/sub[\s-]*caste|sub[\s-]*category|उपजाति|जाति/i, "personal.sub_caste", null],
  [/religion|धर्म/i, "personal.religion", null],
  [/nationality|राष्ट्रीयता/i, "personal.nationality", null],
  [/marital\s*status|वैवाहिक\s*स्थिति/i, "personal.marital_status", null],
  [/aadhaar|aadhar|uid|आधार\s*नंबर/i, "personal.aadhaar", null],
  [/pan\s*(number|no|card)|पैन\s*(नंबर|नं)/i, "personal.pan", null],

  // === CONTACT ===
  [/mobile|phone|contact\s*no|मोबाइल|फ़ोन/i, "contact.mobile", null],
  [/alternate|अन्य\s*मोबाइल/i, "contact.alternate_mobile", null],
  [/email|ईमेल/i, "contact.email", null],

  // === ADDRESS ===
  [/house\s*no|door\s*no|flat\s*no|मकान\s*नंबर|address\s*line\s*1/i, "contact.permanent_address.line1", null],
  [/village|town|gram|गाँव|ग्राम|नगर/i, "contact.permanent_address.village_town", null],
  [/post\s*office|डाकघर/i, "contact.permanent_address.post_office", null],
  [/tehsil|taluka|block|तहसील|तालुका/i, "contact.permanent_address.tehsil", null],
  [/city|नगर|शहर/i, "contact.permanent_address.city", null],
  [/district|जिला/i, "contact.permanent_address.district", null],
  [/state|राज्य/i, "contact.permanent_address.state", null],
  [/pin\s*code|postal\s*code|पिन\s*कोड/i, "contact.permanent_address.pincode", null],

  // === 10TH EDUCATION ===
  [/10th?\s*(board|exam|class)|high\s*school\s*board|हाई\s*स्कूल\s*बोर्ड/i, "education[0].board", null],
  [/10th?\s*school|high\s*school\s*name/i, "education[0].school", null],
  [/10th?\s*roll\s*(no|number)|high\s*school\s*roll/i, "education[0].roll_no", null],
  [/10th?\s*(passing\s*year|year\s*of\s*passing)|हाई\s*स्कूल\s*उत्तीर्ण\s*वर्ष/i, "education[0].year_of_passing", null],
  [/10th?\s*percentage|हाई\s*स्कूल\s*प्रतिशत/i, "education[0].percentage", null],
  [/10th?\s*(total\s*marks|marks\s*obtained)/i, "education[0].marks_obtained", null],
  [/10th?\s*division|हाई\s*स्कूल\s*श्रेणी/i, "education[0].division", null],
  [/10th?\s*cgpa/i, "education[0].cgpa", null],
  [/10th?\s*certificate\s*(no|number)/i, "education[0].certificate_number", null],

  // === 12TH EDUCATION ===
  [/12th?\s*(board|exam|class)|inter(mediate)?\s*board|इंटर\s*बोर्ड/i, "education[1].board", null],
  [/12th?\s*school|inter\s*college\s*name/i, "education[1].school", null],
  [/12th?\s*roll\s*(no|number)|inter\s*roll/i, "education[1].roll_no", null],
  [/12th?\s*(passing\s*year|year\s*of\s*passing)/i, "education[1].year_of_passing", null],
  [/12th?\s*percentage|इंटर\s*प्रतिशत/i, "education[1].percentage", null],
  [/12th?\s*stream|faculty|विषय\s*समूह/i, "education[1].stream", null],
  [/12th?\s*division/i, "education[1].division", null],
  [/12th?\s*cgpa/i, "education[1].cgpa", null],
  [/12th?\s*certificate\s*(no|number)/i, "education[1].certificate_number", null],

  // === GRADUATION ===
  [/university\s*name|विश्वविद्यालय/i, "education[2].university", null],
  [/college\s*name|महाविद्यालय/i, "education[2].college", null],
  [/enrollment\s*(no|number)|नामांकन\s*(नं|संख्या)/i, "education[2].enrollment_no", null],
  [/degree\s*name|degree\s*type/i, "education[2].degree", null],
  [/branch|specialization|विशेषज्ञता/i, "education[2].branch", null],
  [/graduation\s*year|graduation\s*passing/i, "education[2].year_of_passing", null],
  [/graduation\s*percentage/i, "education[2].percentage", null],
  [/graduation\s*division|class\s*(of\s*degree)?/i, "education[2].division", null],
  [/degree\s*(certificate|number|no)/i, "education[2].degree_number", null],

  // === CATEGORY CERTIFICATE ===
  [/category\s*certificate\s*(no|number)|जाति\s*प्रमाण\s*पत्र\s*(संख्या|नं)/i, "certificates.category.certificate_number", null],
  [/category\s*certificate\s*(issue\s*)?date|जाति\s*प्रमाण\s*पत्र\s*(निर्गत\s*)?दिनांक/i, "certificates.category.issue_date", "formatDate"],
  [/category\s*certificate\s*validity|जाति\s*प्रमाण\s*पत्र\s*वैधता/i, "certificates.category.validity_date", "formatDate"],
  [/caste\s*certificate\s*(no|number)/i, "certificates.category.certificate_number", null],
  [/caste\s*certificate\s*(issue\s*)?date/i, "certificates.category.issue_date", "formatDate"],
  [/issuing\s*authority.*category|category.*issuing/i, "certificates.category.issuing_authority", null],

  // === DOMICILE CERTIFICATE ===
  [/domicile\s*certificate\s*(no|number)|मूल\s*निवास\s*प्रमाण\s*पत्र\s*(संख्या|नं)/i, "certificates.domicile.certificate_number", null],
  [/domicile\s*certificate\s*(issue\s*)?date|मूल\s*निवास.*दिनांक/i, "certificates.domicile.issue_date", "formatDate"],
  [/domicile\s*certificate\s*validity/i, "certificates.domicile.validity_date", "formatDate"],
  [/residence\s*certificate\s*(no|number)/i, "certificates.domicile.certificate_number", null],
  [/residence\s*certificate\s*(issue\s*)?date/i, "certificates.domicile.issue_date", "formatDate"],

  // === INCOME CERTIFICATE ===
  [/income\s*certificate\s*(no|number)|आय\s*प्रमाण\s*पत्र\s*(संख्या|नं)/i, "certificates.income.certificate_number", null],
  [/income\s*certificate\s*(issue\s*)?date|आय\s*प्रमाण\s*पत्र\s*दिनांक/i, "certificates.income.issue_date", "formatDate"],
  [/annual\s*income|family\s*income|वार्षिक\s*आय/i, "certificates.income.annual_income", null],

  // === FILE UPLOADS ===
  [/upload\s*photo|passport\s*photo|photograph|अध्येता\s*का\s*फोटो|फोटो/i, "documents.photo.original_path", null],
  [/upload\s*signature|hastakshar|हस्ताक्षर/i, "documents.signature.original_path", null],
  [/upload.*10th.*marksheet|10th\s*marksheet/i, "documents.files.10th_marksheet", null],
  [/upload.*12th.*marksheet|12th\s*marksheet/i, "documents.files.12th_marksheet", null],
  [/upload.*graduation.*certificate|degree\s*certificate/i, "documents.files.graduation_certificate", null],
  [/upload.*category.*certificate|caste\s*certificate/i, "documents.files.category_certificate", null],
  [/upload.*domicile.*certificate|residence\s*certificate/i, "documents.files.domicile_certificate", null],
  [/upload.*income.*certificate/i, "documents.files.income_certificate", null],
];

/**
 * Find the best profile key match for a given form field label
 * Returns { profileKey, transform, confidence }
 */
export function mapFieldLabel(label) {
  if (!label) return null;
  const clean = label.trim();

  for (const [pattern, profileKey, transform] of FIELD_MAPPINGS) {
    if (pattern.test(clean)) {
      return { profileKey, transform, confidence: "high" };
    }
  }

  // Fuzzy word match fallback
  const words = clean.toLowerCase().split(/[\s_\-/]+/);
  for (const [pattern, profileKey, transform] of FIELD_MAPPINGS) {
    const patternStr = pattern.source.toLowerCase();
    const matched = words.some((w) => patternStr.includes(w) && w.length > 3);
    if (matched) {
      return { profileKey, transform, confidence: "low" };
    }
  }

  return null;
}

/**
 * Get value from nested profile object using dot notation with array index support
 * e.g., "education[0].board" → profile.education[0].board
 */
export function getProfileValue(profile, keyPath) {
  if (!keyPath) return "";
  const parts = keyPath.replace(/\[(\d+)\]/g, ".$1").split(".");
  let val = profile;
  for (const part of parts) {
    if (val == null) return "";
    val = val[part];
  }
  return val ?? "";
}
