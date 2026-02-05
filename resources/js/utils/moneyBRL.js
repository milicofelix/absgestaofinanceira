// resources/js/utils/moneyBRL.js

// "123456" -> "1234.56"
export function digitsToNormalizedNumber(digits) {
  const only = String(digits || '').replace(/\D/g, '');
  if (!only) return '';
  const cents = parseInt(only, 10);
  const value = cents / 100;
  return value.toFixed(2);
}

// "1234.56" -> "1.234,56"
export function formatBRLFromNormalized(normalized) {
  const n = Number(normalized || 0);
  if (!isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "1.234,56" / "1234,56" / "1234.56" / "123456" -> "1234.56"
export function brlToNormalizedNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';

  // colou apenas dígitos? trata como centavos automáticos
  if (/^\d+$/.test(s)) {
    return digitsToNormalizedNumber(s);
  }

  // mantém dígitos, . , e -
  let cleaned = s.replace(/[^\d.,-]/g, '').replace(/(?!^)-/g, '');
  if (!cleaned) return '';

  // se tem vírgula, assume BR
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  // se tem mais de um ponto, mantém só o último como decimal
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    const dec = parts.pop();
    cleaned = parts.join('') + '.' + dec;
  }

  const n = Number(cleaned);
  if (!isFinite(n)) return '';

  return n.toFixed(2);
}

export function formatBRLFromNumberLike(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const normalized = brlToNormalizedNumber(s);
  if (!normalized) return '';
  return formatBRLFromNormalized(normalized);
}
