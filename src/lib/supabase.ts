import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// O PostgREST corta qualquer resposta em 1000 linhas (max-rows). Pra tabelas que
// passam disso, busca tudo em lotes via .range(). A query precisa ter .order()
// estável pra paginação não pular/duplicar linhas. Lança o erro em caso de falha —
// o caller decide o que fazer (em geral, manter o estado anterior na tela);
// devolver dados parciais aqui reintroduziria o bug de marcações sumindo.
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []
  // Avança pelo tamanho recebido e só para no lote vazio: correto mesmo se o
  // max-rows do projeto for reduzido abaixo do pageSize pedido.
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw error
    const batch = data || []
    if (batch.length === 0) break
    rows.push(...batch)
    from += batch.length
  }
  return rows
}

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
