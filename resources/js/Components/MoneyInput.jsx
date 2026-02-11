import { useEffect, useState } from 'react';
import {
  brlToNormalizedNumber,
  formatBRLFromNormalized,
  formatBRLFromNumberLike,
} from '@/utils/moneyBRL';

export default function MoneyInput({
  value,                 // normalizado: "1234.56"
  onValueChange,         // (normalized) => void
  prefix = 'R$',
  placeholder = '0,00',
  disabled = false,
  className = '',
  inputClassName = '',
  inputMode = 'numeric',
  id,
  name,
}) {
  const [display, setDisplay] = useState(() => formatBRLFromNumberLike(value));

  // sincroniza caso o valor venha do servidor, reset do form, etc.
  useEffect(() => {
    setDisplay(formatBRLFromNumberLike(value));
  }, [value]);

  function handleChange(e) {
    const raw = e.target.value;

    // modo "banco": usa só dígitos como centavos automáticos
    const onlyDigits = String(raw || '').replace(/\D/g, '');

    if (!onlyDigits) {
      setDisplay('');
      onValueChange?.('');
      return;
    }

    const normalized = brlToNormalizedNumber(onlyDigits); // já trata como centavos
    setDisplay(formatBRLFromNormalized(normalized));
    onValueChange?.(normalized);
  }

  return (
    <div className={['relative', className].join(' ')}>
      {prefix ? (
        <span
          className={[
            'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold',
            'text-gray-400 dark:text-slate-400',
          ].join(' ')}
        >
          {prefix}
        </span>
      ) : null}

      <input
        id={id}
        name={name}
        disabled={disabled}
        inputMode={inputMode}
        className={[
          // base
          'w-full rounded-lg border px-3 py-2 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500',
          prefix ? 'pl-10' : 'pl-3',

          // ✅ light
          'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',

          // ✅ dark
          'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
          'dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30',

          // disabled
          'disabled:opacity-70 disabled:cursor-not-allowed',
          'disabled:bg-gray-50 dark:disabled:bg-slate-900',

          inputClassName,
        ].join(' ')}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
      />
    </div>
  );
}
