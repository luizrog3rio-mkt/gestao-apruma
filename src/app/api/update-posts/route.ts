import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchProfilesWithStatus } from '@/lib/instagram'
import { uploadAvatarToStorage } from '@/lib/avatar-storage'
import { getRequestRole } from '@/lib/api-auth'

export const maxDuration = 300

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 20

export async function POST(request: Request) {
  const auth = await getRequestRole(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  try {
    const { data: mentorados, error } = await supabaseAdmin
      .from('mentorados')
      .select('id, instagram, ig_issue_since')

    if (error || !mentorados) {
      return NextResponse.json({ error: 'Failed to fetch mentorados' }, { status: 500 })
    }

    const withInstagram = mentorados.filter((m) => !!m.instagram)
    const results: { instagram: string; posts_7d: number; followers: number; status: string }[] = []

    for (let i = 0; i < withInstagram.length; i += BATCH_SIZE) {
      const batch = withInstagram.slice(i, i + BATCH_SIZE)
      const fetched = await fetchProfilesWithStatus(batch.map((m) => m.instagram))

      // Sobe os avatares dos perfis OK em paralelo (URLs do CDN expiram rápido).
      const avatarUploads = new Map<string, Promise<string | null>>()
      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const r = fetched.get(cleanIg)
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
        const r = fetched.get(cleanIg)
        if (!r || r.status === 'error') {
          results.push({ instagram: m.instagram, posts_7d: 0, followers: 0, status: 'error' })
          continue
        }

        try {
          if (r.status === 'ok') {
            const storageUrl = uploadResults.get(cleanIg)
            const updateFields: Record<string, unknown> = {
              posts: r.profile.posts_last_7d,
              seguidores_atual: r.profile.follower_count,
              ig_issue: null,
              ig_issue_since: null,
            }
            if (storageUrl) updateFields.avatar = storageUrl

            await supabaseAdmin.from('mentorados').update(updateFields).eq('id', m.id)

            results.push({
              instagram: m.instagram,
              posts_7d: r.profile.posts_last_7d,
              followers: r.profile.follower_count,
              status: 'updated',
            })
          } else {
            // not_found ou restricted: sinaliza, preservando a data da 1ª detecção.
            await supabaseAdmin
              .from('mentorados')
              .update({
                ig_issue: r.status,
                ig_issue_since: m.ig_issue_since || new Date().toISOString(),
              })
              .eq('id', m.id)
            results.push({ instagram: m.instagram, posts_7d: 0, followers: 0, status: r.status })
          }
        } catch {
          results.push({ instagram: m.instagram, posts_7d: 0, followers: 0, status: 'error' })
        }
      }
    }

    const skipped = mentorados.length - withInstagram.length
    for (let i = 0; i < skipped; i++) {
      results.push({ instagram: '', posts_7d: 0, followers: 0, status: 'skipped' })
    }

    return NextResponse.json({
      updated: results.filter((r) => r.status === 'updated').length,
      total: mentorados.length,
      results,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
