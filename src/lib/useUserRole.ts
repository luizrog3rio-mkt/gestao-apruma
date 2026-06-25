'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'gerente' | 'mentor'

type UserRoleData = {
  role: UserRole
  turma: string | null
  loading: boolean
  email: string
  name: string
  caps: string[]
}

export function useUserRole(): UserRoleData {
  const [data, setData] = useState<UserRoleData>({
    role: 'mentor',
    turma: null,
    loading: true,
    email: '',
    name: '',
    caps: [],
  })

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setData((prev) => ({ ...prev, loading: false }))
        return
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, turma, extra_caps')
        .eq('user_id', user.id)
        .single()

      setData({
        role: (roleData?.role as UserRole) || 'mentor',
        turma: roleData?.turma || null,
        loading: false,
        email: user.email || '',
        name: user.user_metadata?.display_name || '',
        caps: (roleData?.extra_caps as string[] | null) || [],
      })
    }

    fetch()
  }, [])

  return data
}
