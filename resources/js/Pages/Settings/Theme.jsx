import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

export default function Theme({ currentTheme }) {
  const sharedTheme = usePage().props?.settings?.theme ?? null;

  const { data, setData, put, processing } = useForm({
    theme: currentTheme ?? sharedTheme ?? null, // null | 'light' | 'dark'
  });

  function submit(e) {
    e.preventDefault();
    put(route('settings.theme.update'), { preserveScroll: true });
  }

  const selected = data.theme ?? null;

  const Option = ({ value, title, desc }) => {
    const active = selected === value;

    return (
      <button
        type="button"
        onClick={() => setData('theme', value)}
        className={[
          'w-full rounded-2xl border p-4 text-left transition-colors',
          active
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{desc}</div>
          </div>

          {active && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
              Selecionado
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Tema</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Escolha a aparência do sistema</p>
        </div>
      }
    >
      <Head title="Tema" />

      <div className="py-8">
        <div className="mx-auto max-w-2xl space-y-5 px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            <Option
              value={null}
              title="Padrão (do sistema)"
              desc="Segue o padrão do projeto (sem forçar claro/escuro)."
            />
            <Option value="light" title="Claro" desc="Força modo claro." />
            <Option value="dark" title="Escuro" desc="Força modo escuro." />

            <div className="pt-2">
              <button
                disabled={processing}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </form>

          <div className="text-xs text-gray-500 dark:text-slate-400">
            Dica: o modo escuro depende das classes{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              dark:
            </code>{' '}
            no Tailwind.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
