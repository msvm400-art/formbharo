/**
 * lib/agents/formFillerAgent.js
 * 
 * 🤖 FORM FILLER AGENT (Javascript Analysis Utility)
 * This agent handles scanning the active Playwright page to detect input fields,
 * select boxes, and textareas. It also detects presence of CAPTCHAs.
 */

export async function rescanCurrentPage(page, profile, sessionId) {
  try {
    const pageTitle = await page.title();
    const currentUrl = page.url();

    // Check for common CAPTCHA patterns
    const hasCaptcha = await page.evaluate(() => {
      const selectors = [
        '.g-recaptcha',
        '.h-captcha',
        'iframe[src*="captcha"]',
        '#captcha',
        '[name*="captcha"]',
        '.captcha-container'
      ];
      return selectors.some(s => !!document.querySelector(s));
    });

    // Extract all interactive fields
    const fields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea');
      
      return Array.from(inputs).map((el, i) => {
        // Find label
        let label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
        
        // Try to find label element linked via 'for'
        if (el.id) {
          const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (l) label = label || l.innerText;
        }
        
        // Try parent label
        const parentLabel = el.closest('label');
        if (parentLabel && !label) label = parentLabel.innerText;
        
        // Try previous element text
        if (!label && el.previousElementSibling) {
            label = el.previousElementSibling.innerText;
        }

        return {
          idx: i,
          type: el.tagName.toLowerCase() === 'select' ? 'select' : (el.getAttribute('type') || 'text'),
          id: el.id || "",
          name: el.getAttribute('name') || "",
          label: (label || "").trim(),
          options: el.tagName.toLowerCase() === 'select' ? Array.from(el.options).map(o => o.text) : []
        };
      });
    });

    return {
      success: true,
      pageTitle,
      currentUrl,
      fields,
      hasCaptcha
    };
  } catch (err) {
    console.error("rescanCurrentPage error:", err);
    throw err;
  }
}
