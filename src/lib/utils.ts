export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toString()
}

export function calcGrowth(atual: number, inicial: number): number {
  if (inicial === 0) return 0
  return ((atual - inicial) / inicial) * 100
}

// referencia permite "congelar" o cálculo em um momento passado (ex: quando
// pausado, usar status_at em vez de agora, já que o tempo parado não corre).
export function calcTempoRestante(dataInicio: string, planoMeses: number, referencia?: string | Date): string {
  const inicio = new Date(dataInicio)
  const fim = new Date(inicio)
  fim.setMonth(fim.getMonth() + planoMeses)
  const agora = referencia ? new Date(referencia) : new Date()
  const diffMs = fim.getTime() - agora.getTime()
  if (diffMs <= 0) return 'Encerrado'
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (dias <= 30) {
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  }
  const meses = Math.floor(dias / 30)
  const restoDias = dias % 30
  const mesesTxt = `${meses} ${meses === 1 ? 'mês' : 'meses'}`
  if (restoDias === 0) return mesesTxt
  return `${mesesTxt} e ${restoDias} ${restoDias === 1 ? 'dia' : 'dias'}`
}
