import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo } from 'react';

export default function Index({ accounts }) {
  const grouped = useMemo(() => {
    const map = new Map();

    (accounts || []).forEach((a) => {
      const key = String(a.type || 'other').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });

    const entries = Array.from(map.entries())
      .map(([type, items]) => [
        type,
        [...items].sort((x, y) => String(x.name).localeCompare(String(y.name), 'pt-BR')),
      ])
      .sort((a, b) => orderTipo(a[0]) - orderTipo(b[0]));

    return entries;
  }, [accounts]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">Carteiras</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Gerencie suas contas bancárias, cartões e investimentos
            </p>
          </div>

          <Link
            href={route('accounts.create')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Nova conta</span>
          </Link>
        </div>
      }
    >
      <Head title="Carteiras" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          {(accounts?.length ?? 0) === 0 ? (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                Nenhuma conta cadastrada.
                <div className="mt-2">
                  <Link
                    href={route('accounts.create')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    Criar a primeira conta
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            grouped.map(([type, items]) => (
              <div
                key={type}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                {/* Header do grupo */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                      {labelGroup(type)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{items.length} conta(s)</span>
                  </div>
                </div>

                {/* Mobile: cards */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
                  {items.map((a) => {
                    const isCard = String(a.type || '').toLowerCase() === 'credit_card';

                    return (
                      <div key={a.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">
                              {a.name}
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                                {labelType(a.type)}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Link
                              href={route('accounts.edit', a.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-200 dark:hover:bg-emerald-900/35"
                              title="Editar conta"
                              aria-label={`Editar ${a.name}`}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Link>

                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-200 dark:hover:bg-rose-900/35"
                              onClick={() =>
                                confirm('Excluir esta conta?') && router.delete(route('accounts.destroy', a.id))
                              }
                              title="Excluir conta"
                              aria-label={`Excluir ${a.name}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {isCard ? (
                            <>
                              <InfoMiniCard label="Fechamento" value={formatDayLabel(a.statement_close_day)} />
                              <InfoMiniCard label="Vencimento" value={formatDayLabel(a.due_day)} />
                              {a.credit_limit !== undefined && a.credit_limit !== null && (
                                <div className="col-span-2">
                                  <InfoMiniCard label="Limite" value={formatBRL(Number(a.credit_limit || 0))} />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="col-span-2">
                              <InfoMiniCard label="Saldo inicial" value={formatBRL(Number(a.initial_balance || 0))} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: tabela */}
                <div className="hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nome</th>
                        <th className="px-4 py-3 font-semibold">Tipo</th>

                        {String(type).toLowerCase() === 'credit_card' ? (
                          <>
                            <th className="px-4 py-3 font-semibold">Fechamento</th>
                            <th className="px-4 py-3 font-semibold">Vencimento</th>
                            <th className="px-4 py-3 font-semibold">Limite</th>
                          </>
                        ) : (
                          <th className="px-4 py-3 font-semibold">Saldo inicial</th>
                        )}

                        <th className="px-4 py-3 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {items.map((a) => {
                        const isCard = String(a.type || '').toLowerCase() === 'credit_card';

                        return (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900 dark:text-slate-100">{a.name}</div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                                {labelType(a.type)}
                              </span>
                            </td>

                            {isCard ? (
                              <>
                                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                                  {formatDayLabel(a.statement_close_day)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                                  {formatDayLabel(a.due_day)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                                  {a.credit_limit !== undefined && a.credit_limit !== null
                                    ? formatBRL(Number(a.credit_limit || 0))
                                    : '—'}
                                </td>
                              </>
                            ) : (
                              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                                {formatBRL(Number(a.initial_balance || 0))}
                              </td>
                            )}

                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <Link
                                  href={route('accounts.edit', a.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-200 dark:hover:bg-emerald-900/35"
                                  title="Editar conta"
                                  aria-label={`Editar ${a.name}`}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </Link>

                                <button
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-200 dark:hover:bg-rose-900/35"
                                  onClick={() =>
                                    confirm('Excluir esta conta?') && router.delete(route('accounts.destroy', a.id))
                                  }
                                  title="Excluir conta"
                                  aria-label={`Excluir ${a.name}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Dica: em cartão de crédito, configure <b>Fechamento</b> e <b>Vencimento</b> para o parcelamento cair no mês certo.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function InfoMiniCard({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function labelType(v) {
  if (v === 'cash') return 'Dinheiro';
  if (v === 'bank') return 'Banco';
  if (v === 'debit') return 'Débito';
  if (v === 'credit_card') return 'Cartão';
  if (v === 'investment') return 'Investimento';
  return 'Outro';
}

function labelGroup(v) {
  const t = String(v || '').toLowerCase();
  if (t === 'bank') return 'Bancos';
  if (t === 'credit_card') return 'Cartões';
  if (t === 'cash') return 'Dinheiro';
  if (t === 'debit') return 'Débito';
  if (t === 'investment') return 'Investimentos';
  return 'Outros';
}

function orderTipo(t) {
  const v = String(t || '').toLowerCase();
  if (v === 'bank') return 1;
  if (v === 'credit_card') return 2;
  if (v === 'debit') return 3;
  if (v === 'cash') return 4;
  if (v === 'investment') return 5;
  return 99;
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDayLabel(v) {
  const n = Number(v);
  if (!n || Number.isNaN(n)) return '—';
  return `Dia ${n}`;
}

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-4-4L4.5 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 7l1 12h10l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}