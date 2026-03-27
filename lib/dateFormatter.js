/**
 * lib/dateFormatter.js
 * Normalize and convert between various date formats
 */

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12",
};

/**
 * Parse any date string to {dd, mm, yyyy}
 */
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return { dd: m[1].padStart(2, "0"), mm: m[2].padStart(2, "0"), yyyy: m[3] };

  // YYYY-MM-DD (ISO)
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return { dd: m[3].padStart(2, "0"), mm: m[2].padStart(2, "0"), yyyy: m[1] };

  // DD Month YYYY (e.g., "15 March 2001")
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) return { dd: m[1].padStart(2, "0"), mm: mo, yyyy: m[3] };
  }

  // Month DD, YYYY (e.g., "March 15, 2001")
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo) return { dd: m[2].padStart(2, "0"), mm: mo, yyyy: m[3] };
  }

  return null;
}

export function formatDate(raw, targetFormat = "DD/MM/YYYY") {
  const parsed = parseDate(raw);
  if (!parsed) return raw;

  switch (targetFormat) {
    case "DD/MM/YYYY": return `${parsed.dd}/${parsed.mm}/${parsed.yyyy}`;
    case "MM/DD/YYYY": return `${parsed.mm}/${parsed.dd}/${parsed.yyyy}`;
    case "YYYY-MM-DD": return `${parsed.yyyy}-${parsed.mm}-${parsed.dd}`;
    case "DD-MM-YYYY": return `${parsed.dd}-${parsed.mm}-${parsed.yyyy}`;
    case "DD Month YYYY": {
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      return `${parsed.dd} ${monthNames[parseInt(parsed.mm) - 1]} ${parsed.yyyy}`;
    }
    default: return `${parsed.dd}/${parsed.mm}/${parsed.yyyy}`;
  }
}

/**
 * lib/categoryNormalizer.js embedded here for simplicity
 */
const CATEGORY_MAP = [
  [/scheduled\s*caste|SC\b|अनुसूचित\s*जाति/i, "SC"],
  [/scheduled\s*tribe|ST\b|अनुसूचित\s*जनजाति/i, "ST"],
  [/other\s*backward.*non[\s-]*creamy|obc[\s-]*ncl/i, "OBC-NCL"],
  [/other\s*backward\s*class|obc\b|पिछड़ा\s*वर्ग/i, "OBC"],
  [/economically\s*weaker\s*section|ews\b|ईडब्ल्यूएस/i, "EWS"],
  [/general|unreserved|ur\b|सामान्य/i, "General"],
];

export function normalizeCategory(raw) {
  if (!raw) return raw;
  for (const [pattern, normalized] of CATEGORY_MAP) {
    if (pattern.test(raw)) return normalized;
  }
  return raw;
}

export function normalizeGender(raw) {
  if (!raw) return raw;
  if (/male|पुरुष/i.test(raw)) return "Male";
  if (/female|महिला|स्त्री/i.test(raw)) return "Female";
  if (/other|अन्य/i.test(raw)) return "Other";
  return raw;
}
