'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { authedFetch } from '@/lib/api-client'
import { useUserRole } from '@/lib/useUserRole'

type UsuarioSistema = {
  id: string
  email: string
  nome: string
  role: 'admin' | 'gerente' | 'mentor' | null
  turma: string | null
  created_at: string
  last_sign_in_at: string | null
}

const roleBadge: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-brand-100 text-brand-700' },
  gerente: { label: 'Gerente', cls: 'bg-slate-200 text-slate-700' },
  mentor: { label: 'Mentor', cls: 'bg-gray-100 text-gray-600' },
}

function RoleTag({ role }: { role: string | null }) {
  if (!role) {
    return <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">sem papel</span>
  }
  const b = roleBadge[role] || { label: role, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${b.cls}`}>{b.label}</span>
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Só o nome vai para o serviço externo de avatar — nunca o e-mail (dado sensível do login).
function avatarUrl(nome: string) {
  const label = (nome || '?').trim()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=E8DEF8&color=6B21A8&size=96`
}

export default function UsuariosPage() {
  const { role, loading: roleLoading } = useUserRole()
  const isAdmin = role === 'admin'

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch('/api/usuarios')
      if (!res.ok) {
        setError(
          res.status === 403
            ? 'Você não tem permissão para ver esta página.'
            : res.status === 401
              ? 'Sua sessão expirou. Faça login novamente.'
              : 'Não foi possível carregar os usuários.'
        )
        setUsuarios([])
        return
      }
      const json = await res.json()
      setUsuarios(json.usuarios || [])
    } catch {
      setError('Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (roleLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchUsuarios()
  }, [roleLoading, isAdmin, fetchUsuarios])

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter(
      (u) =>
        (u.nome || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.turma || '').toLowerCase().includes(q)
    )
  }, [usuarios, busca])

  // Enquanto a role não resolve, estado neutro — evita flash de "Carregando usuários" para não-admin.
  if (roleLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-gray-300 shadow-sm border border-gray-100">
        <div className="text-3xl animate-pulse">⏳</div>
      </div>
    )
  }

  // Gate de acesso (só admin) — espelha o 403 da API.
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
        <div className="text-3xl mb-3">🔒</div>
        <p className="font-medium text-gray-700">Acesso restrito</p>
        <p className="text-sm mt-1">Esta página é exclusiva para administradores.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Acessos ao painel — administradores, gerentes e mentores</p>
        </div>
        {!loading && !error && (
          <span className="text-sm text-gray-400 shrink-0">
            {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}
          </span>
        )}
      </div>

      {/* Busca */}
      {!loading && !error && usuarios.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail, papel ou turma..."
            className="w-full sm:w-96 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-300 outline-none"
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          Carregando usuários...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
          <div className="text-3xl mb-3">⚠️</div>
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium text-gray-700">
            {busca ? 'Nenhum usuário corresponde à busca' : 'Nenhum usuário cadastrado'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {busca ? 'Tente outro termo de busca.' : 'Os acessos ao painel aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabela desktop */}
          <table className="hidden lg:table w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Papel</th>
                <th className="px-6 py-3">Turma</th>
                <th className="px-6 py-3">Criado em</th>
                <th className="px-6 py-3">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 overflow-hidden shrink-0">
                        <img src={avatarUrl(u.nome)} alt="" width={36} height={36} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.nome || '—'}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3"><RoleTag role={u.role} /></td>
                  <td className="px-6 py-3 text-sm text-gray-600">{u.turma || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{fmtDate(u.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards mobile */}
          <div className="lg:hidden divide-y divide-gray-50">
            {filtered.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden shrink-0">
                  <img src={avatarUrl(u.nome)} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.nome || u.email}</p>
                    <RoleTag role={u.role} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {u.turma ? `${u.turma} · ` : ''}último acesso {fmtDate(u.last_sign_in_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
