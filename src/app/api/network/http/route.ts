import { describeNetError, fetchChain } from '@/lib/server/netguard';
import { json, limited } from '@/lib/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rl = limited(req, 'http', 15);
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const url = (searchParams.get('url') ?? '').trim();
  if (!url || url.length > 2048) return json({ error: 'Masukkan URL (maks 2048 karakter).', code: 'BAD_URL' }, 400);
  const method = searchParams.get('method') === 'HEAD' ? 'HEAD' : 'GET';

  try {
    const result = await fetchChain(url, { method });
    return json({ ok: true, method, ...result });
  } catch (e) {
    const { message, code } = describeNetError(e);
    // Kesalahan input/kebijakan → 400; kegagalan jaringan ke tujuan → 200 dengan ok:false agar UI menampilkan pesannya
    const policy = ['BAD_URL', 'BAD_PROTOCOL', 'BAD_PORT', 'BAD_HOST', 'BLOCKED', 'EBLOCKED'].includes(code);
    return json({ ok: false, error: message, code }, policy ? 400 : 200);
  }
}
