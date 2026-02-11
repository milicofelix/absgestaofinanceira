// resources/js/Pages/Recurrings/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function formatDateBR(input) {
  if (!input) return '—';
  const s = String(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

function freqLabel(freq, interval) {
  const n = Number(interval || 1);
  if (freq === 'yearly') return n === 1 ? 'Anual' : `A cada ${n} anos`;
  return n === 1 ? 'Mensal' : `A cada ${n} meses`;
}

export default function Index({ recurrings }) {
  const rows = recurrings?.data || [];

  const go = (url) => {
    if (!url) return;
    router.get(url, {}, { preserveState: true, replace: true });
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
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
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            {rows.length ? (
              <>
                <div className="overflow-x-auto">
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
                              Auto: {r.auto_post ? 'sim' : 'não'} · Intervalo: {r.interval || 1}
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
                                onClick={() => {
                                  if (!confirm('Excluir esta recorrência?')) return;
                                  router.delete(route('recurrings.destroy', r.id));
                                }}
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

                {/* paginação */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    Página {recurrings.current_page} de {recurrings.last_page} · Total {recurrings.total}
                  </div>

                  <div className="flex items-center gap-2">
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
