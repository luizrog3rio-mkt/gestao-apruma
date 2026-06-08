import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchInstagramProfile } from '@/lib/instagram'
import { uploadAvatarToStorage } from '@/lib/avatar-storage'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchImageBuffer(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return {
      buffer: await res.arrayBuffer(),
      contentType: res.headers.get('content-type') || 'image/jpeg',
    }
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  if (!username || username.length < 2) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    // 1. Try using the avatar URL stored in the database
    const { data: mentorado } = await supabaseAdmin
      .from('mentorados')
      .select('avatar')
      .eq('instagram', username)
      .single()

    if (mentorado?.avatar) {
      const img = await fetchImageBuffer(mentorado.avatar)
      if (img) {
        return new NextResponse(img.buffer, {
          headers: {
            'Content-Type': img.contentType,
            'Cache-Control': 'public, max-age=300, s-maxage=300',
          },
        })
      }
    }

    // 2. Fallback: fetch fresh profile from Apify and save to storage
    const profile = await fetchInstagramProfile(username)
    if (!profile?.profile_pic_url) return new NextResponse(null, { status: 404 })

    const storageUrl = await uploadAvatarToStorage(username, profile.profile_pic_url)
    const imgUrl = storageUrl || profile.profile_pic_url

    // Update the database
    if (mentorado) {
      await supabaseAdmin
        .from('mentorados')
        .update({ avatar: imgUrl })
        .eq('instagram', username)
    }

    const img = await fetchImageBuffer(imgUrl)
    if (!img) return new NextResponse(null, { status: 404 })

    return new NextResponse(img.buffer, {
      headers: {
        'Content-Type': img.contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
