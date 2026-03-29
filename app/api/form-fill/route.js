import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/sessions";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const {
      url,
      profile,
      sessionId,
      autoSubmit = false,
    } = await request.json();

    if (!profile) {
      return NextResponse.json({ error: "Missing profile data" }, { status: 400 });
    }

    if (!url && !sessionId) {
      return NextResponse.json({ error: "URL or Session ID is required" }, { status: 400 });
    }

    let currentSessionId = sessionId || uuidv4();

    // 🤖 Proxy the request to the Python Playwright Backend
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const pythonResponse = await fetch(`${backendUrl}/api/start-form-fill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        profile,
        autoSubmit
      })
    });

    if (!pythonResponse.ok) {
        const errText = await pythonResponse.text();
        return NextResponse.json({ success: false, error: "Python Agent Error: " + errText }, { status: 500 });
    }

    const agentResult = await pythonResponse.json();

    if (!agentResult.success && agentResult.hasCaptcha) {
      return NextResponse.json({
        success: false,
        hasCaptcha: true,
        sessionId: currentSessionId,
        screenshotBase64: agentResult.screenshotBase64,
        auditLog: agentResult.auditLog,
        error: "CAPTCHA detected",
      });
    }

    if (!agentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: agentResult.error || "Form fill failed",
          auditLog: agentResult.auditLog || [],
          screenshotBase64: agentResult.screenshotBase64,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      hasCaptcha: agentResult.hasCaptcha || false,
      auditLog: agentResult.auditLog,
      screenshotBase64: agentResult.screenshotBase64,
      filledCount: agentResult.filledCount
    });
  } catch (err) {
    console.error("Form Fill Agent API proxy error:", err);
    return NextResponse.json(
      { error: err.message, success: false },
      { status: 500 }
    );
  }
}
