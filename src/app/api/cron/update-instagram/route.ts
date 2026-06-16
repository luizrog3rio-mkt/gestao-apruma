import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMultipleProfiles } from '@/lib/instagram'
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
    // e inativos (cancelou/pausou/finalizou/reembolsado) não aparecem nas telas de
    // acompanhamento, então não vale gastar crédito atualizando-os todo dia.
    const { data: mentorados, error } = await supabaseAdmin
      .from('mentorados')
      .select('id, instagram, seguidores_atual')
      .eq('status', 'ativo')

    if (error || !mentorados) {
      return NextResponse.json({ error: 'Failed to fetch mentorados' }, { status: 500 })
    }

    const withInstagram = mentorados.filter((m) => !!m.instagram)
    let updated = 0

    for (let i = 0; i < withInstagram.length; i += BATCH_SIZE) {
      const batch = withInstagram.slice(i, i + BATCH_SIZE)
      const usernames = batch.map((m) => m.instagram)
      const profiles = await fetchMultipleProfiles(usernames)

      // Upload all avatars in parallel immediately (CDN URLs expire fast)
      const avatarUploads = new Map<string, Promise<string | null>>()
      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const profile = profiles.get(cleanIg)
        if (profile?.profile_pic_url) {
          avatarUploads.set(cleanIg, uploadAvatarToStorage(m.instagram, profile.profile_pic_url))
        }
      }

      const uploadResults = new Map<string, string | null>()
      for (const [ig, promise] of avatarUploads) {
        uploadResults.set(ig, await promise)
      }

      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const profile = profiles.get(cleanIg)
        if (!profile) continue

        try {
          const storageUrl = uploadResults.get(cleanIg)
          // Só grava avatar se subiu pro Storage. Nunca persistir a URL do
          // Instagram CDN: ela expira em horas e força a rota /api/avatar a
          // cair no scraper síncrono (lento) na próxima leitura.
          const updateFields: Record<string, unknown> = {
            posts: profile.posts_last_7d,
            seguidores_atual: profile.follower_count,
          }
          if (storageUrl) updateFields.avatar = storageUrl

          await supabaseAdmin
            .from('mentorados')
            .update(updateFields)
            .eq('id', m.id)

          updated++
        } catch {
          // continue with next
        }
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      total: mentorados.length,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
