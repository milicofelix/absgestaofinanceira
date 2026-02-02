import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ mode, transaction, categories, accounts }) {
  const { data, setData, post, put, processing, errors } = useForm({
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? '',
    date: transaction?.date ?? new Date().toISOString().slice(0, 10),
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? (categories?.[0]?.id ?? ''),
    account_id: transaction?.account_id ?? (accounts?.[0]?.id ?? ''),
    payment_method: transaction?.payment_method ?? 'pix',
  });

  function submit(e) {
    e.preventDefault();
    if (mode === 'create') post(route('transactions.store'));
    else put(route('transactions.update', transaction.id));
  }

  const blocked = categories.length === 0 || accounts.length === 0;

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">
      {mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'}
    </h2>}>
      <Head title={mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
          <div className="rounded bg-white p-6 shadow">

            {blocked && (
              <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Para lançar, cadastre ao menos <b>1 categoria</b> e <b>1 conta</b>.
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select className="mt-1 w-full rounded border-gray-300" value={data.type} onChange={(e) => setData('type', e.target.value)}>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                {errors.type && <div className="mt-1 text-sm text-red-600">{errors.type}</div>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                  />
                  {errors.amount && <div className="mt-1 text-sm text-red-600">{errors.amount}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.date}
                    onChange={(e) => setData('date', e.target.value)}
                  />
                  {errors.date && <div className="mt-1 text-sm text-red-600">{errors.date}</div>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <input
                  className="mt-1 w-full rounded border-gray-300"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                />
                {errors.description && <div className="mt-1 text-sm text-red-600">{errors.description}</div>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    disabled={categories.length === 0}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'expense' ? 'Despesa' : 'Receita'})
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <div className="mt-1 text-sm text-red-600">{errors.category_id}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium">Conta</label>
                  <select
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.account_id}
                    onChange={(e) => setData('account_id', e.target.value)}
                    disabled={accounts.length === 0}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.account_id && <div className="mt-1 text-sm text-red-600">{errors.account_id}</div>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Forma de pagamento</label>
                <select className="mt-1 w-full rounded border-gray-300" value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)}>
                  <option value="pix">Pix</option>
                  <option value="card">Cartão</option>
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link href={route('transactions.index')} className="text-sm text-gray-600 hover:underline">
                  Voltar
                </Link>
                <button
                  disabled={processing || blocked}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
