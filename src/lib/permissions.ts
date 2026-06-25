import type { UserRole } from './useUserRole'

// Capacidades que podem ser concedidas individualmente a um usuário (override por
// usuário, somado ao papel). Os grants individuais ficam em user_roles.extra_caps.
export type Capability = 'reativar'

// Quem já tem a capacidade pelo PAPEL (default), sem precisar de grant individual.
const capByRole: Record<Capability, UserRole[]> = {
  reativar: ['admin'],
}

// true se o papel já concede a capacidade OU se o usuário tem o grant individual.
export function pode(cap: Capability, role: UserRole, extraCaps: string[] = []): boolean {
  return capByRole[cap].includes(role) || extraCaps.includes(cap)
}
