// Datas de lançamentos são "dia do calendário" (coluna DATE no banco, meia-noite UTC).
// Convertê-las para o fuso do navegador mostraria o dia anterior no Brasil (UTC-3),
// então sempre formatamos em UTC.
export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...options });
}

/** Hoje no calendário do usuário, como AAAA-MM-DD (toISOString() usaria UTC e viraria o dia depois das 21h). */
export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
