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
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">
      {mode === 'create' ? 'Nova conta' : 'Editar conta'}
    </h2>}>
      <Head title="Conta" />

      <div className="py-8">
        <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
          <div className="rounded bg-white p-6 shadow">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input className="mt-1 w-full rounded border-gray-300" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                {errors.name && <div className="mt-1 text-sm text-red-600">{errors.name}</div>}
              </div>

              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select className="mt-1 w-full rounded border-gray-300" value={data.type} onChange={(e) => setData('type', e.target.value)}>
                  <option value="bank">Banco</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão</option>
                  <option value="other">Outro</option>
                </select>
                {errors.type && <div className="mt-1 text-sm text-red-600">{errors.type}</div>}
              </div>

              <div>
                <label className="text-sm font-medium">Saldo inicial</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded border-gray-300"
                  value={data.initial_balance}
                  onChange={(e) => setData('initial_balance', e.target.value)}
                />
                {errors.initial_balance && <div className="mt-1 text-sm text-red-600">{errors.initial_balance}</div>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link href={route('accounts.index')} className="text-sm text-gray-600 hover:underline">Voltar</Link>
                <button disabled={processing} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
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
