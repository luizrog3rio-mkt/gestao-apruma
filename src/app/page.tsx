'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type Mentorado } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import { useUserRole } from '@/lib/useUserRole'
import StatsCards from '@/components/StatsCards'
import MentoradosTable from '@/components/MentoradosTable'
import EditModal from '@/components/EditModal'
import Filters from '@/components/Filters'

export default function Dashboard() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Mentorado | null>(null)
  const [updating, setUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('')
  const [planoFilter, setPlanoFilter] = useState('')
  const [growthFilter, setGrowthFilter] = useState('')
  const [igFilter, setIgFilter] = useState('')
  const [sort, setSort] = useState('nome')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { role, turma: userTurma } = useUserRole()
  const isAdmin = role === 'admin'
  const isMentor = role === 'mentor'

  const fetchMentorados = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mentorados')
      .select('*')
      .order('nome')
    if (error) {
      console.error('Erro ao buscar mentorados:', error)
    }
    setMentorados(data || [])
    setLoading(false)
  }, [])

  const updateFromInstagram = useCallback(async () => {
    setUpdating(true)
    try {
      const res = await authedFetch('/api/update-posts', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        console.log(`Updated ${data.updated}/${data.total} mentorados`)
        setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
        await fetchMentorados()
      }
    } catch (err) {
      console.error('Error updating from Instagram:', err)
    }
    setUpdating(false)
  }, [fetchMentorados])

  useEffect(() => {
    fetchMentorados()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const turmas = useMemo(() => [...new Set(mentorados.map((m) => m.turma))].sort(), [mentorados])

  const filtered = useMemo(() => {
    return mentorados
      .filter((m) => {
        // Mentor only sees their turma
        if (isMentor && userTurma && m.turma !== userTurma) return false
        // Date filter on data_inicio
        if (dateFrom && m.data_inicio < dateFrom) return false
        if (dateTo && m.data_inicio > dateTo) return false
        const q = search.toLowerCase()
        if (q && !m.nome.toLowerCase().includes(q) && !m.instagram.toLowerCase().includes(q) && !m.nicho.toLowerCase().includes(q)) return false
        if (turmaFilter && m.turma !== turmaFilter) return false
        if (planoFilter && m.plano !== Number(planoFilter)) return false
        if (growthFilter) {
          const gained = m.seguidores_atual - m.seguidores_inicial
          if (growthFilter === '100k' && gained < 100000) return false
          if (growthFilter === '30k' && (gained < 30000 || gained >= 100000)) return false
          if (growthFilter === '10k' && (gained < 10000 || gained >= 30000)) return false
          if (growthFilter === 'under10k' && gained >= 10000) return false
        }
        if (igFilter === 'issue' && !m.ig_issue) return false
        if (igFilter === 'not_found' && m.ig_issue !== 'not_found') return false
        if (igFilter === 'restricted' && m.ig_issue !== 'restricted') return false
        return true
      })
      .sort((a, b) => {
        switch (sort) {
          case 'nome': return a.nome.localeCompare(b.nome)
          case 'seguidores': return b.seguidores_atual - a.seguidores_atual
          case 'crescimento': return (b.seguidores_atual - b.seguidores_inicial) - (a.seguidores_atual - a.seguidores_inicial)
          case 'posts': return b.posts - a.posts
          default: return 0
        }
      })
  }, [mentorados, search, turmaFilter, planoFilter, growthFilter, igFilter, sort, isMentor, userTurma, dateFrom, dateTo])

  const igIssueCount = useMemo(
    () => mentorados.filter((m) => m.ig_issue && (!isMentor || !userTurma || m.turma === userTurma)).length,
    [mentorados, isMentor, userTurma]
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Página Inicial</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral dos seus mentorados</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-400">Atualizado às {lastUpdate}</span>
            )}
            <button
              onClick={updateFromInstagram}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {updating ? (
                <>
                  <span className="animate-spin">🔄</span>
                  Atualizando...
                </>
              ) : (
                <>
                  📸 Atualizar Instagram
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {igIssueCount > 0 && igFilter !== 'issue' && !isMentor && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <span>⚠️ {igIssueCount} {igIssueCount === 1 ? 'perfil com problema no Instagram' : 'perfis com problema no Instagram'} (não encontrado ou privado/restrito).</span>
          <button onClick={() => setIgFilter('issue')} className="font-medium underline hover:text-amber-900 whitespace-nowrap">Ver quais</button>
        </div>
      )}

      <StatsCards mentorados={filtered} />

      <Filters
        search={search}
        turmaFilter={turmaFilter}
        planoFilter={planoFilter}
        growthFilter={growthFilter}
        igFilter={igFilter}
        sort={sort}
        turmas={turmas}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={setSearch}
        onTurmaChange={setTurmaFilter}
        onPlanoChange={setPlanoFilter}
        onGrowthChange={setGrowthFilter}
        onIgFilterChange={setIgFilter}
        onSortChange={setSort}
        onRefresh={fetchMentorados}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        hideTurmaFilter={isMentor}
      />

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          Carregando mentorados...
        </div>
      ) : (
        <MentoradosTable
          mentorados={filtered}
          onEdit={isMentor ? undefined : setEditing}
          lastUpdate={lastUpdate}
        />
      )}

      {!isMentor && editing && (
        <EditModal
          mentorado={editing}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); fetchMentorados() }}
          onDelete={() => { setEditing(null); fetchMentorados() }}
          userRole={role}
        />
      )}
    </div>
  )
}
