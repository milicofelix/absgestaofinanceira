// resources/js/Pages/Investments/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateBR } from '@/utils/formatters';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function Index({ accounts = [], filters = {}, totals = {} }) {
  const [month, setMonth] = useState(filters.month || new Date().toISOString().slice(0, 7));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryParams = useMemo(() => ({ month }), [month]);

  function applyFilters() {
    router.get(route('investments.index'), queryParams, { preserveState: true, replace: true });
  }

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Investimentos</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Acompanhe saldo atual e a simulação de rendimento por conta
            </p>
          </div>

          <Link
            href={route('accounts.index')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            title="Gerenciar contas"
          >
            Gerenciar contas
          </Link>
        </div>
      }
    >
      <Head title="Investimentos" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Resumo topo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              title="Saldo total (atual)"
              value={formatBRL(totals.total_current_balance || 0)}
              icon={<IconBank />}
            />
            <SummaryCard
              title="Simulação no mês"
              value={formatBRL(totals.total_month_yield || 0)}
              icon={<IconTrend />}
            />

            <SummaryCard
              title="Contas de investimento"
              value={String(accounts.length)}
              icon={<IconCoins />}
            />
          </div>

          {/* Filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Filtros</div>

              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50
                           dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <div className={`${filtersOpen ? 'block' : 'hidden'} mt-4 sm:block`}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-8 sm:items-end">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Mês (para “rendimento do mês”)
                  </label>
                  <input
                    type="month"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500
                               dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={month}
                    onChange={(e) => setMonth(normalizeMonth(e.target.value))}
                  />
                </div>

                <div className="sm:col-span-6 flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="w-full sm:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Atualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE: cards */}
          <div className="space-y-2 sm:hidden">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        <IconBank />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 dark:text-slate-100">{a.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                          <span className="font-semibold">{a.yield_mode_label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MiniStat label="Saldo atual" value={formatBRL(a.current_balance || 0)} />
                      <MiniStat label="Simulação no mês" value={formatBRL(a.simulated_month_yield || 0)} />
                    </div>

                    <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                      Última simulação: <span className="font-semibold">{formatDateBR(a.last_yield_date) || '—'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <Link
                      href={route('investments.show', a.id)}
                      className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black
                                 dark:bg-slate-800 dark:hover:bg-slate-700"
                      title="Ver detalhes"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
                Nenhuma conta de investimento encontrada.
              </div>
            )}
          </div>

          {/* DESKTOP: tabela */}
          <div className="hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Conta</th>
                    <th className="px-4 py-3 font-semibold">CDI</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Último rendimento</th>
                    <th className="px-4 py-3 text-right font-semibold">Saldo atual</th>
                    <th className="px-4 py-3 text-right font-semibold">Simulação mês</th>
                    <th
                      className="px-4 py-3 text-right font-semibold sticky right-0 z-10 bg-gray-50 dark:bg-slate-950
                                 shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]"
                    >
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-slate-100 font-semibold">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
                            <IconBank />
                          </span>
                          <span className="min-w-0 truncate">{a.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-slate-200">
                        {a.yield_mode_label}
                      </td>


                      <td className="px-4 py-3">
                        {a.yield_enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-200 dark:ring-emerald-900/40">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{formatDateBR(a.last_yield_date) || '—'}</td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">
                        {formatBRL(a.current_balance || 0)}
                      </td>

                      {/* <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatBRL(a.month_yield || 0)}
                      </td> */}
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-200">
                        {formatBRL(a.simulated_month_yield || 0)}
                      </td>

                      <td
                        className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-slate-900
                                   shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]"
                      >
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Link
                            href={route('investments.show', a.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black
                                       dark:bg-slate-800 dark:hover:bg-slate-700"
                            title="Ver detalhes"
                          >
                            <IconEye />
                            <span className="hidden md:inline">Detalhes</span>
                          </Link>

                          <Link
                            href={route('accounts.edit', a.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50
                                       dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="Editar conta"
                          >
                            <IconEdit />
                            <span className="hidden md:inline">Editar</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {accounts.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-gray-500 dark:text-slate-400" colSpan={7}>
                        Nenhuma conta de investimento encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observação */}
          <div className="text-xs text-gray-500 dark:text-slate-400">
            * “Saldo atual” considera saldo inicial + transações (incluindo rendimentos).
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ---------- UI ---------- */

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{title}</div>
          <div className="mt-1 text-lg font-bold text-gray-900 dark:text-slate-100">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function normalizeMonth(v) {
  if (!v) return new Date().toISOString().slice(0, 7);
  return String(v).slice(0, 7);
}

/* ---------- icons (inline SVG) ---------- */

function IconBase({ children, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconBank({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M3 10h18M5 10V8l7-4 7 4v2M6 10v9m4-9v9m4-9v9m4-9v9M4 19h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

function IconTrend({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M4 16l6-6 4 4 6-6M16 8h4v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function IconCoins({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M12 6c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M5 9v6c0 1.7 3 3 7 3s7-1.3 7-3V9" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

function IconEye({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

function IconEdit({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M4 20h4l10-10a2.2 2.2 0 0 0 0-3.1l-.9-.9a2.2 2.2 0 0 0-3.1 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}