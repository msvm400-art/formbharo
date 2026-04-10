import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Verify the request is coming from Vercel CRON (Optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[Keep-Alive] Unauthorized cron request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
  const PING_ENDPOINT = `${BACKEND_URL}/ping`;

  console.log(`[Scheduled-Ping] Pinging backend at: ${PING_ENDPOINT}`);

  try {
    const response = await fetch(PING_ENDPOINT);
    if (response.ok) {
      const data = await response.json();
      console.log(`[Scheduled-Ping] Success: ${data.message}`);
      return NextResponse.json({ success: true, message: data.message });
    } else {
      console.warn(`[Scheduled-Ping] Ping failed with status: ${response.status}`);
      return NextResponse.json({ success: false, status: response.status }, { status: response.status });
    }
  } catch (error) {
    console.error(`[Scheduled-Ping] Error reaching backend: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
