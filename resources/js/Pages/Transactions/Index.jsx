import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function Index({ transactions, filters, categories, accounts }) {
  const [month, setMonth] = useState(filters.month || new Date().toISOString().slice(0, 7));
  const [type, setType] = useState(filters.type || '');
  const [categoryId, setCategoryId] = useState(filters.category_id || '');
  const [accountId, setAccountId] = useState(filters.account_id || '');
  const [q, setQ] = useState(filters.q || '');

  const queryParams = useMemo(
    () => ({
      month,
      type: type || undefined,
      category_id: categoryId || undefined,
      account_id: accountId || undefined,
      q: q || undefined,
    }),
    [month, type, categoryId, accountId, q],
  );

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
            <h2 className="text-xl font-semibold text-gray-900">Lançamentos</h2>
            <p className="text-sm text-gray-500">
              Receitas e despesas do período selecionado
            </p>
          </div>

          <Link
            href={route('transactions.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            + Novo lançamento
          </Link>
        </div>
      }
    >
      <Head title="Lançamentos" />

      <div className="py-8">
        <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">

          {/* Filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Mês
                </label>
                <input
                  type="month"
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={month}
                  onChange={(e) => setMonth(normalizeMonth(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo
                </label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Categoria
                </label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
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
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Conta
                </label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
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

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Busca
                </label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Descrição..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={applyFilters}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Filtrar
              </button>

              <button
                onClick={clearFilters}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Conta</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {transactions.data.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{t.date}</td>
                    <td className="px-4 py-3">
                      {t.description || <span className="text-gray-400">(sem descrição)</span>}
                    </td>
                    <td className="px-4 py-3">{t.category?.name || '—'}</td>
                    <td className="px-4 py-3">{t.account?.name || '—'}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatBRL(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3">
                        <Link
                          className="text-sm font-semibold text-emerald-700 hover:underline"
                          href={route('transactions.edit', t.id)}
                        >
                          Editar
                        </Link>
                        <button
                          className="text-sm font-semibold text-rose-600 hover:underline"
                          onClick={() =>
                            confirm('Excluir este lançamento?') &&
                            router.delete(route('transactions.destroy', t.id))
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {transactions.data.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination links={transactions.links} />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ---------- helpers ---------- */

function Pagination({ links }) {
  if (!links || links.length <= 3) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t bg-white p-3">
      {links.map((l, idx) => (
        <button
          key={idx}
          disabled={!l.url}
          onClick={() =>
            l.url && router.get(l.url, {}, { preserveState: true, replace: true })
          }
          className={[
            'rounded px-3 py-1 text-sm font-semibold',
            l.active
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            !l.url ? 'opacity-50' : '',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: l.label }}
        />
      ))}
    </div>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(v || 0));
}

function normalizeMonth(v) {
  if (!v) return new Date().toISOString().slice(0, 7);
  return v.slice(0, 7);
}
