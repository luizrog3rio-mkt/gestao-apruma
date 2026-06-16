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

export async function fetchInstagramProfile(username: string): Promise<InstagramProfile | null> {
  try {
    const handle = username.replace('@', '').trim()
    if (!handle) return null

    const res = await fetch(`${SC_PROFILE_URL}?handle=${encodeURIComponent(handle)}`, {
      headers: { 'x-api-key': SCRAPECREATORS_API_KEY },
    })
    if (!res.ok) return null

    const data = await res.json()
    // Conta inexistente/privada/erro: a API responde 200 com { error, message } e sem data.user.
    const user: ScUser | undefined = data?.data?.user
    if (!user) return null

    return mapUser(user, handle)
  } catch (err) {
    console.error('ScrapeCreators API error:', err)
    return null
  }
}

// O ScrapeCreators não tem endpoint em lote: buscamos cada handle individualmente,
// com concorrência limitada para não disparar centenas de requests de uma vez.
const CONCURRENCY = 6

export async function fetchMultipleProfiles(usernames: string[]): Promise<Map<string, InstagramProfile>> {
  const results = new Map<string, InstagramProfile>()
  if (usernames.length === 0) return results

  const queue = [...usernames]

  async function worker() {
    for (;;) {
      const username = queue.shift()
      if (username === undefined) return
      const profile = await fetchInstagramProfile(username)
      if (profile) {
        results.set(username.replace('@', '').trim().toLowerCase(), profile)
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, usernames.length) }, () => worker())
  await Promise.all(workers)
  return results
}
