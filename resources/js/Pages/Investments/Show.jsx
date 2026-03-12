// resources/js/Pages/Investments/Show.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { formatDateBR } from '@/utils/formatters';

export default function Show({ account, filters = {}, summary = {}, series = [], events = [] }) {
  const [from, setFrom] = useState(filters.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(filters.to || new Date().toISOString().slice(0, 10));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to],
  );

  function applyFilters() {
    router.get(route('investments.show', account.id), queryParams, { preserveState: true, replace: true });
  }

  // Não aplico automático ao digitar datas (pra não ficar “pulando”)
  // useEffect(() => { applyFilters(); }, [from, to]);

  const yieldEvents = useMemo(() => (events || []).filter((e) => e.is_yield), [events]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={route('investments.index')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50
                           dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Voltar"
              >
                ←
              </Link>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-slate-100">{account.name}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-semibold">{account.yield_mode_label}</span> •
                Última simulação: <span className="font-semibold">{formatDateBR(account.last_yield_date) || '—'}</span>
              </p>
              </div>
            </div>
          </div>

          <Link
            href={route('accounts.edit', account.id)}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            title="Editar conta"
          >
            Editar conta
          </Link>
        </div>
      }
    >
      <Head title={`Investimento • ${account.name}`} />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Cards resumo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <SummaryCard title="Saldo atual" value={formatBRL(summary.current_balance || 0)} icon={<IconBank />} />
            <SummaryCard title="Simulação no período" value={formatBRL(summary.simulated_yield || 0)} icon={<IconTrend />} />
            <SummaryCard title="Entradas no período" value={formatBRL(summary.income || 0)} icon={<IconPlus />} />
            <SummaryCard title="Saídas no período" value={formatBRL(summary.expense || 0)} icon={<IconMinus />} />
          </div>

          {/* Filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Período</div>

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
                    De
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500
                               dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Até
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500
                               dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-4 flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="w-full sm:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Filtrar
                  </button>

                  <Link
                    href={route('transactions.index', {
                      month: String(from || '').slice(0, 7),
                      account_id: account.id,
                      q: 'Rendimento CDI',
                    })}
                    className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50
                               dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Abrir lançamentos filtrando rendimentos"
                  >
                    Ver em Lançamentos
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico (placeholder elegante por enquanto) */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Evolução do saldo</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Série diária (saldo ao fim do dia). Próximo passo: gráfico (Recharts).
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Pontos: <span className="font-semibold">{series?.length || 0}</span>
              </div>
            </div>

            <div className="mt-4">
              {/* Mini “sparkline” textual (sem libs). Depois trocamos por Recharts */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                {takeLast(series, 6).map((p) => (
                  <div
                    key={p.date}
                    className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {formatDateBR(p.date)}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-slate-100">
                      {formatBRL(p.balance)}
                    </div>
                  </div>
                ))}

                {!series?.length && (
                  <div className="col-span-full rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800">
                    Sem dados de série para o período.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Eventos: rendimentos + demais movimentos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Rendimentos (resumo rápido) */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Simulações de rendimento (período)</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Qtde: <span className="font-semibold">{yieldEvents.length}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {yieldEvents.slice(0, 10).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-700 dark:text-slate-200">{formatDateBR(e.date)}</div>
                      <div className="truncate text-xs text-gray-500 dark:text-slate-400">{e.description}</div>
                    </div>
                    <div className="ml-3 whitespace-nowrap text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      +{formatBRL(e.amount)}
                    </div>
                  </div>
                ))}

                {yieldEvents.length === 0 && (
                  <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800">
                    Nenhuma simulação de rendimento no período.
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de eventos */}
            <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="border-b border-gray-100 p-4 dark:border-slate-800 sm:p-5">
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Movimentações</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Aportes, saques e rendimentos (limitado a 300 itens).
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Descrição</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-right font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Método</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {events.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{formatDateBR(e.date)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                              {e.is_yield ? <IconTrend /> : <IconBank />}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-gray-900 dark:text-slate-100 font-semibold">
                                {e.description || <span className="text-gray-400 dark:text-slate-500">(sem descrição)</span>}
                              </div>

                              {e.is_yield && (
                                <div className="mt-1">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                                    Rendimento
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              e.type === 'expense'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
                            ].join(' ')}
                          >
                            {e.type === 'expense' ? 'Saída' : 'Entrada'}
                          </span>
                        </td>

                        <td
                          className={[
                            'px-4 py-3 text-right font-semibold',
                            e.type === 'expense' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300',
                          ].join(' ')}
                        >
                          {e.type === 'expense' ? '-' : '+'}
                          {formatBRL(e.amount)}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge isCleared={!!e.is_cleared} type={e.type} />
                        </td>

                        <td className="px-4 py-3 text-gray-700 dark:text-slate-200">
                          {PaymentLabel(e.payment_method)}
                        </td>
                      </tr>
                    ))}

                    {events.length === 0 && (
                      <tr>
                        <td className="px-4 py-10 text-center text-gray-500 dark:text-slate-400" colSpan={6}>
                          Nenhuma movimentação no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

function StatusBadge({ isCleared, type }) {
  const label = type === 'income' ? (isCleared ? 'Recebida' : 'A receber') : isCleared ? 'Paga' : 'Em aberto';

  const tone = isCleared ? 'emerald' : type === 'income' ? 'sky' : 'amber';

  const toneCls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200 ring-emerald-200/60 dark:ring-emerald-900/40'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200 ring-sky-200/60 dark:ring-sky-900/40'
        : 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 ring-amber-200/60 dark:ring-amber-900/35';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${toneCls}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

/* ---------- helpers ---------- */

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function formatPercent(v) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2).replace('.', ',')}%`;
}

function takeLast(arr, n) {
  const a = Array.isArray(arr) ? arr : [];
  return a.slice(Math.max(0, a.length - n));
}

/* ---------- Payment label (inclui investment) ---------- */

function PaymentLabel(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'pix') return 'Pix';
  if (m === 'credit_card') return 'Crédito';
  if (m === 'debit_card') return 'Débito';
  if (m === 'card') return 'Cartão';
  if (m === 'cash') return 'Dinheiro';
  if (m === 'transfer') return 'Transfer.';
  if (m === 'investment') return 'Invest.';
  return 'Outro';
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

function IconPlus({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconMinus({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}