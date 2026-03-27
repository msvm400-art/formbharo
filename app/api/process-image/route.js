import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const width = parseInt(formData.get("width") || "0");
    const height = parseInt(formData.get("height") || "0");
    const maxKB = parseInt(formData.get("maxKB") || "0");
    const format = (formData.get("format") || "jpeg").toLowerCase();

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let pipeline = sharp(buffer);

    // Resize if dimensions specified
    if (width > 0 && height > 0) {
      pipeline = pipeline.resize(width, height, { fit: "fill" });
    } else if (width > 0) {
      pipeline = pipeline.resize(width, null);
    } else if (height > 0) {
      pipeline = pipeline.resize(null, height);
    }

    // Output format
    let quality = 90;
    let outputBuffer;

    const tryCompress = async (q) => {
      if (format === "png") {
        return await pipeline.png({ quality: q }).toBuffer();
      } else {
        return await pipeline.jpeg({ quality: q }).toBuffer();
      }
    };

    outputBuffer = await tryCompress(quality);

    // Reduce quality to meet KB limit
    if (maxKB > 0) {
      while (outputBuffer.length > maxKB * 1024 && quality > 10) {
        quality -= 10;
        outputBuffer = await tryCompress(quality);
      }
    }

    const base64 = outputBuffer.toString("base64");
    const mimeType = format === "png" ? "image/png" : "image/jpeg";

    return NextResponse.json({
      success: true,
      base64,
      mimeType,
      width: (await sharp(outputBuffer).metadata()).width,
      height: (await sharp(outputBuffer).metadata()).height,
      sizeKB: Math.round(outputBuffer.length / 1024),
      qualityUsed: quality,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
