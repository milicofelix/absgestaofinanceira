import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

export default function FlashToast() {
  const { flash = {} } = usePage().props;

  const current = useMemo(() => {
    if (flash.error) return { type: 'error', message: flash.error };
    if (flash.success) return { type: 'success', message: flash.success };
    if (flash.warning) return { type: 'warning', message: flash.warning };
    if (flash.info) return { type: 'info', message: flash.info };
    return null;
  }, [flash]);

  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!current?.message) {
      setVisible(false);
      return;
    }

    setToast(current);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, [current]);

  if (!toast?.message) return null;

  const tones = {
    success: {
      wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-100',
      icon: 'text-emerald-600 dark:text-emerald-300',
      progress: 'bg-emerald-500',
      title: 'Sucesso',
    },
    error: {
      wrap: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-100',
      icon: 'text-rose-600 dark:text-rose-300',
      progress: 'bg-rose-500',
      title: 'Erro',
    },
    warning: {
      wrap: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/25 dark:text-amber-100',
      icon: 'text-amber-600 dark:text-amber-300',
      progress: 'bg-amber-500',
      title: 'Atenção',
    },
    info: {
      wrap: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-900/25 dark:text-sky-100',
      icon: 'text-sky-600 dark:text-sky-300',
      progress: 'bg-sky-500',
      title: 'Informação',
    },
  };

  const tone = tones[toast.type] || tones.info;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md justify-end sm:right-6 sm:top-6">
      <div
        className={[
          'pointer-events-auto w-full overflow-hidden rounded-2xl border shadow-lg backdrop-blur',
          'transition-all duration-300',
          visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
          tone.wrap,
        ].join(' ')}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 p-4">
          <div className={['mt-0.5 shrink-0', tone.icon].join(' ')}>
            <ToastIcon type={toast.type} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{tone.title}</div>
            <div className="mt-1 text-sm leading-5 opacity-95">
              {toast.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Fechar aviso"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className={['h-1 animate-[toast-shrink_4.5s_linear_forwards]', tone.progress].join(' ')}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

function ToastIcon({ type }) {
  if (type === 'success') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M16.667 5 7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'error') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8.574 3.216 1.516 15.5A1 1 0 0 0 2.382 17h15.236a1 1 0 0 0 .866-1.5L11.426 3.216a1 1 0 0 0-1.732 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'warning') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8.574 3.216 1.516 15.5A1 1 0 0 0 2.382 17h15.236a1 1 0 0 0 .866-1.5L11.426 3.216a1 1 0 0 0-1.732 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 6h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}