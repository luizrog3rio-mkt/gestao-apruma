'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  search: string
  turmaFilter: string
  planoFilter: string
  growthFilter: string
  igFilter: string
  sort: string
  turmas: string[]
  dateFrom: string
  dateTo: string
  onSearchChange: (v: string) => void
  onTurmaChange: (v: string) => void
  onPlanoChange: (v: string) => void
  onGrowthChange: (v: string) => void
  onIgFilterChange: (v: string) => void
  onSortChange: (v: string) => void
  onRefresh: () => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  hideTurmaFilter?: boolean
}

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const sub = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return d }
  const startOfWeek = () => { const d = new Date(today); d.setDate(d.getDate() - d.getDay() + 1); return d }
  const startOfMonth = () => new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfLastMonth = () => new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfLastMonth = () => new Date(today.getFullYear(), today.getMonth(), 0)

  switch (preset) {
    case 'today': return { from: fmt(today), to: fmt(today) }
    case 'yesterday': return { from: fmt(sub(1)), to: fmt(sub(1)) }
    case '7days': return { from: fmt(sub(6)), to: fmt(today) }
    case '14days': return { from: fmt(sub(13)), to: fmt(today) }
    case '28days': return { from: fmt(sub(27)), to: fmt(today) }
    case '30days': return { from: fmt(sub(29)), to: fmt(today) }
    case 'this-week': return { from: fmt(startOfWeek()), to: fmt(today) }
    case 'last-week': { const s = startOfWeek(); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return { from: fmt(s), to: fmt(e) } }
    case 'this-month': return { from: fmt(startOfMonth()), to: fmt(today) }
    case 'last-month': return { from: fmt(startOfLastMonth()), to: fmt(endOfLastMonth()) }
    default: return { from: '', to: '' }
  }
}

const presets = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 7 dias', value: '7days' },
  { label: 'Últimos 14 dias', value: '14days' },
  { label: 'Últimos 28 dias', value: '28days' },
  { label: 'Últimos 30 dias', value: '30days' },
  { label: 'Esta semana', value: 'this-week' },
  { label: 'Semana passada', value: 'last-week' },
  { label: 'Este mês', value: 'this-month' },
  { label: 'Mês passado', value: 'last-month' },
]

function DateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasFilter = !!dateFrom || !!dateTo
  const label = hasFilter
    ? `${dateFrom ? new Date(dateFrom + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'} - ${dateTo ? new Date(dateTo + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...'}`
    : '📅 Data de entrada'

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetDates(preset)
    onDateFromChange(from)
    onDateToChange(to)
    setOpen(false)
  }

  const clear = () => {
    onDateFromChange('')
    onDateToChange('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full sm:w-auto px-4 py-2 border rounded-xl text-sm text-left flex items-center gap-2 transition-colors ${
          hasFilter
            ? 'border-brand-300 bg-brand-50 text-brand-700 font-medium'
            : 'border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        {label}
        {hasFilter && (
          <span
            onClick={(e) => { e.stopPropagation(); clear() }}
            className="text-brand-400 hover:text-brand-600 ml-1"
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 w-[320px] sm:w-[380px] animate-scale-in">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className="px-3 py-1.5 text-xs text-left rounded-lg hover:bg-brand-50 hover:text-brand-700 transition-colors text-gray-600"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-2">Personalizado</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <span className="text-gray-400 text-sm">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button onClick={clear} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
                Limpar
              </button>
              <button onClick={() => setOpen(false)} className="px-4 py-1.5 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Filters({
  search, turmaFilter, planoFilter, growthFilter, igFilter, sort, turmas,
  dateFrom, dateTo,
  onSearchChange, onTurmaChange, onPlanoChange, onGrowthChange, onIgFilterChange, onSortChange, onRefresh,
  onDateFromChange, onDateToChange,
  hideTurmaFilter,
}: Props) {
  const selectClass = 'w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6 mb-4 lg:mb-6 animate-fade-in">
      <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar mentorado..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
        />
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
        />
        {!hideTurmaFilter && (
          <select value={turmaFilter} onChange={(e) => onTurmaChange(e.target.value)} className={selectClass}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <select value={planoFilter} onChange={(e) => onPlanoChange(e.target.value)} className={selectClass}>
          <option value="">Todos os planos</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </select>
        <select value={growthFilter} onChange={(e) => onGrowthChange(e.target.value)} className={selectClass}>
          <option value="">Todos os ganhos</option>
          <option value="100k">🏆 Ganhou +100 mil seguidores</option>
          <option value="30k">🔥 Ganhou 30 mil – 100 mil</option>
          <option value="10k">💪 Ganhou 10 mil – 30 mil</option>
          <option value="under10k">🆘 Ganhou menos de 10 mil</option>
        </select>
        <select value={igFilter} onChange={(e) => onIgFilterChange(e.target.value)} className={selectClass}>
          <option value="">Instagram: todos</option>
          <option value="issue">⚠️ Com problema</option>
          <option value="not_found">Não encontrado</option>
          <option value="restricted">Privado/restrito</option>
        </select>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} className={selectClass}>
          <option value="nome">Ordenar: Nome</option>
          <option value="seguidores">Ordenar: Seguidores</option>
          <option value="crescimento">Ordenar: Seguidores Ganhos</option>
          <option value="posts">Ordenar: Posts 7 Dias</option>
        </select>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
          title="Atualizar"
        >
          🔄
        </button>
      </div>
    </div>
  )
}
