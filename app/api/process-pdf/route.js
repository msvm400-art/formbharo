import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const action = formData.get("action") || "compress"; // compress | merge | convert

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (action === "compress") {
      // Load and re-save PDF (basic size reduction)
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

      const base64 = Buffer.from(compressedBytes).toString("base64");
      return NextResponse.json({
        success: true,
        base64,
        mimeType: "application/pdf",
        sizeKB: Math.round(compressedBytes.length / 1024),
        originalSizeKB: Math.round(buffer.length / 1024),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
