/**
 * lib/auditLog.js
 * Track all form-fill actions for audit trail
 */

export function createAuditLog() {
  return [];
}

export function logAction(log, action) {
  log.push({
    timestamp: new Date().toISOString(),
    ...action,
  });
  return log;
}

/**
 * Action types:
 * { type: "FIELD_FILLED", fieldLabel, fieldId, value, profileKey, confidence }
 * { type: "FIELD_SKIPPED", fieldLabel, reason }
 * { type: "FILE_UPLOADED", fieldLabel, fileName, fileSize }
 * { type: "CAPTCHA_DETECTED", url }
 * { type: "CAPTCHA_SOLVED" }
 * { type: "OCR_EXTRACTED", docType, fieldCount }
 * { type: "PROFILE_UPDATED", section, fieldsUpdated }
 */
