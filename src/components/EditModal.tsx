'use client'

import { useState } from 'react'
import { supabase, type Mentorado } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import type { UserRole } from '@/lib/useUserRole'

type Props = {
  mentorado: Mentorado
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  userRole?: UserRole
}

export default function EditModal({ mentorado, onClose, onSave, onDelete, userRole = 'admin' }: Props) {
  const [form, setForm] = useState({
    nome: mentorado.nome,
    instagram: mentorado.instagram,
    nicho: mentorado.nicho,
    turma: mentorado.turma,
    plano: mentorado.plano,
    data_inicio: mentorado.data_inicio,
    seguidores_atual: mentorado.seguidores_atual,
  })
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = userRole === 'admin'
  const canManageStatus = userRole === 'admin' || userRole === 'gerente'
  const canEditSeguidores = isAdmin
  const instagramChanged = form.instagram.replace('@', '').trim().toLowerCase() !== mentorado.instagram.replace('@', '').trim().toLowerCase()

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)

    const cleanIg = form.instagram.replace('@', '').trim()
    const updateData: Record<string, unknown> = {
      nome: form.nome,
      instagram: cleanIg,
      nicho: form.nicho,
      turma: form.turma,
      plano: form.plano,
      data_inicio: form.data_inicio,
      updated_at: new Date().toISOString(),
    }
    if (canEditSeguidores) {
      updateData.seguidores_atual = form.seguidores_atual
    }

    const { error } = await supabase
      .from('mentorados')
      .update(updateData)
      .eq('id', mentorado.id)

    if (error) {
      setSaving(false)
      alert('Erro ao salvar: ' + error.message)
      return
    }

    // If instagram changed, fetch new profile data (followers, photo)
    if (instagramChanged) {
      try {
        const res = await authedFetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mentoradoId: mentorado.id, instagram: cleanIg }),
        })
        if (res.ok) {
          const data = await res.json()
          alert(`Mentorado atualizado! Seguidores: ${data.follower_count?.toLocaleString('pt-BR') || '-'}`)
        } else {
          alert('Mentorado salvo, mas não foi possível buscar dados do novo Instagram.')
        }
      } catch {
        alert('Mentorado salvo, mas erro ao buscar dados do Instagram.')
      }
    } else {
      alert('Mentorado atualizado!')
    }

    setSaving(false)
    onSave()
  }

  const handleForceRefresh = async () => {
    setRefreshing(true)
    try {
      const cleanIg = form.instagram.replace('@', '').trim()
      const res = await authedFetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentoradoId: mentorado.id, instagram: cleanIg }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Instagram atualizado! Seguidores: ${data.follower_count?.toLocaleString('pt-BR') ?? '-'} • Posts/7d: ${data.posts_last_7d ?? 0}`)
        onSave()
      } else {
        alert('Não foi possível puxar esse perfil. Verifique se o @ está correto e tente novamente.')
      }
    } catch {
      alert('Erro ao conectar com o Instagram. Tente novamente.')
    }
    setRefreshing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${mentorado.nome}?`)) return
    const { error } = await supabase
      .from('mentorados')
      .delete()
      .eq('id', mentorado.id)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
      return
    }
    alert('Mentorado excluído!')
    onDelete()
  }

  const inputClass = 'w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Editar Mentorado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className={labelClass}>Nome</label>
            <input className={inputClass} value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input className={inputClass} value={form.instagram} onChange={(e) => handleChange('instagram', e.target.value)} />
            {instagramChanged && (
              <p className="text-xs text-brand-600 mt-1">Ao salvar, os dados do Instagram serão atualizados automaticamente</p>
            )}
            <button
              type="button"
              onClick={handleForceRefresh}
              disabled={refreshing}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
              title="Força a busca dos dados do Instagram para este perfil agora"
            >
              {refreshing ? '🔄 Atualizando...' : '🔄 Forçar atualização do Instagram'}
            </button>
          </div>
          <div>
            <label className={labelClass}>Nicho</label>
            <input className={inputClass} value={form.nicho} onChange={(e) => handleChange('nicho', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Turma</label>
              <select className={inputClass} value={form.turma} onChange={(e) => handleChange('turma', e.target.value)}>
                <option value="Turma 1 - Rafa">Turma 1 - Rafa</option>
                <option value="Turma 2 - Rafa">Turma 2 - Rafa</option>
                <option value="Turma 3 - Carlos">Turma 3 - Carlos</option>
                <option value="Turma 4 - Ivens">Turma 4 - Ivens</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Plano</label>
              <select className={inputClass} value={form.plano} onChange={(e) => handleChange('plano', Number(e.target.value))}>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Data de Entrada</label>
            <input type="date" className={inputClass} value={form.data_inicio} onChange={(e) => handleChange('data_inicio', e.target.value)} />
          </div>
          {canEditSeguidores && (
            <div>
              <label className={labelClass}>Seguidores Atuais</label>
              <input
                type="number"
                className={inputClass}
                value={form.seguidores_atual}
                onChange={(e) => handleChange('seguidores_atual', Number(e.target.value))}
              />
            </div>
          )}

          {/* Status indicator */}
          {mentorado.status !== 'ativo' && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              mentorado.status === 'cancelou' ? 'bg-red-50 text-red-700 border border-red-200'
                : mentorado.status === 'finalizou' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : mentorado.status === 'reembolsado' ? 'bg-slate-100 text-slate-700 border border-slate-300'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span>{mentorado.status === 'cancelou' ? '❌' : mentorado.status === 'finalizou' ? '🏁' : mentorado.status === 'reembolsado' ? '💸' : '⏸️'}</span>
              {mentorado.status === 'cancelou' ? 'Cancelou' : mentorado.status === 'finalizou' ? 'Finalizou' : mentorado.status === 'reembolsado' ? 'Reembolsou' : 'Pausou'}
              {mentorado.status_at && (
                <span className="text-xs opacity-70">
                  em {new Date(mentorado.status_at).toLocaleDateString('pt-BR')}
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (!confirm('Reativar este mentorado (voltar para Ativo)?')) return
                    await supabase.from('mentorados').update({ status: 'ativo', status_at: null }).eq('id', mentorado.id)
                    alert('Status reativado!')
                    onSave()
                  }}
                  className="ml-auto flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
                >
                  ↩️ Reativar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {canManageStatus && (
              <button
                onClick={handleDelete}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                🗑️ Excluir
              </button>
            )}
            {canManageStatus && mentorado.status === 'ativo' && (
              <>
                <button
                  onClick={async () => {
                    if (!confirm('Marcar como CANCELOU?')) return
                    await supabase.from('mentorados').update({ status: 'cancelou', status_at: new Date().toISOString() }).eq('id', mentorado.id)
                    alert('Marcado como cancelou')
                    onSave()
                  }}
                  className="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                >
                  ❌ Cancelou
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Marcar como PAUSOU?')) return
                    await supabase.from('mentorados').update({ status: 'pausou', status_at: new Date().toISOString() }).eq('id', mentorado.id)
                    alert('Marcado como pausou')
                    onSave()
                  }}
                  className="px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200"
                >
                  ⏸️ Pausou
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Marcar como FINALIZOU?')) return
                    await supabase.from('mentorados').update({ status: 'finalizou', status_at: new Date().toISOString() }).eq('id', mentorado.id)
                    alert('Marcado como finalizou')
                    onSave()
                  }}
                  className="px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200"
                >
                  🏁 Finalizou
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Marcar como REEMBOLSOU?')) return
                    await supabase.from('mentorados').update({ status: 'reembolsado', status_at: new Date().toISOString() }).eq('id', mentorado.id)
                    alert('Marcado como reembolsou')
                    onSave()
                  }}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300"
                >
                  💸 Reembolsou
                </button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (instagramChanged ? 'Buscando Instagram...' : 'Salvando...') : '💾 Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
