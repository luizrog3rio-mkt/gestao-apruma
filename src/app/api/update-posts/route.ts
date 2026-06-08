import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMultipleProfiles } from '@/lib/instagram'
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
      .select('id, instagram, seguidores_atual')

    if (error || !mentorados) {
      return NextResponse.json({ error: 'Failed to fetch mentorados' }, { status: 500 })
    }

    const withInstagram = mentorados.filter((m) => !!m.instagram)
    const results: { instagram: string; posts_7d: number; followers: number; status: string }[] = []

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

      // Wait for all uploads to finish
      const uploadResults = new Map<string, string | null>()
      for (const [ig, promise] of avatarUploads) {
        uploadResults.set(ig, await promise)
      }

      for (const m of batch) {
        const cleanIg = m.instagram.replace('@', '').trim().toLowerCase()
        const profile = profiles.get(cleanIg)
        if (!profile) {
          results.push({ instagram: m.instagram, posts_7d: 0, followers: 0, status: 'not_found' })
          continue
        }

        try {
          const storageUrl = uploadResults.get(cleanIg)
          const avatarUrl = storageUrl || profile.profile_pic_url || undefined

          await supabaseAdmin
            .from('mentorados')
            .update({
              posts: profile.posts_last_7d,
              seguidores_atual: profile.follower_count,
              avatar: avatarUrl,
            })
            .eq('id', m.id)

          results.push({
            instagram: m.instagram,
            posts_7d: profile.posts_last_7d,
            followers: profile.follower_count,
            status: 'updated',
          })
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
