import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestRole } from '@/lib/api-auth'
import { isCapability } from '@/lib/permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Lista os usuários do sistema (quem tem login no painel): cruza auth.users
// — só acessível via service role — com os papéis de user_roles.
export async function GET(request: Request) {
  const auth = await getRequestRole(request)
  if (!auth) {
    // sem token / sessão inválida ou expirada
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (auth.role !== 'admin') {
    // autenticado, mas sem permissão
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }

  try {
    // auth.admin.listUsers é paginado. O servidor (GoTrue) pode ter um teto
    // de perPage menor que o pedido, então paramos só quando a página vem
    // vazia — não em "length < perPage", que perderia usuários se houver cap.
    const authUsers: {
      id: string
      email: string
      created_at: string
      last_sign_in_at: string | null
      display_name: string
    }[] = []
    const perPage = 200
    const MAX_PAGES = 100 // teto de segurança contra loop (até ~20k usuários)
    let truncated = false
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json({ error: 'Falha ao listar usuários' }, { status: 500 })
      }
      if (!data.users.length) break
      for (const u of data.users) {
        authUsers.push({
          id: u.id,
          email: u.email ?? '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          display_name: (u.user_metadata?.display_name as string) || '',
        })
      }
      // Atingiu o teto com a página ainda cheia: pode haver mais além do limite.
      if (page === MAX_PAGES && data.users.length === perPage) truncated = true
    }
    if (truncated) {
      console.warn(`[api/usuarios] lista possivelmente truncada no teto de ${MAX_PAGES * perPage} usuários`)
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, turma, extra_caps')
    if (rolesError) {
      return NextResponse.json({ error: 'Falha ao carregar papéis' }, { status: 500 })
    }

    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r]))

    const usuarios = authUsers.map((u) => {
      const r = roleMap.get(u.id)
      return {
        id: u.id,
        email: u.email,
        nome: u.display_name,
        role: (r?.role as 'admin' | 'gerente' | 'mentor' | undefined) ?? null,
        turma: (r?.turma as string | null) ?? null,
        caps: (r?.extra_caps as string[] | null) ?? [],
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }
    })

    // Ordena por papel (admin → gerente → mentor → sem papel) e, dentro, por nome/e-mail.
    const rank: Record<string, number> = { admin: 0, gerente: 1, mentor: 2 }
    usuarios.sort((a, b) => {
      const ra = a.role ? rank[a.role] : 3
      const rb = b.role ? rank[b.role] : 3
      if (ra !== rb) return ra - rb
      return (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR')
    })

    return NextResponse.json({ usuarios })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Atualiza as capacidades extras (extra_caps) de um usuário. Admin-only.
export async function PATCH(request: Request) {
  const auth = await getRequestRole(request)
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }

  const { userId, caps } = (body ?? {}) as { userId?: unknown; caps?: unknown }
  if (typeof userId !== 'string' || !Array.isArray(caps)) {
    return NextResponse.json({ error: 'userId e caps são obrigatórios' }, { status: 400 })
  }

  // Só aceita capacidades do catálogo — bloqueia injeção de valores arbitrários.
  if (!caps.every((c) => typeof c === 'string' && isCapability(c))) {
    return NextResponse.json({ error: 'Capacidade inválida' }, { status: 400 })
  }
  const clean = Array.from(new Set(caps as string[]))

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .update({ extra_caps: clean })
    .eq('user_id', userId)
    .select('user_id')

  if (error) {
    return NextResponse.json({ error: 'Falha ao salvar' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Usuário sem papel definido — defina um papel antes de conceder capacidades.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, caps: clean })
}
