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

  const s = String(input);

  // Se já está em dd/mm/aaaa, mantém
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  // Caso mais comum: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  // ✅ ISO com horário (ex: 2025-12-15T00:00:00.000000Z)
  // Para exibir a "data civil" correta, extraímos só o YYYY-MM-DD
  const isoDateOnly = s.match(/^(\d{4}-\d{2}-\d{2})[T ]/);
  if (isoDateOnly) {
    const [y, m, d] = isoDateOnly[1].split('-');
    return `${d}/${m}/${y}`;
  }

  // Tenta parsear ISO / Date / timestamp
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return s;

  return new Intl.DateTimeFormat('pt-BR').format(dt);
}
