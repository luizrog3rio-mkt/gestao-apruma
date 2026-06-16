'use client'

import type { InstagramProfile } from '@/lib/instagram'
import { formatNumber } from '@/lib/utils'

type Props = {
  profile: InstagramProfile | null
  loading: boolean
  avatarUrl?: string | null
}

export default function InstagramPreview({ profile, loading, avatarUrl }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="bg-white rounded-2xl border border-brand-200 p-6 animate-scale-in">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-brand-100 flex-shrink-0">
          {avatarUrl && avatarUrl.includes('/storage/') ? (
            // A foto do Instagram CDN é bloqueada no navegador por CORP (NotSameOrigin);
            // por isso usamos a cópia espelhada no Supabase Storage (preenchida pelo upload).
            <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{profile.full_name || profile.username}</div>
          <div className="text-sm text-gray-400">@{profile.username}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-brand-600">{formatNumber(profile.follower_count)}</div>
          <div className="text-xs text-gray-400">seguidores</div>
        </div>
      </div>
      {profile.biography && (
        <div className="mt-3 text-xs text-gray-500 line-clamp-2">{profile.biography}</div>
      )}
    </div>
  )
}
