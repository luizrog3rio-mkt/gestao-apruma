import { NextResponse } from 'next/server'
import { fetchInstagramProfile } from '@/lib/instagram'
import { getRequestRole } from '@/lib/api-auth'

export const maxDuration = 60

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const auth = await getRequestRole(request)
  if (!auth || !['admin', 'gerente'].includes(auth.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { username } = await params
  if (!username || username.length < 2) {
    return NextResponse.json({ error: 'Username inválido' }, { status: 400 })
  }

  const profile = await fetchInstagramProfile(username)
  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
