import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type RequestRole = { userId: string; role: 'admin' | 'gerente' | 'mentor' }

// Valida o token de sessão do Supabase (enviado pelo cliente no header Authorization)
// e devolve o papel do usuário lido de user_roles. Retorna null se não autenticado.
export async function getRequestRole(request: Request): Promise<RequestRole | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return { userId: user.id, role: (data?.role as RequestRole['role']) ?? 'mentor' }
}
