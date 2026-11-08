import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or home if code exchange fails
  return NextResponse.redirect(`${origin}/?auth_error=exchange_failed`);
}
