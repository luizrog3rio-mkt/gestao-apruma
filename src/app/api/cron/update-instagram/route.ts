import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchProfilesWithStatus } from '@/lib/instagram'
import { uploadAvatarToStorage } from '@/lib/avatar-storage'

export const maxDuration = 300

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 20

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Só atualiza mentorados ativos: o ScrapeCreators cobra 1 crédito por perfil,
    // e inativos não aparecem nas telas de acompanhamento.
    const { data: mentorados, error } = await supabaseAdmin
      .from('mentorados')
      .select('id, instagram, ig_issue_since')
      .eq('status', 'ativo')

    if (error || !mentorados) {
      return NextResponse.json({ error: 'Failed to fetch mentorados' }, { status: 500 })
    }

    const withInstagram = mentorados.filter((m) => !!m.instagram)
    let updated = 0
    let flagged = 0

    for (let i = 0; i < withInstagram.length; i += BATCH_SIZE) {
      const batch = withInstagram.slice(i, i + BATCH_SIZE)
      const results = await fetchProfilesWithStatus(batch.map((m) => m.instagram))

      // Sobe os avatares dos perfis OK em paralelo (URLs do CDN expiram rápido).
      const avatarUploads = new Map<string, Promise<string | null>>()
      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const r = results.get(cleanIg)
        if (r?.status === 'ok' && r.profile.profile_pic_url) {
          avatarUploads.set(cleanIg, uploadAvatarToStorage(m.instagram, r.profile.profile_pic_url))
        }
      }
      const uploadResults = new Map<string, string | null>()
      for (const [ig, promise] of avatarUploads) {
        uploadResults.set(ig, await promise)
      }

      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const r = results.get(cleanIg)
        // Sem resultado ou erro transitório (rede/rate limit): não mexe, evita falso alarme.
        if (!r || r.status === 'error') continue

        try {
          if (r.status === 'ok') {
            const storageUrl = uploadResults.get(cleanIg)
            const updateFields: Record<string, unknown> = {
              posts: r.profile.posts_last_7d,
              seguidores_atual: r.profile.follower_count,
              // Limpa qualquer problema anterior: o @ voltou a ser puxado.
              ig_issue: null,
              ig_issue_since: null,
            }
            // Só grava avatar se subiu pro Storage (nunca a URL do Instagram CDN, que expira).
            if (storageUrl) updateFields.avatar = storageUrl

            await supabaseAdmin.from('mentorados').update(updateFields).eq('id', m.id)
            updated++
          } else {
            // not_found ou restricted: sinaliza, preservando a data da 1ª detecção.
            await supabaseAdmin
              .from('mentorados')
              .update({
                ig_issue: r.status,
                ig_issue_since: m.ig_issue_since || new Date().toISOString(),
              })
              .eq('id', m.id)
            flagged++
          }
        } catch {
          // continue with next
        }
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      flagged,
      total: mentorados.length,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
