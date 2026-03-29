import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    backendUrl: process.env.BACKEND_URL || "http://127.0.0.1:8000"
  });
}
