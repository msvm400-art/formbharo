import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { runDocumentScannerAgent } from "@/lib/agents/documentScannerAgent";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const docType = formData.get("docType") || null; // null = let agent auto-detect

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    let mimeType = file.type || "image/jpeg";

    // Correct MIME type for PDFs if browser sent wrong type
    if (file.name?.toLowerCase().endsWith(".pdf")) {
      mimeType = "application/pdf";
    }

    // Save file to uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const filename = `${docType || "doc"}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // 🤖 Run the Document Scanner Agent
    const agentResult = await runDocumentScannerAgent(base64, mimeType, docType);

    if (!agentResult.success) {
      return NextResponse.json({
        success: false,
        error: agentResult.error || "Document scanning failed",
        detectedDocType: agentResult.detectedDocType || docType,
        agentSteps: agentResult.agentSteps || [],
        data: {},
        filePath: `/uploads/${filename}`,
        confidence: "none",
      });
    }

    const fieldCount = agentResult.fieldCount || 0;

    return NextResponse.json({
      success: true,
      docType: agentResult.detectedDocType,
      detectedDocType: agentResult.detectedDocType,
      detectedConfidence: agentResult.detectedConfidence,
      data: agentResult.extractedData,
      fieldCount,
      agentSteps: agentResult.agentSteps,
      modelUsed: agentResult.modelUsed,
      filePath: `/uploads/${filename}`,
      fileName: filename,
      fileSize: buffer.length,
      mimeType,
      confidence: agentResult.detectedConfidence === "high" ? "high" : "medium",
    });
  } catch (err) {
    console.error("Extract Agent API error:", err);
    return NextResponse.json(
      { error: err.message, success: false },
      { status: 500 }
    );
  }
}
