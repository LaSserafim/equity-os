import { supabase, isSupabaseConfigured } from './client';

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase environment variables not configured. Operating in Offline / Local Sandbox mode.');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!isSupabaseConfigured) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

export async function getUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
