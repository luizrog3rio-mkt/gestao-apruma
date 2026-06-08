import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadAvatarToStorage(username: string, imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    // Normaliza o username para um caminho de arquivo determinístico (sem '@',
    // sem espaços, minúsculo) — os callers passam o instagram em formatos
    // diferentes (com/sem '@', maiúsculas), o que gerava avatares duplicados.
    const cleanUsername = username.replace('@', '').trim().toLowerCase()
    const filePath = `${cleanUsername}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (err) {
    console.error('Avatar upload error:', err)
    return null
  }
}
