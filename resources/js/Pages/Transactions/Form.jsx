import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import MoneyInput from '@/Components/MoneyInput';

export default function Form({ mode, transaction, categories, accounts }) {
  const { data, setData, post, put, processing, errors } = useForm({
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? '', // normalizado: "1234.56"
    date: transaction?.date ?? new Date().toISOString().slice(0, 10),
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? (categories?.[0]?.id ?? ''),
    account_id: transaction?.account_id ?? (accounts?.[0]?.id ?? ''),
    payment_method: transaction?.payment_method ?? 'pix',
  });

  const blocked = categories.length === 0 || accounts.length === 0;

  const filteredCategories = useMemo(() => {
    return (categories || []).filter((c) => c.type === data.type);
  }, [categories, data.type]);

  function submit(e) {
    e.preventDefault();
    if (mode === 'create') post(route('transactions.store'));
    else put(route('transactions.update', transaction.id));
  }

  function onChangeType(nextType) {
    setData('type', nextType);

    const current = categories.find((c) => String(c.id) === String(data.category_id));
    if (!current || current.type !== nextType) {
      const first = categories.find((c) => c.type === nextType);
      setData('category_id', first ? String(first.id) : '');
    }
  }

  const typeBadge =
    data.type === 'income'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-700';

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'}
          </h2>
          <p className="text-sm text-gray-500">
            Registre uma {data.type === 'income' ? 'receita' : 'despesa'} com conta e categoria
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'} />

      <div className="py-8">
        {/* ✅ padding no mobile também (evita colar nas laterais) */}
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {blocked && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold">Atenção</div>
                <div className="mt-1 text-amber-800">
                  Para lançar, cadastre ao menos <b>1 categoria</b> e <b>1 conta</b>.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={route('categories.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    + Criar categoria
                  </Link>
                  <Link
                    href={route('accounts.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    + Criar conta
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              {/* Tipo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Tipo</label>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${typeBadge}`}>
                    {data.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>

                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={data.type}
                  onChange={(e) => onChangeType(e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>

                {errors.type && <div className="mt-1 text-sm text-rose-600">{errors.type}</div>}
              </div>

              {/* Valor + Data */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Valor</label>

                  {/* ✅ MoneyInput cuida de máscara e normalização */}
                  <div className="mt-1">
                    <MoneyInput
                      value={data.amount}
                      onValueChange={(normalized) => setData('amount', normalized)}
                      placeholder="0,00"
                      prefix="R$"
                    />
                  </div>

                  {errors.amount && <div className="mt-1 text-sm text-rose-600">{errors.amount}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={data.date}
                    onChange={(e) => setData('date', e.target.value)}
                  />
                  {errors.date && <div className="mt-1 text-sm text-rose-600">{errors.date}</div>}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Descrição</label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Ex: Mercado, aluguel, salário..."
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                />
                {errors.description && <div className="mt-1 text-sm text-rose-600">{errors.description}</div>}
              </div>

              {/* Categoria + Conta */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Categoria</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    disabled={categories.length === 0}
                  >
                    {filteredCategories.length === 0 ? (
                      <option value="">(sem categorias para este tipo)</option>
                    ) : (
                      filteredCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.category_id && <div className="mt-1 text-sm text-rose-600">{errors.category_id}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Conta</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.account_id}
                    onChange={(e) => setData('account_id', e.target.value)}
                    disabled={accounts.length === 0}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.account_id && <div className="mt-1 text-sm text-rose-600">{errors.account_id}</div>}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Forma de pagamento</label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={data.payment_method}
                  onChange={(e) => setData('payment_method', e.target.value)}
                >
                  <option value="pix">Pix</option>
                  <option value="card">Cartão</option>
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={route('transactions.index')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing || blocked}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Dica: use categorias separadas para despesas e receitas — fica bem melhor no dashboard.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
