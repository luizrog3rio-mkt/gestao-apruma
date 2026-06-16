import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchProfileWithStatus } from '@/lib/instagram'
import { uploadAvatarToStorage } from '@/lib/avatar-storage'
import { getRequestRole } from '@/lib/api-auth'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const auth = await getRequestRole(request)
  if (!auth || !['admin', 'gerente'].includes(auth.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  try {
    const { mentoradoId, instagram } = await request.json()

    if (!mentoradoId || !instagram) {
      return NextResponse.json({ error: 'mentoradoId and instagram required' }, { status: 400 })
    }

    const cleanUsername = instagram.replace('@', '').trim()
    const result = await fetchProfileWithStatus(cleanUsername)

    if (result.status !== 'ok') {
      if (result.status === 'not_found' || result.status === 'restricted') {
        // Sinaliza o problema, preservando a data da 1ª detecção.
        const { data: cur } = await supabaseAdmin
          .from('mentorados')
          .select('ig_issue_since')
          .eq('id', mentoradoId)
          .single()
        await supabaseAdmin
          .from('mentorados')
          .update({
            ig_issue: result.status,
            ig_issue_since: cur?.ig_issue_since || new Date().toISOString(),
          })
          .eq('id', mentoradoId)
        return NextResponse.json(
          { error: 'Perfil não encontrado', issue: result.status },
          { status: 404 }
        )
      }
      // Erro transitório: não marca nada.
      return NextResponse.json({ error: 'Erro temporário ao consultar o Instagram' }, { status: 502 })
    }

    const profile = result.profile

    // Sobe o avatar pro Storage. Só persiste se o upload deu certo — nunca grava
    // a URL do Instagram CDN (expira e é bloqueada no navegador por CORP).
    let storageUrl: string | null = null
    if (profile.profile_pic_url) {
      storageUrl = await uploadAvatarToStorage(cleanUsername, profile.profile_pic_url)
    }

    const updateFields: Record<string, unknown> = {
      seguidores_atual: profile.follower_count,
      // O @ foi puxado com sucesso: limpa qualquer problema anterior.
      ig_issue: null,
      ig_issue_since: null,
    }
    // posts só quando confiável (o fallback Looter nem sempre traz em perfis restritos).
    if (result.postsReliable) updateFields.posts = profile.posts_last_7d
    if (storageUrl) updateFields.avatar = storageUrl

    await supabaseAdmin.from('mentorados').update(updateFields).eq('id', mentoradoId)

    return NextResponse.json({
      follower_count: profile.follower_count,
      posts_last_7d: profile.posts_last_7d,
      avatar: storageUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
