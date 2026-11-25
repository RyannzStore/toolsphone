import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Lewati aset statis & API jaringan (tidak butuh sesi)
    '/((?!_next/static|_next/image|api/network|api/ping|favicon.ico|icon.svg|Hero.mp4|music/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3|ico|txt|woff2?)$).*)',
  ],
};
