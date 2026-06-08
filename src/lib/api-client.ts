import { supabase } from './supabase'

// fetch que injeta o token de sessão do Supabase no header Authorization,
// para as API routes protegidas conseguirem validar o usuário e o papel.
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}
