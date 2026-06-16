const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY!
const SC_PROFILE_URL = 'https://api.scrapecreators.com/v1/instagram/profile'

export type InstagramProfile = {
  username: string
  full_name: string
  profile_pic_url: string
  follower_count: number
  following_count: number
  media_count: number
  posts_last_7d: number
  biography: string
}

// Motivo de um @ não poder ser puxado (persistido em mentorados.ig_issue):
// - not_found: a conta não existe (provável troca de @ ou conta removida)
// - restricted: a conta existe mas é privada/restrita (scraper não acessa)
export type IgIssue = 'not_found' | 'restricted'

// Resultado discriminado. 'error' = falha transitória (rede, rate limit, 5xx):
// NUNCA deve marcar o perfil como problemático, para não gerar falso alarme.
export type ProfileFetchResult =
  | { status: 'ok'; profile: InstagramProfile }
  | { status: 'not_found'; profile: null }
  | { status: 'restricted'; profile: null }
  | { status: 'error'; profile: null }

// Formato GraphQL nativo do Instagram, que é o que o ScrapeCreators devolve em data.user.
type ScUser = {
  username?: string
  full_name?: string
  biography?: string
  profile_pic_url?: string
  profile_pic_url_hd?: string
  edge_followed_by?: { count?: number }
  edge_follow?: { count?: number }
  edge_owner_to_timeline_media?: {
    count?: number
    edges?: { node?: { taken_at_timestamp?: number } }[]
  }
}

function mapUser(user: ScUser, fallbackHandle: string): InstagramProfile {
  // taken_at_timestamp vem em SEGUNDOS Unix. O endpoint traz ~12 posts recentes,
  // o que é suficiente para contar os dos últimos 7 dias.
  const sevenDaysAgoSec = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60
  const edges = user.edge_owner_to_timeline_media?.edges || []
  const postsLast7d = edges.filter(
    (e) => (e.node?.taken_at_timestamp ?? 0) >= sevenDaysAgoSec
  ).length

  return {
    username: user.username || fallbackHandle,
    full_name: user.full_name || '',
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || '',
    follower_count: user.edge_followed_by?.count ?? 0,
    following_count: user.edge_follow?.count ?? 0,
    media_count: user.edge_owner_to_timeline_media?.count ?? 0,
    posts_last_7d: postsLast7d,
    biography: user.biography || '',
  }
}

export async function fetchProfileWithStatus(username: string): Promise<ProfileFetchResult> {
  try {
    const handle = username.replace('@', '').trim()
    if (!handle) return { status: 'error', profile: null }

    const res = await fetch(`${SC_PROFILE_URL}?handle=${encodeURIComponent(handle)}`, {
      headers: { 'x-api-key': SCRAPECREATORS_API_KEY },
    })
    // Erro HTTP (rate limit, 5xx, etc.) é transitório: não classifica como problema.
    if (!res.ok) return { status: 'error', profile: null }

    const data = await res.json()
    if (data?.data?.user) return { status: 'ok', profile: mapUser(data.data.user, handle) }

    // Sem data.user: a API responde 200 com { error, message }. Distinguir os casos.
    const msg = (data?.message || '').toLowerCase()
    if (msg.includes('restrict')) return { status: 'restricted', profile: null }
    if (
      data?.errorStatus === 404 ||
      data?.error === 'not_found' ||
      msg.includes("doesn't exist") ||
      msg.includes('not found')
    ) {
      return { status: 'not_found', profile: null }
    }
    // Resposta inesperada: trata como transitório para não marcar errado.
    return { status: 'error', profile: null }
  } catch (err) {
    console.error('ScrapeCreators API error:', err)
    return { status: 'error', profile: null }
  }
}

export async function fetchInstagramProfile(username: string): Promise<InstagramProfile | null> {
  return (await fetchProfileWithStatus(username)).profile
}

// O ScrapeCreators não tem endpoint em lote: buscamos cada handle individualmente,
// com concorrência limitada. Retorna o resultado (com status) por handle minúsculo.
const CONCURRENCY = 6

export async function fetchProfilesWithStatus(
  usernames: string[]
): Promise<Map<string, ProfileFetchResult>> {
  const results = new Map<string, ProfileFetchResult>()
  if (usernames.length === 0) return results

  const queue = [...usernames]

  async function worker() {
    for (;;) {
      const username = queue.shift()
      if (username === undefined) return
      const result = await fetchProfileWithStatus(username)
      results.set(username.replace('@', '').trim().toLowerCase(), result)
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, usernames.length) }, () => worker())
  await Promise.all(workers)
  return results
}
