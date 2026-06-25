'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type Mentorado } from '@/lib/supabase'
import { useUserRole } from '@/lib/useUserRole'
import { pode } from '@/lib/permissions'
import { formatNumber } from '@/lib/utils'
import AudioRecorder from '@/components/AudioRecorder'

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

const levels: Level[] = [
  {
    key: 'atencao-maxima',
    title: 'Atenção Máxima',
    icon: '🔴',
    description: '+90 dias de mentoria, ganhou menos de 10K seguidores, postando pelo menos 5x por semana',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    iconBg: 'bg-red-100',
  },
  {
    key: 'precisa-ajuda',
    title: 'Precisa de Ajuda',
    icon: '🟡',
    description: '+90 dias de mentoria, ganhou menos de 30K seguidores, postando pelo menos 5x por semana',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
  {
    key: 'fique-de-olho',
    title: 'Fique de Olho',
    icon: '🟠',
    description: '+60 dias de mentoria, ganhou menos de 10K seguidores, postando pelo menos 5x por semana',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
]

function getDaysInMentoria(dataInicio: string): number {
  const inicio = new Date(dataInicio)
  const agora = new Date()
  return Math.floor((agora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
}

function classifyMentorados(mentorados: Mentorado[]) {
  const atencaoMaxima: Mentorado[] = []
  const precisaAjuda: Mentorado[] = []
  const fiqueDeOlho: Mentorado[] = []

  const atencaoMaximaIds = new Set<string>()
  const precisaAjudaIds = new Set<string>()

  for (const m of mentorados) {
    const dias = getDaysInMentoria(m.data_inicio)
    const gained = m.seguidores_atual - m.seguidores_inicial

    if (dias >= 90 && gained < 10000 && m.posts >= 5) {
      atencaoMaxima.push(m)
      atencaoMaximaIds.add(m.id)
    }
  }

  for (const m of mentorados) {
    if (atencaoMaximaIds.has(m.id)) continue
    const dias = getDaysInMentoria(m.data_inicio)
    const gained = m.seguidores_atual - m.seguidores_inicial

    if (dias >= 90 && gained < 30000 && m.posts >= 5) {
      precisaAjuda.push(m)
      precisaAjudaIds.add(m.id)
    }
  }

  for (const m of mentorados) {
    if (atencaoMaximaIds.has(m.id) || precisaAjudaIds.has(m.id)) continue
    const dias = getDaysInMentoria(m.data_inicio)
    const gained = m.seguidores_atual - m.seguidores_inicial

    if (dias >= 60 && gained < 10000 && m.posts >= 5) {
      fiqueDeOlho.push(m)
    }
  }

  return { 'atencao-maxima': atencaoMaxima, 'precisa-ajuda': precisaAjuda, 'fique-de-olho': fiqueDeOlho }
}

function MentoradoCard({
  m,
  level,
  canGravarToque,
  onAudioRecorded,
  uploading,
}: {
  m: Mentorado
  level: Level
  canGravarToque: boolean
  onAudioRecorded: (mentoradoId: string, blob: Blob, extension: string) => void
  uploading: string | null
}) {
  const dias = getDaysInMentoria(m.data_inicio)
  const gained = m.seguidores_atual - m.seguidores_inicial
  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${level.borderColor} ${level.bgColor} transition-all hover:shadow-sm`}>
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
          <div className="font-semibold text-gray-900 truncate text-sm sm:text-base">{m.nome}</div>
          <div className="text-xs text-gray-500">@{m.instagram}</div>
        </div>

        {m.instagram && (
          <a
            href={`https://instagram.com/${m.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-pink-500 hover:text-pink-600 transition-colors"
            title={`Abrir @${m.instagram} no Instagram`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs mt-3 pt-3 border-t border-black/5">
        <div className="text-center flex-1">
          <div className="text-gray-400">Dias</div>
          <div className="font-bold text-gray-700">{dias}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Ganhou</div>
          <div className={`font-bold ${gained >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {gained >= 0 ? '+' : ''}{formatNumber(gained)}
          </div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Posts/sem</div>
          <div className="font-bold text-gray-700">{m.posts}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-gray-400">Turma</div>
          <div className="font-bold text-gray-700 truncate">{m.turma}</div>
        </div>
      </div>

      {/* Botão de gravar áudio — quem tem a capacidade gravar_toque */}
      {canGravarToque && (
        <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2">
          <AudioRecorder
            onRecorded={(blob, ext) => onAudioRecorded(m.id, blob, ext)}
            disabled={uploading === m.id}
          />
          {uploading === m.id && (
            <span className="text-xs text-brand-600">Enviando...</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function SosMentoresPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [turmaFilter, setTurmaFilter] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const { role, turma: userTurma, email, name, caps } = useUserRole()
  const isMentor = role === 'mentor'
  const canGravarToque = pode('gravar_toque', role, caps)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('mentorados').select('*').order('nome')
    setMentorados(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAudioRecorded = useCallback(async (mentoradoId: string, blob: Blob, extension: string) => {
    setUploading(mentoradoId)
    try {
      const fileName = `${mentoradoId}_${Date.now()}.${extension}`

      const { error: upErr } = await supabase.storage
        .from('audios')
        .upload(fileName, blob, { contentType: blob.type || 'audio/webm', upsert: false })

      if (upErr) {
        alert('Erro ao enviar áudio: ' + upErr.message)
        setUploading(null)
        return
      }

      const { data: urlData } = supabase.storage.from('audios').getPublicUrl(fileName)

      const { error: dbErr } = await supabase
        .from('toques')
        .insert({
          mentorado_id: mentoradoId,
          audio_url: urlData.publicUrl,
          created_by_email: email,
          created_by_name: name || 'Rafa',
        })

      if (dbErr) {
        alert('Erro ao salvar toque: ' + dbErr.message)
      } else {
        alert('Toque enviado!')
      }
    } catch {
      alert('Erro ao processar áudio')
    }
    setUploading(null)
  }, [email, name])

  const turmas = useMemo(() => [...new Set(mentorados.map((m) => m.turma))].sort(), [mentorados])

  const filtered = useMemo(() => {
    // Só mentorados ativos entram na cobrança (exclui pausou/cancelou/finalizou/reembolsado)
    let result = mentorados.filter((m) => m.status === 'ativo')
    if (isMentor && userTurma) {
      result = result.filter((m) => m.turma === userTurma)
    } else if (turmaFilter) {
      result = result.filter((m) => m.turma === turmaFilter)
    }
    return result
  }, [mentorados, turmaFilter, isMentor, userTurma])

  const classified = classifyMentorados(filtered)
  const totalAlerts = Object.values(classified).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOS Mentores</h1>
          <p className="text-gray-500 text-sm mt-1">
            Mentorados que precisam de atenção especial
            {!loading && <span className="ml-2 font-medium text-gray-700">({totalAlerts} alertas)</span>}
          </p>
        </div>
      </div>

      {!loading && !isMentor && (
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
                      <MentoradoCard
                        key={m.id}
                        m={m}
                        level={level}
                        canGravarToque={canGravarToque}
                        onAudioRecorded={handleAudioRecorded}
                        uploading={uploading}
                      />
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
