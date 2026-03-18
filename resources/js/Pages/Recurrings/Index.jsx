// resources/js/Pages/Recurrings/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function formatDateBR(input) {
  if (!input) return '—';
  const s = String(input);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function freqLabel(freq, interval) {
  const n = Number(interval || 1);
  if (freq === 'yearly') return n === 1 ? 'Anual' : `A cada ${n} anos`;
  return n === 1 ? 'Mensal' : `A cada ${n} meses`;
}

function destroyRecurring(id) {
  if (!confirm('Excluir esta recorrência?')) return;
  router.delete(route('recurrings.destroy', id));
}

function go(url) {
  if (!url) return;
  router.get(url, {}, { preserveState: true, replace: true });
}

function InfoPill({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200',
  };

  return (
    <div
      className={[
        'rounded-xl px-3 py-2.5',
        'min-h-[68px]',
        'flex flex-col items-center justify-center text-center',
        tones[tone] || tones.gray,
      ].join(' ')}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold leading-tight">
        {value}
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const cls =
    type === 'expense'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200';

  return (
    <span className={['inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold', cls].join(' ')}>
      {type === 'expense' ? 'Despesa' : 'Receita'}
    </span>
  );
}

function StatusBadge({ active }) {
  const cls = active
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200'
    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <span className={['inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold', cls].join(' ')}>
      {active ? 'Ativa' : 'Pausada'}
    </span>
  );
}

function FrequencyBadge({ frequency, interval }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/25 dark:text-amber-200">
      {freqLabel(frequency, interval)}
    </span>
  );
}

function MobileRecurringCard({ recurring }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">
            {recurring.description || '(sem descrição)'}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={recurring.type} />
            <StatusBadge active={recurring.is_active} />
            <FrequencyBadge frequency={recurring.frequency} interval={recurring.interval} />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={[
              'text-base font-bold',
              recurring.type === 'expense'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-emerald-700 dark:text-emerald-300',
            ].join(' ')}
          >
            {formatBRL(recurring.amount)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoPill label="Conta" value={recurring.account?.name || '—'} tone="gray" />
        <InfoPill label="Categoria" value={recurring.category?.name || '—'} tone="gray" />
        <InfoPill label="Próximo" value={formatDateBR(recurring.next_run_date)} tone="sky" />
        <InfoPill label="Intervalo" value={freqLabel(recurring.frequency, recurring.interval)} tone="amber" />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Link
          href={route('recurrings.edit', recurring.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Editar"
        >
          <IconEdit />
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
          title="Excluir"
          onClick={() => destroyRecurring(recurring.id)}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

function IconBase({ children, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconEdit({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconTrash({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M6 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 7l1 14h6l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </IconBase>
  );
}

export default function Index({ recurrings }) {
  const rows = recurrings?.data || [];

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">Recorrências</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Lançamentos automáticos (mensal/anual)</p>
          </div>

          <Link
            href={route('recurrings.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
          >
            + Nova recorrência
          </Link>
        </div>
      }
    >
      <Head title="Recorrências" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
            {rows.length ? (
              <>
                <div className="space-y-3 sm:hidden">
                  {rows.map((r) => (
                    <MobileRecurringCard key={r.id} recurring={r} />
                  ))}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                      <tr className="border-b border-gray-100 dark:border-slate-800">
                        <th className="py-3 pr-4">Descrição</th>
                        <th className="py-3 pr-4">Tipo</th>
                        <th className="py-3 pr-4">Conta</th>
                        <th className="py-3 pr-4">Categoria</th>
                        <th className="py-3 pr-4">Valor</th>
                        <th className="py-3 pr-4">Frequência</th>
                        <th className="py-3 pr-4">Próximo</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 text-right">Ações</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {rows.map((r) => (
                        <tr key={r.id} className="align-middle hover:bg-gray-50 dark:hover:bg-slate-800/60">
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-gray-900 dark:text-slate-100">
                              {r.description || '(sem descrição)'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              {r.frequency === 'monthly'
                                ? `Repete a cada ${r.interval || 1} ${Number(r.interval || 1) === 1 ? 'mês' : 'meses'}`
                                : `Repete a cada ${r.interval || 1} ${Number(r.interval || 1) === 1 ? 'ano' : 'anos'}`}
                            </div>
                          </td>

                          <td className="py-4 pr-4">
                            {r.type === 'expense' ? (
                              <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-1 dark:ring-rose-900/40">
                                Despesa
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-900/40">
                                Receita
                              </span>
                            )}
                          </td>

                          <td className="py-4 pr-4 text-gray-700 dark:text-slate-200">{r.account?.name || '—'}</td>
                          <td className="py-4 pr-4 text-gray-700 dark:text-slate-200">{r.category?.name || '—'}</td>

                          <td className="py-4 pr-4 font-semibold text-gray-900 dark:text-slate-100">
                            {formatBRL(r.amount)}
                          </td>

                          <td className="py-4 pr-4">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-1 dark:ring-slate-700">
                              {freqLabel(r.frequency, r.interval)}
                            </span>
                          </td>

                          <td className="py-4 pr-4 text-gray-700 dark:text-slate-200">{formatDateBR(r.next_run_date)}</td>

                          <td className="py-4 pr-4">
                            {r.is_active ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-900/40">
                                Ativa
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-1 dark:ring-slate-700">
                                Pausada
                              </span>
                            )}
                          </td>

                          <td className="py-4 text-right">
                            <div className="inline-flex items-center gap-3">
                              <Link
                                href={route('recurrings.edit', r.id)}
                                className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                              >
                                Editar
                              </Link>

                              <button
                                type="button"
                                className="text-sm font-semibold text-rose-600 hover:underline dark:text-rose-400"
                                onClick={() => destroyRecurring(r.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    Página {recurrings.current_page} de {recurrings.last_page} · Total {recurrings.total}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => go(recurrings.prev_page_url)}
                      disabled={!recurrings.prev_page_url}
                      className={[
                        'rounded-lg border px-3 py-2 text-sm font-semibold',
                        'border-gray-200 bg-white text-gray-700',
                        'hover:bg-gray-50',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900',
                      ].join(' ')}
                    >
                      ← Anterior
                    </button>

                    <button
                      type="button"
                      onClick={() => go(recurrings.next_page_url)}
                      disabled={!recurrings.next_page_url}
                      className={[
                        'rounded-lg border px-3 py-2 text-sm font-semibold',
                        'border-gray-200 bg-white text-gray-700',
                        'hover:bg-gray-50',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900',
                      ].join(' ')}
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <div>Você ainda não criou nenhuma recorrência.</div>
                <Link
                  href={route('recurrings.create')}
                  className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Criar primeira recorrência
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}