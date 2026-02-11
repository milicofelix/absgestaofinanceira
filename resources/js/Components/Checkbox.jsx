export default function Checkbox({ className = '', ...props }) {
  return (
    <input
      {...props}
      type="checkbox"
      className={[
        // base
        'h-5 w-5 rounded border shadow-sm',
        'text-emerald-600 focus:ring-emerald-500',

        // light
        'border-gray-300 bg-white',

        // dark
        'dark:border-slate-700 dark:bg-slate-950',
        'dark:focus:ring-emerald-500',

        // disabled
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'dark:disabled:bg-slate-900',

        className,
      ].join(' ')}
    />
  );
}
