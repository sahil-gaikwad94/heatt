import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null
export const authConfigured = Boolean(supabase)

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase Auth is not configured.')
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
