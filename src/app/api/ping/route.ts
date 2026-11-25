export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint ringan untuk tool "Status Koneksi" (mengukur latensi ke server ToolsPhone).
export function GET() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function HEAD() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
