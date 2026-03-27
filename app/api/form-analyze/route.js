import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // 🤖 Proxy the analysis to the Python Playwright Backend
    // This allows the frontend to run on Vercel while the backend handles Playwright/Chromium
    const pythonResponse = await fetch("http://127.0.0.1:8000/api/analyze-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!pythonResponse.ok) {
        const errText = await pythonResponse.text();
        return NextResponse.json({ success: false, error: "Python Analysis Error: " + errText }, { status: 500 });
    }

    const agentResult = await pythonResponse.json();

    if (!agentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: agentResult.error || "Form analysis failed",
        },
        { status: 500 }
      );
    }

    // Map fields with basic info for frontend display
    const fields = agentResult.fields.map((f) => ({
      ...f,
      status: "RED",         // Will be upgraded by AI in form-fill step
      profileKey: null,
      confidence: "none",
    }));

    return NextResponse.json({
      success: true,
      url: agentResult.url || url,
      pageTitle: agentResult.pageTitle,
      fields,
      hasCaptcha: agentResult.hasCaptcha,
      screenshotBase64: agentResult.screenshotBase64,
      fieldCount: fields.length,
      note: "Fields will be AI-mapped when you click Fill. The Form Filler Agent handles the actual mapping.",
    });
  } catch (err) {
    console.error("Form Analyze proxy error:", err);
    return NextResponse.json(
      { error: err.message, success: false },
      { status: 500 }
    );
  }
}
