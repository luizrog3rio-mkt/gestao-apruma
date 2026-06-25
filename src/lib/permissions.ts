import type { UserRole } from './useUserRole'

// Capacidades que podem ser concedidas individualmente a um usuário (override por
// usuário, somado ao papel). Os grants individuais ficam em user_roles.extra_caps.
export type Capability = 'reativar' | 'editar_seguidores' | 'gravar_toque' | 'marcar_abordagem_rafa'

// Quem já tem a capacidade pelo PAPEL (default), sem precisar de grant individual.
const capByRole: Record<Capability, UserRole[]> = {
  reativar: ['admin'],
  editar_seguidores: ['admin'],
  gravar_toque: ['admin'],
  marcar_abordagem_rafa: ['admin'],
}

// Catálogo das capacidades concedíveis pela tela /usuarios (com rótulo amigável).
export const CAPABILITIES: { id: Capability; label: string; descricao: string }[] = [
  { id: 'reativar', label: 'Reativar mentorado', descricao: 'Voltar um mentorado para o status Ativo.' },
  { id: 'editar_seguidores', label: 'Editar seguidores', descricao: 'Editar manualmente o nº de seguidores atuais.' },
  { id: 'gravar_toque', label: 'Gravar toque (áudio)', descricao: 'Gravar e enviar toques em áudio no SOS Mentores.' },
  { id: 'marcar_abordagem_rafa', label: 'Marcar "Abordagem Rafa"', descricao: 'Marcar as caixinhas da trilha Rafa no SOS CS.' },
]

const CAPABILITY_IDS: string[] = CAPABILITIES.map((c) => c.id)

export function isCapability(value: string): value is Capability {
  return CAPABILITY_IDS.includes(value)
}

// true se o papel já concede a capacidade OU se o usuário tem o grant individual.
export function pode(cap: Capability, role: UserRole, extraCaps: string[] = []): boolean {
  return capByRole[cap].includes(role) || extraCaps.includes(cap)
}
