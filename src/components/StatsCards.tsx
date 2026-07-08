import type { Mentorado } from '@/lib/supabase'

type Props = {
  mentorados: Mentorado[]
}

export default function StatsCards({ mentorados }: Props) {
  const total = mentorados.length

  const gained100k = mentorados.filter((m) => (m.seguidores_atual - m.seguidores_inicial) >= 100000).length
  const gained30k = mentorados.filter((m) => { const g = m.seguidores_atual - m.seguidores_inicial; return g >= 30000 && g < 100000 }).length
  const gained10k = mentorados.filter((m) => { const g = m.seguidores_atual - m.seguidores_inicial; return g >= 10000 && g < 30000 }).length
  const gainedUnder10k = mentorados.filter((m) => (m.seguidores_atual - m.seguidores_inicial) < 10000).length

  const ativos = mentorados.filter((m) => m.status === 'ativo').length
  const cancelou = mentorados.filter((m) => m.status === 'cancelou').length
  const pausou = mentorados.filter((m) => m.status === 'pausou').length
  const finalizou = mentorados.filter((m) => m.status === 'finalizou').length
  const reembolsou = mentorados.filter((m) => m.status === 'reembolsado').length

  const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(0)}%` : '0%'

  const cards = [
    { label: 'Total Mentorados', value: total, color: 'bg-brand-600', icon: '👥', badge: 'Mentorados', percent: null },
    { label: 'Ativos', value: ativos, color: 'bg-green-600', icon: '✅', badge: null, percent: pct(ativos) },
    { label: 'Ganhou +100 mil seguidores', value: gained100k, color: 'bg-green-500', icon: '🏆', badge: null, percent: pct(gained100k) },
    { label: 'Ganhou 30 mil – 100 mil', value: gained30k, color: 'bg-brand-600', icon: '🔥', badge: null, percent: pct(gained30k) },
    { label: 'Ganhou 10 mil – 30 mil', value: gained10k, color: 'bg-brand-400', icon: '💪', badge: null, percent: pct(gained10k) },
    { label: 'Ganhou menos de 10 mil', value: gainedUnder10k, color: 'bg-red-500', icon: '🆘', badge: null, percent: pct(gainedUnder10k) },
    { label: 'Cancelou', value: cancelou, color: 'bg-red-500', icon: '❌', badge: null, percent: pct(cancelou) },
    { label: 'Pausou', value: pausou, color: 'bg-amber-500', icon: '⏸️', badge: null, percent: pct(pausou) },
    { label: 'Finalizou', value: finalizou, color: 'bg-emerald-500', icon: '🏁', badge: null, percent: pct(finalizou) },
    { label: 'Reembolsou', value: reembolsou, color: 'bg-slate-500', icon: '💸', badge: null, percent: pct(reembolsou) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl p-4 lg:p-6 card-hover shadow-sm border border-gray-100 animate-fade-in"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">{card.icon}</span>
            {card.badge && (
              <span className={`${card.color} text-white text-xs font-bold px-2 py-1 rounded-lg`}>
                {card.badge}
              </span>
            )}
            {card.percent && (
              <span className="text-sm font-bold text-gray-400">
                {card.percent}
              </span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-gray-900">{card.value}</div>
          <div className="text-xs lg:text-sm text-gray-500 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
