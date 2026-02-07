// resources/js/utils/formatters.js

/**
 * Converte datas para dd/mm/aaaa (pt-BR).
 * Aceita:
 *  - "YYYY-MM-DD"
 *  - ISO string (ex: "2026-02-07T00:00:00.000Z")
 *  - Date
 *  - number (timestamp)
 */
export function formatDateBR(input) {
  if (!input) return '—';

  // Se já está em dd/mm/aaaa, mantém
  const s = String(input);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  // Caso mais comum: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  // Tenta parsear ISO / Date / timestamp
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return s; // não quebra: devolve como veio

  return new Intl.DateTimeFormat('pt-BR').format(dt);
}
