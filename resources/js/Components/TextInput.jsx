import { forwardRef, useEffect, useRef } from 'react';

export default forwardRef(function TextInput(
  { type = 'text', className = '', isFocused = false, ...props },
  ref
) {
  const localRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      (ref?.current ?? localRef.current)?.focus();
    }
  }, [isFocused, ref]);

  return (
    <input
      {...props}
      type={type}
      ref={ref ?? localRef}
      className={[
        // base
        'rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition',
        // light
        'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',
        'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30',
        // dark
        'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
        'dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30',
        className,
      ].join(' ')}
    />
  );
});
