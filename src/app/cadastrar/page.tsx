'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import type { InstagramProfile } from '@/lib/instagram'
import InstagramPreview from '@/components/InstagramPreview'

export default function CadastrarPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nome: '',
    instagram: '',
    nicho: '',
    turma: 'Turma 1 - Rafa',
    plano: 12,
    data_inicio: new Date().toISOString().split('T')[0],
    seguidores_inicial: 0,
    seguidores_atual: 0,
    posts: 0,
    avatar: '',
  })
  const [igProfile, setIgProfile] = useState<InstagramProfile | null>(null)
  const [igLoading, setIgLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Debounced Instagram lookup
  useEffect(() => {
    const username = form.instagram.replace('@', '').trim()
    if (username.length < 2) {
      setIgProfile(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIgLoading(true)
      try {
        const res = await authedFetch(`/api/instagram/${encodeURIComponent(username)}`)
        if (res.ok) {
          const data: InstagramProfile = await res.json()
          setIgProfile(data)
          // Auto-fill
          setForm((prev) => ({
            ...prev,
            seguidores_inicial: data.follower_count,
            seguidores_atual: data.follower_count,
            avatar: data.profile_pic_url || '',
            posts: data.posts_last_7d ?? prev.posts,
            ...(data.full_name && !prev.nome ? { nome: data.full_name } : {}),
          }))
          // Upload avatar to permanent storage
          if (data.profile_pic_url) {
            authedFetch('/api/upload-avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, imageUrl: data.profile_pic_url }),
            })
              .then((r) => r.json())
              .then((result) => {
                if (result.url) {
                  setForm((prev) => ({ ...prev, avatar: result.url }))
                }
              })
              .catch(() => {})
          }
        } else {
          setIgProfile(null)
        }
      } catch {
        setIgProfile(null)
      }
      setIgLoading(false)
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form.instagram])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.instagram) {
      alert('Nome e Instagram são obrigatórios!')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('mentorados').insert({
      nome: form.nome,
      instagram: form.instagram.replace('@', '').trim(),
      nicho: form.nicho,
      turma: form.turma,
      plano: form.plano,
      data_inicio: form.data_inicio,
      seguidores_inicial: form.seguidores_inicial,
      seguidores_atual: form.seguidores_atual,
      posts: form.posts,
      avatar: form.avatar || null,
    })
    setSubmitting(false)
    if (error) {
      alert('Erro ao cadastrar: ' + error.message)
      return
    }
    alert('Mentorado cadastrado com sucesso! 🎉')
    router.push('/')
  }

  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cadastrar Mentorado</h1>
        <p className="text-gray-500 text-sm mt-1">Adicione um novo mentorado à sua turma</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Instagram + Preview */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Instagram</label>
            <input
              className={inputClass}
              placeholder="@usuario"
              value={form.instagram}
              onChange={(e) => handleChange('instagram', e.target.value)}
            />
          </div>
          <InstagramPreview profile={igProfile} loading={igLoading} />
        </div>

        <div>
          <label className={labelClass}>Nome</label>
          <input
            className={inputClass}
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Nicho</label>
          <input
            className={inputClass}
            placeholder="Ex: Fitness, Educação, Moda..."
            value={form.nicho}
            onChange={(e) => handleChange('nicho', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div>
            <label className={labelClass}>Data Início</label>
            <input
              type="date"
              className={inputClass}
              value={form.data_inicio}
              onChange={(e) => handleChange('data_inicio', e.target.value)}
            />
          </div>
        </div>



        <div>
          <label className={labelClass}>Seguidores ao Entrar</label>
          <input
            type="number"
            className={inputClass}
            placeholder="Ex: 1500"
            value={form.seguidores_inicial}
            onChange={(e) => handleChange('seguidores_inicial', Number(e.target.value))}
          />
          <p className="text-xs text-gray-400 mt-1">Preenchido automaticamente pelo Instagram, mas pode editar</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 text-white font-medium bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? 'Cadastrando...' : '✨ Cadastrar Mentorado'}
        </button>
      </form>
    </div>
  )
}
