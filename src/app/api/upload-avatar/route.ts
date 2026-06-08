import { NextResponse } from 'next/server'
import { uploadAvatarToStorage } from '@/lib/avatar-storage'
import { getRequestRole } from '@/lib/api-auth'

export async function POST(request: Request) {
  const auth = await getRequestRole(request)
  if (!auth || !['admin', 'gerente'].includes(auth.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  try {
    const { username, imageUrl } = await request.json()

    if (!username || !imageUrl) {
      return NextResponse.json({ error: 'username and imageUrl required' }, { status: 400 })
    }

    const storageUrl = await uploadAvatarToStorage(username, imageUrl)

    if (!storageUrl) {
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
    }

    return NextResponse.json({ url: storageUrl })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
