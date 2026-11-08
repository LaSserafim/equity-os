import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/';

  // Handle OAuth provider error (e.g. user cancelled or access denied)
  if (error) {
    console.error('OAuth error from provider:', error, error_description);
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Ignore in edge environments
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Server session exchange error:', exchangeError.message);
    // Fallback: pass code to client so browser-side Supabase client can exchange it
    return NextResponse.redirect(`${origin}/?code=${encodeURIComponent(code)}`);
  }

  // Fallback redirect
  return NextResponse.redirect(`${origin}${next}`);
}
