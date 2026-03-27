/**
 * lib/playwright.js
 * Playwright-based form scanner and auto-filler
 */

import { chromium } from "playwright";
import { mapFieldLabel, getProfileValue } from "./fieldMapper.js";
import { formatDate, normalizeCategory, normalizeGender } from "./dateFormatter.js";
import { logAction } from "./auditLog.js";

const TRANSFORMS = { formatDate, normalizeCategory, normalizeGender };

/**
 * Scan a form URL and return all detected fields with profile mappings
 */
export async function analyzeForm(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fields = [];

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Extract all form fields
    const rawFields = await page.evaluate(() => {
      const results = [];
      const allInputs = document.querySelectorAll(
        "input:not([type=hidden]), select, textarea, [role=combobox], [role=listbox]"
      );

      allInputs.forEach((el, idx) => {
        const type = el.tagName.toLowerCase() === "select"
          ? "select"
          : (el.getAttribute("type") || "text").toLowerCase();

        // Find label
        let label = "";
        // By for attribute
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.innerText.trim();
        }
        // By aria-label
        if (!label) label = el.getAttribute("aria-label") || "";
        // By placeholder
        if (!label) label = el.getAttribute("placeholder") || "";
        // By name
        if (!label) label = el.getAttribute("name") || "";
        // By preceding sibling text
        if (!label && el.parentElement) {
          const prev = el.parentElement.querySelector("label");
          if (prev) label = prev.innerText.trim();
        }

        // Get options for selects
        const options = [];
        if (el.tagName.toLowerCase() === "select") {
          Array.from(el.options).forEach((o) => {
            options.push({ value: o.value, text: o.text });
          });
        }

        // Accept/capture attributes
        const accept = el.getAttribute("accept") || "";
        const required = el.hasAttribute("required");

        results.push({
          idx,
          id: el.id || "",
          name: el.getAttribute("name") || "",
          type,
          label,
          options,
          accept,
          required,
          value: el.value || "",
        });
      });

      return results;
    });

    // Map fields to profile
    for (const field of rawFields) {
      const mapping = mapFieldLabel(field.label);
      fields.push({
        ...field,
        profileKey: mapping?.profileKey || null,
        transform: mapping?.transform || null,
        confidence: mapping?.confidence || "none",
        status: mapping ? (mapping.confidence === "high" ? "GREEN" : "YELLOW") : "RED",
      });
    }

    // Check for CAPTCHA
    const hasCaptcha = await page.evaluate(() => {
      return !!(
        document.querySelector(".g-recaptcha, .h-captcha, [data-sitekey], iframe[src*='recaptcha'], iframe[src*='hcaptcha']")
      );
    });

    await browser.close();
    return { fields, hasCaptcha, error: null };
  } catch (err) {
    await browser.close();
    return { fields: [], hasCaptcha: false, error: err.message };
  }
}

/**
 * Auto-fill a form with applicant profile data
 * @param {object} options { url, profile, fieldMappings, onProgress, existingBrowser, existingPage, keepAlive }
 * @returns {Promise<{ auditLog, hasCaptcha, screenshotBase64, browser, page, isStepComplete }>}
 */
export async function fillForm(url, profile, fieldMappings, onProgress, options = {}) {
  const { existingBrowser, existingPage, keepAlive = false } = options;

  let browser = existingBrowser;
  let page = existingPage;

  if (!browser || !page) {
    browser = await chromium.launch({ 
      headless: false,
      args: ["--start-maximized", "--disable-blink-features=AutomationControlled"] 
    }); 
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    });

    // Stealth: Mask automation
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    page = await context.newPage();
  }

  const auditLog = [];

  try {
    // Only go to URL if not already on a page or if URL is different
    if (url && (await page.url()) !== url) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    }

    // Check CAPTCHA first
    const captchaDetected = await page.evaluate(() =>
      !!(document.querySelector(".g-recaptcha, .h-captcha, [data-sitekey], iframe[src*='recaptcha']"))
    );

    if (captchaDetected) {
      logAction(auditLog, { type: "CAPTCHA_DETECTED", url });
      const screenshot = await page.screenshot({ encoding: "base64" });
      return { auditLog, hasCaptcha: true, screenshotBase64: screenshot, browser, page };
    }

    /**
     * Helper to find an element across all frames with multiple fallback strategies
     */
    const findAcrossFrames = async (fieldMap) => {
      const allFrames = page.frames();
      
      for (const frame of allFrames) {
        try {
          // Strategy 1: ID Match (escaped)
          if (fieldMap.id) {
            const el = frame.locator(`#${CSS.escape(fieldMap.id)}`).first();
            if (await el.count() > 0 && await el.isVisible()) return { locator: el, frame, selector: `#${CSS.escape(fieldMap.id)}` };
          }
          
          // Strategy 2: Name Match (escaped)
          if (fieldMap.name) {
            const el = frame.locator(`[name="${CSS.escape(fieldMap.name)}"]`).first();
            if (await el.count() > 0 && await el.isVisible()) return { locator: el, frame, selector: `[name="${CSS.escape(fieldMap.name)}"]` };
          }

          // Strategy 3: Placeholder Match
          if (fieldMap.label) {
            const el = frame.locator(`[placeholder*="${CSS.escape(fieldMap.label)}"]`).first();
            if (await el.count() > 0 && await el.isVisible()) return { locator: el, frame, selector: `[placeholder*="${CSS.escape(fieldMap.label)}"]` };
            
            // Strategy 4: Playwright getByLabel (built-in accessible match)
            const labelEl = frame.getByLabel(fieldMap.label, { exact: false }).first();
            if (await labelEl.count() > 0 && await labelEl.isVisible()) return { locator: labelEl, frame, selector: null }; // getByLabel doesn't use CSS selector
          }
        } catch {}
      }
      return null;
    };

    /**
     * Helper to simulate human input and trigger frameworks (React/Vue/etc)
     */
    const humanInput = async (locator, frame, value, selector, isSelect = false) => {
      try {
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(Math.random() * 200 + 100);
        
        if (isSelect) {
          await locator.selectOption(value);
        } else {
          await locator.focus();
          await locator.fill(""); // Clear first
          await locator.type(String(value), { delay: Math.random() * 50 + 20 });
        }

        // Deep trigger events to bypass blocker/framework guards
        // If we have a selector, we use it. If not (getByLabel), we use the element handle.
        if (selector) {
          await frame.evaluate(({ sel, val }) => {
            const el = document.querySelector(sel);
            if (!el) return;
            ['input', 'change', 'blur'].forEach(evt => {
              el.dispatchEvent(new Event(evt, { bubbles: true }));
            });
            if (window.jQuery) window.jQuery(el).trigger('change').trigger('blur');
          }, { sel: selector, val: value });
        } else {
          await locator.evaluate((el) => {
            ['input', 'change', 'blur'].forEach(evt => {
              el.dispatchEvent(new Event(evt, { bubbles: true }));
            });
          });
        }

      } catch (e) { console.error("Input error:", e); }
    };

    // Fill each mapped field
    for (const fieldMap of fieldMappings) {
      const value = fieldMap._manualValue || getProfileValue(profile, fieldMap.profileKey);
      if (!value) continue;

      const found = await findAcrossFrames(fieldMap);
      if (!found) {
        logAction(auditLog, { type: "FIELD_SKIPPED", fieldLabel: fieldMap.label, reason: "Element not found (possible hidden or deep frame)" });
        continue;
      }

      const { locator, frame, selector } = found;

      try {
        if (fieldMap.type === "select") {
          await humanInput(locator, frame, value, selector, true);
        } else if (fieldMap.type === "file") {
          // ... (file handling remains same)
          let filePath = value;
          if (value.startsWith("data:")) {
            const fs = require("fs");
            const path = require("path");
            const buffer = Buffer.from(value.split(",")[1], "base64");
            filePath = path.join(process.cwd(), "public", "uploads", `temp_fill_${Date.now()}.jpg`);
            fs.writeFileSync(filePath, buffer);
          }
          if (filePath.startsWith("/")) {
            const path = require("path");
            filePath = path.join(process.cwd(), "public", filePath);
          }
          await locator.setInputFiles(filePath);
        } else if (fieldMap.type === "radio") {
          await locator.check();
        } else {
          await humanInput(locator, frame, value, selector);
        }

        logAction(auditLog, {
          type: "FIELD_FILLED",
          fieldLabel: fieldMap.label,
          value: fieldMap.type === "file" ? "[DOCUMENT]" : value,
        });

        if (onProgress) onProgress({ fieldLabel: fieldMap.label, status: "filled" });
        await page.waitForTimeout(Math.random() * 300 + 200);

      } catch (err) {
        console.error(`Fill failure for ${fieldMap.label}:`, err.message);
      }
    }

    const screenshotBase64 = await page.screenshot({ encoding: "base64", fullPage: true });
    
    if (!keepAlive) {
      await browser.close();
      return { auditLog, hasCaptcha: false, screenshotBase64, browser: null, page: null };
    }

    return { auditLog, hasCaptcha: false, screenshotBase64, browser, page };
  } catch (err) {
    console.error("Critical Fill Error:", err);
    if (!keepAlive) try { await browser.close(); } catch {}
    return { auditLog, hasCaptcha: false, screenshotBase64: null, error: err.message };
  }
}

/**
 * Click "Next" or "Submit" and scan for new fields
 * @param {object} page - Playwright page instance
 * @param {boolean} autoSubmit - Whether to actually click submit
 * @returns {Promise<{ nextFields: Array, screenshot: string, url: string }>}
 */
export async function submitAndScan(page, autoSubmit = false) {
  if (autoSubmit) {
    // Try to find common submit/next buttons
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Next")',
      'button:has-text("Submit")',
      'button:has-text("Proceed")',
      '.btn-next',
      '#nextStep'
    ];

    let clicked = false;
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          clicked = true;
          break;
        }
      } catch {}
    }

    if (clicked) {
      await page.waitForTimeout(2000); // Wait for navigation/DOM update
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  // Scan for new fields
  const { fields } = await analyzeForm(page.url(), page);
  const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

  return { 
    nextFields: fields, 
    screenshot, 
    url: page.url() 
  };
}
