import { supabase } from '@/lib/supabase';

export async function exchangeOAuthCodeOnce(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw error;
  }
}
