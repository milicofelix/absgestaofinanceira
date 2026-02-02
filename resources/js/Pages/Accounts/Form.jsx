import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ mode, account }) {
  const { data, setData, post, put, processing, errors } = useForm({
    name: account?.name ?? '',
    type: account?.type ?? 'bank',
    initial_balance: account?.initial_balance ?? 0,
  });

  function submit(e) {
    e.preventDefault();
    if (mode === 'create') post(route('accounts.store'));
    else put(route('accounts.update', account.id));
  }

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Nova conta' : 'Editar conta'}
          </h2>
          <p className="text-sm text-gray-500">
            Informe os dados básicos da conta
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Nova conta' : 'Editar conta'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <form onSubmit={submit} className="space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Nome da conta
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Ex: Conta corrente, Caixa, Nubank"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                />
                {errors.name && (
                  <div className="mt-1 text-sm text-rose-600">{errors.name}</div>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Tipo
                </label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={data.type}
                  onChange={(e) => setData('type', e.target.value)}
                >
                  <option value="bank">Banco</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão</option>
                  <option value="other">Outro</option>
                </select>
                {errors.type && (
                  <div className="mt-1 text-sm text-rose-600">{errors.type}</div>
                )}
              </div>

              {/* Saldo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Saldo inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={data.initial_balance}
                  onChange={(e) => setData('initial_balance', e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Valor disponível no início do controle
                </p>
                {errors.initial_balance && (
                  <div className="mt-1 text-sm text-rose-600">
                    {errors.initial_balance}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={route('accounts.index')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
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
