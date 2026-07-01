'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase, fetchAll, type Mentorado } from '@/lib/supabase'
import { useUserRole } from '@/lib/useUserRole'
import { pode } from '@/lib/permissions'
import { formatNumber } from '@/lib/utils'

type Level = {
  key: string
  title: string
  icon: string
  description: string
  borderColor: string
  bgColor: string
  badgeBg: string
  badgeText: string
  iconBg: string
}

type Abordagem = {
  mentorado_id: string
  box_index: number
  marked_at: string
  marked_by_email: string | null
  marked_by_name: string | null
  source: string
}

const levels: Level[] = [
  {
    key: 'atencao-maxima',
    title: 'Atenção Máxima',
    icon: '🔴',
    description: 'Postaram menos de 1 publicação nos últimos 7 dias',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    iconBg: 'bg-red-100',
  },
  {
    key: 'de-um-toque',
    title: 'Dê um Toque',
    icon: '🟡',
    description: 'Postaram menos de 3 publicações nos últimos 7 dias',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
]

const TOTAL_BOXES = 10

function classifyMentorados(mentorados: Mentorado[]) {
  const atencaoMaxima: Mentorado[] = []
  const deUmToque: Mentorado[] = []
  const atencaoIds = new Set<string>()

  for (const m of mentorados) {
    if (m.posts < 1) {
      atencaoMaxima.push(m)
      atencaoIds.add(m.id)
    }
  }

  for (const m of mentorados) {
    if (atencaoIds.has(m.id)) continue
    if (m.posts < 3) {
      deUmToque.push(m)
    }
  }

  return { 'atencao-maxima': atencaoMaxima, 'de-um-toque': deUmToque }
}

function AbordagemBoxes({
  mentoradoId,
  abordagens,
  onToggle,
  source,
}: {
  mentoradoId: string
  abordagens: Abordagem[]
  onToggle?: (mentoradoId: string, boxIndex: number, source: string) => void
  source: string
}) {
  const markedByIndex = useMemo(() => {
    const map = new Map<number, Abordagem>()
    for (const a of abordagens) {
      if (a.mentorado_id === mentoradoId && a.source === source) {
        map.set(a.box_index, a)
      }
    }
    return map
  }, [abordagens, mentoradoId, source])

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {Array.from({ length: TOTAL_BOXES }, (_, i) => {
        const abordagem = markedByIndex.get(i)
        const isMarked = !!abordagem
        const formattedDate = abordagem
          ? new Date(abordagem.marked_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''
        const markedByLabel = abordagem?.marked_by_name || abordagem?.marked_by_email || ''

        return (
          <div key={i} className="relative group">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle?.(mentoradoId, i, source) }}
              disabled={!onToggle}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 transition-all flex items-center justify-center text-[10px] sm:text-xs ${
                isMarked
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : onToggle
                    ? 'bg-white border-gray-300 hover:border-brand-400 cursor-pointer'
                    : 'bg-white border-gray-200 cursor-default'
              }`}
            >
              {isMarked && '✓'}
            </button>
            {isMarked && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div>{formattedDate}</div>
                {markedByLabel && <div className="text-gray-300">por {markedByLabel}</div>}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MentoradoCard({
  m,
  level,
  abordagens,
  onToggle,
  needsBell,
  userRole,
  canMarcarRafa,
}: {
  m: Mentorado
  level: Level
  abordagens: Abordagem[]
  onToggle: (mentoradoId: string, boxIndex: number, source: string) => void
  needsBell: boolean
  userRole: string
  canMarcarRafa: boolean
}) {
  const gained = m.seguidores_atual - m.seguidores_inicial

  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${level.borderColor} ${level.bgColor} transition-all hover:shadow-sm ${needsBell ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white overflow-hidden flex-shrink-0 shadow-sm">
          {m.avatar && m.avatar.includes('supabase') ? (
            <img
              src={m.avatar}
              alt={m.nome}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nome)}&background=E8DEF8&color=6B21A8&size=96` }}
            />
          ) : (
            <img
              src={m.instagram ? `/api/avatar/${m.instagram}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nome)}&background=E8DEF8&color=6B21A8&size=96`}
              alt={m.nome}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nome)}&background=E8DEF8&color=6B21A8&size=96` }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 truncate text-sm sm:text-base">{m.nome}</span>
            {needsBell && <span className="text-red-500 animate-pulse flex-shrink-0" title="Precisa de um toque!">🚨</span>}
          </div>
          <div className="text-xs text-gray-500">@{m.instagram}</div>
        </div>

        {m.instagram && (
          <a
            href={`https://instagram.com/${m.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-pink-500 hover:text-pink-600 transition-colors"
            title={`Abrir @${m.instagram} no Instagram`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs mt-3 pt-3 border-t border-black/5">
        <div className="text-center flex-1">
          <div className="text-gray-400">Posts/sem</div>
          <div className={`font-bold ${m.posts === 0 ? 'text-red-600' : 'text-amber-600'}`}>{m.posts}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Seguidores</div>
          <div className="font-bold text-gray-700">{formatNumber(m.seguidores_atual)}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Ganhou</div>
          <div className={`font-bold ${gained >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {gained >= 0 ? '+' : ''}{formatNumber(gained)}
          </div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Turma</div>
          <div className="font-bold text-gray-700 truncate">{m.turma}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-gray-500 flex-shrink-0 w-20 sm:w-24">Abordagem CS:</span>
          <AbordagemBoxes
            mentoradoId={m.id}
            abordagens={abordagens}
            onToggle={userRole === 'admin' ? undefined : onToggle}
            source="cs"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-gray-500 flex-shrink-0 w-20 sm:w-24">Abordagem Rafa:</span>
          <AbordagemBoxes
            mentoradoId={m.id}
            abordagens={abordagens}
            onToggle={canMarcarRafa ? onToggle : undefined}
            source="rafa"
          />
        </div>
      </div>
    </div>
  )
}

export default function SosCsPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [abordagens, setAbordagens] = useState<Abordagem[]>([])
  const [loading, setLoading] = useState(true)
  const [turmaFilter, setTurmaFilter] = useState('')
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string }>({ email: '', name: '' })
  const { role, caps } = useUserRole()
  const canMarcarRafa = pode('marcar_abordagem_rafa', role, caps)

  const fetchSeq = useRef(0)

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const seq = ++fetchSeq.current
    if (!opts?.silent) setLoading(true)
    try {
      const [mentRes, abrData, userRes] = await Promise.all([
        supabase.from('mentorados').select('*').order('nome'),
        fetchAll<Abordagem>((from, to) =>
          supabase
            .from('sos_abordagens')
            .select('mentorado_id, box_index, marked_at, marked_by_email, marked_by_name, source')
            .order('id')
            .range(from, to)
        ),
        supabase.auth.getUser(),
      ])
      // Um fetch mais novo já está em voo — descarta este resultado obsoleto
      if (seq !== fetchSeq.current) return
      setMentorados(mentRes.data || [])
      setAbordagens(abrData)
      if (userRes.data.user) {
        setCurrentUser({
          email: userRes.data.user.email || '',
          name: userRes.data.user.user_metadata?.display_name || '',
        })
      }
    } catch {
      // Falha de rede no meio da busca — mantém o estado anterior na tela
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggle = useCallback(async (mentoradoId: string, boxIndex: number, source: string) => {
    const existing = abordagens.find(
      (a) => a.mentorado_id === mentoradoId && a.box_index === boxIndex && a.source === source
    )

    if (existing) {
      const { data: deleted, error } = await supabase
        .from('sos_abordagens')
        .delete()
        .eq('mentorado_id', mentoradoId)
        .eq('box_index', boxIndex)
        .eq('source', source)
        .select('mentorado_id')

      // RLS pode filtrar o delete e devolver "sucesso" com 0 linhas afetadas —
      // trata como falha pra não desmarcar na tela algo que continua no banco
      if (error || !deleted || deleted.length === 0) {
        fetchData({ silent: true })
        return
      }

      setAbordagens((prev) =>
        prev.filter((a) => !(a.mentorado_id === mentoradoId && a.box_index === boxIndex && a.source === source))
      )
    } else {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('sos_abordagens')
        .insert({
          mentorado_id: mentoradoId,
          box_index: boxIndex,
          marked_at: now,
          marked_by_email: currentUser.email,
          marked_by_name: currentUser.name,
          source,
        })

      if (error) {
        // Estado local desatualizado (ex.: marcação já existia no banco) — ressincroniza
        fetchData({ silent: true })
        return
      }

      setAbordagens((prev) => [
        ...prev,
        {
          mentorado_id: mentoradoId,
          box_index: boxIndex,
          marked_at: now,
          marked_by_email: currentUser.email,
          marked_by_name: currentUser.name,
          source,
        },
      ])
    }
  }, [abordagens, currentUser, fetchData])

  const turmas = useMemo(() => [...new Set(mentorados.map((m) => m.turma))].sort(), [mentorados])

  const filtered = useMemo(() => {
    // Só mentorados ativos entram na cobrança (exclui pausou/cancelou/finalizou/reembolsado)
    const active = mentorados.filter((m) => m.status === 'ativo')
    if (!turmaFilter) return active
    return active.filter((m) => m.turma === turmaFilter)
  }, [mentorados, turmaFilter])

  const classified = classifyMentorados(filtered)
  const totalAlerts = Object.values(classified).reduce((sum, arr) => sum + arr.length, 0)

  // Bell logic: only for mentorados IN SOS CS (posts < 3)
  const bellDays = role === 'admin' ? 15 : 7
  const bellSource = role === 'admin' ? 'rafa' : 'cs'
  const sosCsMentorados = useMemo(() => [
    ...classified['atencao-maxima'],
    ...classified['de-um-toque'],
  ], [classified])

  const needsBellSet = useMemo(() => {
    const set = new Set<string>()
    const now = Date.now()
    const threshold = bellDays * 24 * 60 * 60 * 1000

    for (const m of sosCsMentorados) {
      const relevantAbordagens = abordagens
        .filter((a) => a.mentorado_id === m.id && a.source === bellSource)
        .map((a) => new Date(a.marked_at).getTime())

      const lastContact = relevantAbordagens.length > 0 ? Math.max(...relevantAbordagens) : 0

      if (lastContact === 0 || now - lastContact >= threshold) {
        set.add(m.id)
      }
    }
    return set
  }, [sosCsMentorados, abordagens, bellDays, bellSource])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOS CS</h1>
          <p className="text-gray-500 text-sm mt-1">
            Mentorados com poucas publicações na semana
            {!loading && <span className="ml-2 font-medium text-gray-700">({totalAlerts} alertas)</span>}
            {!loading && needsBellSet.size > 0 && (
              <span className="ml-2 text-red-500 font-medium">🚨 {needsBellSet.size} precisam de toque</span>
            )}
          </p>
        </div>
      </div>

      {!loading && (
        <div className="mb-6">
          <select
            value={turmaFilter}
            onChange={(e) => setTurmaFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors bg-white"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          Analisando mentorados...
        </div>
      ) : (
        <div className="space-y-8">
          {levels.map((level) => {
            const list = classified[level.key as keyof typeof classified]
            return (
              <div key={level.key} className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${level.iconBg} flex items-center justify-center text-lg`}>
                    {level.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{level.title}</h2>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${level.badgeBg} ${level.badgeText}`}>
                        {list.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{level.description}</p>
                  </div>
                </div>

                {list.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-sm">Nenhum mentorado neste nível</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {list.map((m) => (
                      <MentoradoCard key={m.id} m={m} level={level} abordagens={abordagens} onToggle={handleToggle} needsBell={needsBellSet.has(m.id)} userRole={role} canMarcarRafa={canMarcarRafa} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
