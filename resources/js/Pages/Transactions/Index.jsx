// resources/js/Pages/Transactions/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { formatDateBR } from '@/utils/formatters';

export default function Index({ transactions, filters, categories, accounts }) {
  const [month, setMonth] = useState(filters.month || new Date().toISOString().slice(0, 7));
  const [type, setType] = useState(filters.type || '');
  const [categoryId, setCategoryId] = useState(filters.category_id || '');
  const [accountId, setAccountId] = useState(filters.account_id || '');
  const [q, setQ] = useState(filters.q || '');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [installmentFilter, setInstallmentFilter] = useState(filters.installment || '');
  const [status, setStatus] = useState(filters.status || '');

  const queryParams = useMemo(
    () => ({
      month,
      type: type || undefined,
      category_id: categoryId || undefined,
      account_id: accountId || undefined,
      q: q || undefined,
      installment: installmentFilter || undefined,
      status: status || undefined,
    }),
    [month, type, categoryId, accountId, q, installmentFilter, status],
  );

  function exportFile() {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      params.set(k, String(v));
    });
    params.set('format', exportFormat);
    window.location.href = `${route('reports.transactions.export')}?${params.toString()}`;
  }

  function applyFilters() {
    router.get(route('transactions.index'), queryParams, {
      preserveState: true,
      replace: true,
    });
  }

  function clearFilters() {
    setType('');
    setCategoryId('');
    setAccountId('');
    setQ('');
    setInstallmentFilter('');
    setStatus('');
    router.get(route('transactions.index'), { month }, { preserveState: true, replace: true });
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Lançamentos</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Receitas e despesas do período selecionado</p>
          </div>

          <Link
            href={route('transactions.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            + Novo lançamento
          </Link>
        </div>
      }
    >
      <Head title="Lançamentos" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Filtros</div>

              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <div className={`${filtersOpen ? 'block' : 'hidden'} mt-4 sm:block`}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-8 sm:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Mês
                  </label>
                  <input
                    type="month"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={month}
                    onChange={(e) => setMonth(normalizeMonth(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Tipo
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Categoria
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Conta
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Parcelamento
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={installmentFilter}
                    onChange={(e) => setInstallmentFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="only">Somente parcelados</option>
                    <option value="none">Somente normais</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Status
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="open">Em aberto</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Busca
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Descrição..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    Filtrar
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                  >
                    Limpar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
                  <select
                    className="w-full rounded-lg border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:w-48"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="csv">CSV</option>
                  </select>

                  <button
                    type="button"
                    onClick={exportFile}
                    className="w-full whitespace-nowrap rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 sm:w-auto"
                    title="Exportar com os filtros atuais"
                  >
                    Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ MOBILE: cards */}
          <div className="space-y-2 sm:hidden">
            {transactions.data.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* header app-like */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        <PaymentIcon method={t.payment_method} />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 dark:text-slate-100">
                          {t.description || (
                            <span className="text-gray-400 dark:text-slate-500">(sem descrição)</span>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                          {formatDateBR(t.date)} • {t.category?.name || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                        <AccountTypeIcon type={t.account?.type} />
                        <span className="truncate max-w-[180px]">{t.account?.name || '—'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                        <PaymentIcon method={t.payment_method} />
                        {PaymentLabel(t.payment_method)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* tipo */}
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                          t.type === 'expense'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
                        ].join(' ')}
                      >
                        {t.type === 'expense' ? 'Despesa' : 'Receita'}
                      </span>

                      {/* parcelamento */}
                      {t.installment_id && (
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                            t.installment?.is_active
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
                          ].join(' ')}
                          title={t.installment?.is_active ? 'Parcelamento ativo' : 'Parcelamento cancelado'}
                        >
                          {t.installment_number}/{t.installment?.installments_count ?? '?'}
                        </span>
                      )}

                      {/* status */}
                      <StatusBadge t={t} />
                    </div>
                  </div>

                  {/* valor + ações */}
                  <div className="text-right">
                    <div
                      className={[
                        'whitespace-nowrap text-sm font-bold',
                        t.type === 'expense'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-300',
                      ].join(' ')}
                    >
                      {t.type === 'expense' ? '-' : '+'}
                      {formatBRL(t.amount)}
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                      <Link
                        href={route('transactions.edit', t.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                        title="Editar"
                      >
                        <IconEdit />
                      </Link>

                      {t.installment_id && t.installment_number === 1 && t.installment?.is_active && (
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
                          title="Cancelar parcelamento"
                          onClick={() => {
                            if (
                              !confirm('Cancelar este parcelamento? As parcelas futuras não pagas serão removidas.')
                            )
                              return;
                            router.post(route('installments.cancel', t.installment_id));
                          }}
                        >
                          <IconBlock />
                        </button>
                      )}

                      <button
                        className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
                        title="Excluir"
                        onClick={() =>
                          confirm('Excluir este lançamento?') && router.delete(route('transactions.destroy', t.id))
                        }
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {transactions.data.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
                Nenhum lançamento encontrado.
              </div>
            )}
          </div>

          {/* ✅ DESKTOP: tabela */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Conta</th>
                  <th className="px-4 py-3 font-semibold">Pagamento</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {transactions.data.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{formatDateBR(t.date)}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                          <PaymentIcon method={t.payment_method} />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-gray-900 dark:text-slate-100 font-semibold">
                            {t.description || (
                              <span className="text-gray-400 dark:text-slate-500">(sem descrição)</span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                t.type === 'expense'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
                              ].join(' ')}
                            >
                              {t.type === 'expense' ? 'Despesa' : 'Receita'}
                            </span>

                            {t.installment_id && (
                              <span
                                className={[
                                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                                  t.installment?.is_active
                                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200'
                                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
                                ].join(' ')}
                                title={t.installment?.is_active ? 'Parcelamento ativo' : 'Parcelamento cancelado'}
                              >
                                {t.installment_number}/{t.installment?.installments_count ?? '?'}
                              </span>
                            )}

                            <StatusBadge t={t} />
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{t.category?.name || '—'}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
                          <AccountTypeIcon type={t.account?.type} />
                        </span>
                        <span className="min-w-0 truncate">{t.account?.name || '—'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
                          <PaymentIcon method={t.payment_method} />
                        </span>
                        <span className="font-semibold">{PaymentLabel(t.payment_method)}</span>
                      </div>
                    </td>

                    <td
                      className={[
                        'px-4 py-3 text-right font-semibold',
                        t.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-300'
                          : 'text-emerald-600 dark:text-emerald-300',
                      ].join(' ')}
                    >
                      {formatBRL(t.amount)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                          href={route('transactions.edit', t.id)}
                          title="Editar"
                        >
                          <IconEdit />
                          <span className="hidden md:inline">Editar</span>
                        </Link>

                        {t.installment_id && t.installment_number === 1 && t.installment?.is_active && (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
                            title="Cancelar parcelamento"
                            onClick={() => {
                              if (
                                !confirm('Cancelar este parcelamento? As parcelas futuras não pagas serão removidas.')
                              )
                                return;
                              router.post(route('installments.cancel', t.installment_id));
                            }}
                          >
                            <IconBlock />
                            <span className="hidden md:inline">Cancelar</span>
                          </button>
                        )}

                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
                          title="Excluir"
                          onClick={() =>
                            confirm('Excluir este lançamento?') && router.delete(route('transactions.destroy', t.id))
                          }
                        >
                          <IconTrash />
                          <span className="hidden md:inline">Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {transactions.data.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500 dark:text-slate-400" colSpan={7}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ paginação única */}
          <Pagination links={transactions.links} />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ---------- helpers ---------- */

function Pagination({ links }) {
  if (!links || links.length <= 3) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-wrap items-center justify-center gap-1 border-t bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {links.map((l, idx) => (
          <button
            key={idx}
            disabled={!l.url}
            onClick={() => l.url && router.get(l.url, {}, { preserveState: true, replace: true })}
            className={[
              'rounded px-3 py-1 text-sm font-semibold',
              l.active
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
              !l.url ? 'opacity-50' : '',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: l.label }}
          />
        ))}
      </div>
    </div>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function normalizeMonth(v) {
  if (!v) return new Date().toISOString().slice(0, 7);
  return v.slice(0, 7);
}

function getClearedLabel(transaction) {
  if (transaction.type === 'income') {
    return transaction.is_cleared ? 'Recebida' : 'A receber';
  }
  return transaction.is_cleared ? 'Paga' : 'Em aberto';
}

/* ---------- UI bits: payment/account/status + icons ---------- */

function PaymentIcon({ method, className = '' }) {
  const m = String(method || '').toLowerCase();
  if (m === 'pix') return <IconPix className={className} />;
  if (m === 'credit_card' || m === 'debit_card' || m === 'card') return <IconCard className={className} />;
  if (m === 'cash') return <IconCash className={className} />;
  if (m === 'transfer') return <IconTransfer className={className} />;
  return <IconDots className={className} />;
}

function PaymentLabel(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'pix') return 'Pix';
  if (m === 'credit_card') return 'Crédito';
  if (m === 'debit_card') return 'Débito';
  if (m === 'card') return 'Cartão';
  if (m === 'cash') return 'Dinheiro';
  if (m === 'transfer') return 'Transfer.';
  return 'Outro';
}

function AccountTypeIcon({ type, className = '' }) {
  const t = String(type || '').toLowerCase();
  if (t === 'credit_card') return <IconCard className={className} />;
  return <IconBank className={className} />;
}

function StatusBadge({ t }) {
  const label = getClearedLabel(t);

  const tone = t.is_cleared ? 'emerald' : t.type === 'income' ? 'sky' : 'amber';

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

/* ---------- Inline SVGs (no libs needed) ---------- */

function IconBase({ children, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconPix({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3l2.5 2.5L12 8 9.5 5.5 12 3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16l2.5 2.5L12 21l-2.5-2.5L12 16Z" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

function IconCard({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M3 7h18v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      <path d="M7 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconCash({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h16v10H4V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconTransfer({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M7 7h12l-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 7v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 17v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconBank({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9v10M10 9v10M14 9v10M18 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 9l9-5 9 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconDots({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </IconBase>
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

function IconBlock({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}
