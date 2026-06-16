import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Mentorado = {
  id: string
  nome: string
  instagram: string
  nicho: string
  turma: string
  plano: number
  data_inicio: string
  seguidores_inicial: number
  seguidores_atual: number
  posts: number
  avatar: string | null
  status: string
  status_at: string | null
  created_at: string
  updated_at: string
  ig_issue: string | null
  ig_issue_since: string | null
}
