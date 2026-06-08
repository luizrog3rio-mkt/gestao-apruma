import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchInstagramProfile } from '@/lib/instagram'
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
    const profile = await fetchInstagramProfile(cleanUsername)

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Upload avatar immediately
    let avatarUrl = profile.profile_pic_url || null
    if (profile.profile_pic_url) {
      const storageUrl = await uploadAvatarToStorage(cleanUsername, profile.profile_pic_url)
      if (storageUrl) avatarUrl = storageUrl
    }

    // Update database
    await supabaseAdmin
      .from('mentorados')
      .update({
        seguidores_atual: profile.follower_count,
        posts: profile.posts_last_7d,
        avatar: avatarUrl,
      })
      .eq('id', mentoradoId)

    return NextResponse.json({
      follower_count: profile.follower_count,
      posts_last_7d: profile.posts_last_7d,
      avatar: avatarUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
