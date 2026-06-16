import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Esta rota é servida via <img>, então é caminho quente e sensível a latência.
// Ela só faz consultas rápidas ao Supabase (DB + Storage) e NUNCA chama o
// scraper do Instagram (Apify) — esse refresh é responsabilidade do cron e do
// botão "Forçar atualização". maxDuration baixo como rede de segurança.
export const maxDuration = 10

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars`

function redirectToImage(url: string) {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: url,
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function notFound() {
  // 404 cacheável: evita que o <img> redispare esta rota a cada navegação
  // enquanto o perfil não tiver avatar no Storage. O front cai no placeholder.
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  if (!username || username.length < 2) {
    return new NextResponse(null, { status: 400 })
  }
  const clean = username.replace('@', '').trim().toLowerCase()

  try {
    // 1. Se o avatar salvo no DB já é do Storage, redireciona direto pra ele.
    const { data: mentorado } = await supabaseAdmin
      .from('mentorados')
      .select('avatar')
      .eq('instagram', username)
      .single()

    if (mentorado?.avatar?.includes('/storage/v1/object/public/avatars/')) {
      return redirectToImage(mentorado.avatar)
    }

    // 2. Procura um arquivo já existente no bucket (rápido; SEM Apify).
    const { data: files } = await supabaseAdmin.storage
      .from('avatars')
      .list('', { search: clean, limit: 100 })
    const match = files?.find(
      (f) => f.name.split('.').slice(0, -1).join('.').toLowerCase() === clean
    )

    if (match) {
      const url = `${STORAGE_PUBLIC_BASE}/${match.name}`
      // Caminho raro (arquivo existe mas o DB ainda aponta pro CDN): conserta o
      // DB para que a próxima leitura use o passo 1. Awaited para consistência.
      await supabaseAdmin
        .from('mentorados')
        .update({ avatar: url })
        .eq('instagram', username)
      return redirectToImage(url)
    }

    // 3. Sem avatar no Storage → 404 cacheável. O refresh via Instagram acontece
    //    no cron e no botão "Forçar atualização", nunca aqui no caminho do <img>.
    return notFound()
  } catch {
    return new NextResponse(null, {
      status: 500,
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }
}
