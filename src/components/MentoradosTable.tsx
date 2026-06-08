'use client'

import type { Mentorado } from '@/lib/supabase'
import { formatNumber, calcTempoRestante } from '@/lib/utils'

type Props = {
  mentorados: Mentorado[]
  onEdit?: (m: Mentorado) => void
  lastUpdate?: string | null
}

function AvatarImg({ m, lastUpdate }: { m: Mentorado; lastUpdate?: string | null }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nome)}&background=E8DEF8&color=6B21A8&size=80`
  if (m.avatar && m.avatar.includes('supabase')) {
    return (
      <img
        src={`${m.avatar}${lastUpdate ? `?t=${lastUpdate}` : ''}`}
        alt={m.nome}
        className="w-full h-full object-cover"
        onError={(e) => { e.currentTarget.src = fallback }}
      />
    )
  }
  return (
    <img
      src={m.instagram ? `/api/avatar/${m.instagram}${lastUpdate ? `?t=${lastUpdate}` : ''}` : fallback}
      alt={m.nome}
      className="w-full h-full object-cover"
      onError={(e) => { e.currentTarget.src = fallback }}
    />
  )
}

function MobileCard({ m, onEdit, lastUpdate }: { m: Mentorado; onEdit?: (m: Mentorado) => void; lastUpdate?: string | null }) {
  const gained = m.seguidores_atual - m.seguidores_inicial
  const tempo = calcTempoRestante(m.data_inicio, m.plano)

  return (
    <div
      onClick={() => onEdit?.(m)}
      className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm ${onEdit ? 'cursor-pointer active:bg-gray-50' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden flex-shrink-0">
          <AvatarImg m={m} lastUpdate={lastUpdate} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{m.nome}</div>
          <div className="text-gray-400 text-xs">@{m.instagram}</div>
        </div>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(m) }}
            className="text-brand-600 text-sm"
          >
            ✏️
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-lg">{m.turma}</span>
        <span className="text-xs text-gray-500">{m.nicho}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ml-auto ${
          m.status === 'cancelou' ? 'bg-red-100 text-red-700'
            : m.status === 'pausou' ? 'bg-amber-100 text-amber-700'
            : m.status === 'finalizou' ? 'bg-emerald-100 text-emerald-700'
            : m.status === 'reembolsado' ? 'bg-slate-200 text-slate-700'
            : m.plano === 12 ? 'bg-brand-100 text-brand-700' : 'bg-purple-50 text-purple-500'
        }`}>
          {m.status === 'cancelou' ? '❌ Cancelou' : m.status === 'pausou' ? '⏸️ Pausou' : m.status === 'finalizou' ? '🏁 Finalizou' : m.status === 'reembolsado' ? '💸 Reembolsou' : `${m.plano}m`}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs pt-2 border-t border-gray-100">
        <div className="text-center">
          <div className="text-gray-400">Seguidores</div>
          <div className="font-bold text-gray-900">{formatNumber(m.seguidores_atual)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Ganhou</div>
          <div className={`font-bold ${gained >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {gained >= 0 ? '+' : ''}{formatNumber(gained)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Posts/7d</div>
          <div className="font-bold text-gray-700">{m.posts}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Restante</div>
          <div className="font-bold text-gray-700 text-[11px]">{tempo}</div>
        </div>
      </div>
    </div>
  )
}

export default function MentoradosTable({ mentorados, onEdit, lastUpdate }: Props) {
  if (mentorados.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 animate-fade-in">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-lg font-medium">Nenhum mentorado encontrado</div>
        <div className="text-sm mt-1">Tente ajustar os filtros ou cadastre um novo mentorado</div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="lg:hidden space-y-3 animate-fade-in">
        {mentorados.map((m) => (
          <MobileCard key={m.id} m={m} onEdit={onEdit} lastUpdate={lastUpdate} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-4 font-medium">Mentorado</th>
                <th className="px-4 py-4 font-medium">Nicho</th>
                <th className="px-4 py-4 font-medium">Turma</th>
                <th className="px-4 py-4 font-medium">Seguidores</th>
                <th className="px-4 py-4 font-medium">Seguidores Ganhos</th>
                <th className="px-4 py-4 font-medium">Posts 7 Dias</th>
                <th className="px-4 py-4 font-medium">Plano</th>
                <th className="px-4 py-4 font-medium">Tempo Restante</th>
                {onEdit && <th className="px-4 py-4 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {mentorados.map((m) => {
                const tempo = calcTempoRestante(m.data_inicio, m.plano)
                const gained = m.seguidores_atual - m.seguidores_inicial
                return (
                  <tr
                    key={m.id}
                    onClick={() => onEdit?.(m)}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${onEdit ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden flex-shrink-0">
                          <AvatarImg m={m} lastUpdate={lastUpdate} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{m.nome}</div>
                          <div className="text-gray-400 text-xs">@{m.instagram}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{m.nicho}</td>
                    <td className="px-4 py-4">
                      <span className="bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded-lg">
                        {m.turma}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{formatNumber(m.seguidores_atual)}</div>
                      <div className="text-gray-400 text-xs">tinha {formatNumber(m.seguidores_inicial)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-medium ${gained >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {gained >= 0 ? '+' : ''}{formatNumber(gained)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{m.posts}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        m.status === 'cancelou' ? 'bg-red-100 text-red-700'
                          : m.status === 'pausou' ? 'bg-amber-100 text-amber-700'
                          : m.status === 'finalizou' ? 'bg-emerald-100 text-emerald-700'
                          : m.status === 'reembolsado' ? 'bg-slate-200 text-slate-700'
                          : m.plano === 12 ? 'bg-brand-100 text-brand-700'
                          : 'bg-purple-50 text-purple-500'
                      }`}>
                        {m.status === 'cancelou' ? '❌ Cancelou' : m.status === 'pausou' ? '⏸️ Pausou' : m.status === 'finalizou' ? '🏁 Finalizou' : m.status === 'reembolsado' ? '💸 Reembolsou' : `${m.plano}m`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-xs">{tempo}</td>
                    {onEdit && (
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(m) }}
                          className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                        >
                          ✏️
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
