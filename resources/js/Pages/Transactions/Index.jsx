import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function Index({ transactions, filters, categories, accounts }) {
  const [month, setMonth] = useState(filters.month || new Date().toISOString().slice(0, 7));
  const [type, setType] = useState(filters.type || '');
  const [categoryId, setCategoryId] = useState(filters.category_id || '');
  const [accountId, setAccountId] = useState(filters.account_id || '');
  const [q, setQ] = useState(filters.q || '');

  const queryParams = useMemo(() => ({
    month,
    type: type || undefined,
    category_id: categoryId || undefined,
    account_id: accountId || undefined,
    q: q || undefined,
  }), [month, type, categoryId, accountId, q]);

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

  // aplica automaticamente quando muda o mês (fica bem natural)
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Lançamentos</h2>}>
      <Head title="Lançamentos" />

      <div className="py-8">
        <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-3 rounded bg-white p-4 shadow sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mês</label>
                <input
                  type="month"
                  className="mt-1 w-full rounded border-gray-300"
                  value={month}
                  onChange={(e) => setMonth(NoteMonth(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</label>
                <select className="mt-1 w-full rounded border-gray-300" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria</label>
                <select className="mt-1 w-full rounded border-gray-300" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'expense' ? 'Despesa' : 'Receita'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conta</label>
                <select className="mt-1 w-full rounded border-gray-300" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">Todas</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Busca</label>
                <input
                  className="mt-1 w-full rounded border-gray-300"
                  placeholder="Descrição..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={applyFilters} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Filtrar
              </button>
              <button onClick={clearFilters} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Limpar
              </button>
              <Link href={route('transactions.create')} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                + Novo
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {transactions.data.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="px-4 py-3">{t.date}</td>
                    <td className="px-4 py-3">{t.description || '(sem descrição)'}</td>
                    <td className="px-4 py-3">{t.category?.name || t.category || '—'}</td>
                    <td className="px-4 py-3">{t.account?.name || t.account || '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                      {formatBRL(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3">
                        <Link className="text-indigo-600 hover:underline" href={route('transactions.edit', t.id)}>
                          Editar
                        </Link>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => confirm('Excluir este lançamento?') && router.delete(route('transactions.destroy', t.id))}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {transactions.data.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
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

function Pagination({ links }) {
  if (!links || links.length <= 3) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t bg-white p-3">
      {links.map((l, idx) => (
        <button
          key={idx}
          disabled={!l.url}
          onClick={() => l.url && router.get(l.url, {}, { preserveState: true, replace: true })}
          className={[
            'rounded px-3 py-1 text-sm',
            l.active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            !l.url ? 'opacity-50' : '',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: l.label }}
        />
      ))}
    </div>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function NoteMonth(v) {
  // garante formato YYYY-MM
  if (!v) return new Date().toISOString().slice(0, 7);
  return v.slice(0, 7);
}
