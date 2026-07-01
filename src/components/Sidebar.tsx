'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase, fetchAll } from '@/lib/supabase'
import { useUserRole, type UserRole } from '@/lib/useUserRole'

const allNavItems = [
  { label: 'Página Inicial', href: '/', icon: '📊', roles: ['admin', 'gerente', 'mentor'] as UserRole[] },
  { label: 'Cadastrar', href: '/cadastrar', icon: '➕', roles: ['admin', 'gerente'] as UserRole[] },
  { label: 'SOS Mentores', href: '/sos-mentores', icon: '🆘', roles: ['admin', 'gerente', 'mentor'] as UserRole[] },
  { label: 'SOS CS', href: '/sos-cs', icon: '⚠️', roles: ['admin', 'gerente'] as UserRole[] },
  { label: 'Toque do Rafa', href: '/toque-do-rafa', icon: '🎙️', roles: ['admin', 'gerente', 'mentor'] as UserRole[] },
  { label: 'Usuários', href: '/usuarios', icon: '👥', roles: ['admin'] as UserRole[] },
]

function useSosCsBells(role: UserRole) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Only for admin and gerente
    if (role === 'mentor') return

    const fetchBells = async () => {
      const bellDays = role === 'admin' ? 15 : 7
      const bellSource = role === 'admin' ? 'rafa' : 'cs'
      const threshold = bellDays * 24 * 60 * 60 * 1000
      const now = Date.now()

      // Get mentorados with low posts (SOS CS criteria: posts < 3)
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id, posts')
        .eq('status', 'ativo')
      if (!mentorados) return

      const sosCsIds = mentorados.filter((m) => m.posts < 3).map((m) => m.id)
      if (sosCsIds.length === 0) { setCount(0); return }

      // Get abordagens for the relevant source
      let abordagens: { mentorado_id: string; marked_at: string }[]
      try {
        abordagens = await fetchAll((from, to) =>
          supabase
            .from('sos_abordagens')
            .select('mentorado_id, marked_at')
            .eq('source', bellSource)
            .order('id')
            .range(from, to)
        )
      } catch {
        // Falha de rede — mantém a contagem anterior até o próximo poll
        return
      }

      let bellCount = 0
      for (const id of sosCsIds) {
        const contacts = abordagens
          .filter((a) => a.mentorado_id === id)
          .map((a) => new Date(a.marked_at).getTime())
        const lastContact = contacts.length > 0 ? Math.max(...contacts) : 0
        if (lastContact === 0 || now - lastContact >= threshold) {
          bellCount++
        }
      }
      setCount(bellCount)
    }

    fetchBells()
    const interval = setInterval(fetchBells, 30000)
    return () => clearInterval(interval)
  }, [role])

  return count
}

function useUnreadToques(role: UserRole, turma: string | null) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Admin sends the toques, no notifications for them
    if (role === 'admin') return

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all toques
      const { data: toques } = await supabase
        .from('toques')
        .select('id, mentorado_id')

      if (!toques || toques.length === 0) return

      // Filter by turma for mentors
      let filteredToques = toques
      if (role === 'mentor' && turma) {
        const { data: mentorados } = await supabase
          .from('mentorados')
          .select('id, turma')
        const turmaIds = new Set(
          (mentorados || []).filter((m) => m.turma === turma).map((m) => m.id)
        )
        filteredToques = toques.filter((t) => turmaIds.has(t.mentorado_id))
      }

      if (filteredToques.length === 0) return

      // Get reads for this user
      const { data: reads } = await supabase
        .from('toque_reads')
        .select('toque_id')
        .eq('user_id', user.id)

      const readIds = new Set((reads || []).map((r) => r.toque_id))
      const unread = filteredToques.filter((t) => !readIds.has(t.id)).length
      setCount(unread)
    }

    fetch()
    // Refresh every 30 seconds
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [role, turma])

  return count
}

export default function Sidebar() {
  const pathname = usePathname()
  const { role, email, name, turma, loading } = useUserRole()
  const [open, setOpen] = useState(false)
  const unreadToques = useUnreadToques(role, turma)
  const sosCsBells = useSosCsBells(role)

  const navItems = allNavItems.filter((item) => item.roles.includes(role))
  const totalSidebarBadge = unreadToques + sosCsBells
  const userName = name || email

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white border border-gray-200 rounded-xl p-2 shadow-sm"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        {totalSidebarBadge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalSidebarBadge}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Close button mobile */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-600 text-xl"
        >
          &times;
        </button>

        {/* Logo */}
        <div className="p-6">
          <div className="rounded-2xl p-4 flex items-center justify-center">
            <img src="/logo-apruma.png" alt="Apruma" className="h-12 object-contain" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const toqueBadge = item.href === '/toque-do-rafa' && unreadToques > 0 ? unreadToques : 0
            const csBadge = item.href === '/sos-cs' && sosCsBells > 0 ? sosCsBells : 0
            const badgeCount = toqueBadge || csBadge
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {badgeCount > 0 && (
                  <span className={`ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${'bg-red-500'}`}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {!loading && userName && (
            <div className="px-4 py-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Logado como</p>
              <p className="text-sm font-medium text-gray-700 truncate">{userName}</p>
              <p className="text-xs text-brand-600 capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            🚪 Sair
          </button>
        </div>
      </aside>
    </>
  )
}
