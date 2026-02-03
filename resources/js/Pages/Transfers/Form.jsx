import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function TransferForm({ accounts, defaultDate }) {
  const { data, setData, post, processing, errors } = useForm({
    from_account_id: accounts?.[0]?.id ?? '',
    to_account_id: accounts?.[1]?.id ?? (accounts?.[0]?.id ?? ''),
    amount: '',
    date: defaultDate,
    description: 'Transferência',
    note: '',
  });

  function submit(e) {
    e.preventDefault();
    post(route('transfers.store'));
  }

  const blocked = !accounts || accounts.length < 2;

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Transferência</h2>}>
      <Head title="Transferência" />

      <div className="py-8">
        <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
          <div className="rounded bg-white p-6 shadow">

            {blocked && (
              <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Você precisa ter pelo menos <b>2 contas</b> cadastradas para fazer transferência.
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">De (conta origem)</label>
                  <select
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.from_account_id}
                    onChange={(e) => setData('from_account_id', e.target.value)}
                    disabled={blocked}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.from_account_id && <div className="mt-1 text-sm text-red-600">{errors.from_account_id}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium">Para (conta destino)</label>
                  <select
                    className="mt-1 w-full rounded border-gray-300"
                    value={data.to_account_id}
                    onChange={(e) => setData('to_account_id', e.target.value)}
                    disabled={blocked}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.to_account_id && <div className="mt-1 text-sm text-red-600">{errors.to_account_id}</div>}
                </div>
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
                    disabled={blocked}
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
                    disabled={blocked}
                  />
                  {errors.date && <div className="mt-1 text-sm text-red-600">{errors.date}</div>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <input
                  className="mt-1 w-full rounded border-gray-300"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  disabled={blocked}
                />
                {errors.description && <div className="mt-1 text-sm text-red-600">{errors.description}</div>}
              </div>

              <div>
                <label className="text-sm font-medium">Nota (opcional)</label>
                <input
                  className="mt-1 w-full rounded border-gray-300"
                  value={data.note}
                  onChange={(e) => setData('note', e.target.value)}
                  disabled={blocked}
                />
                {errors.note && <div className="mt-1 text-sm text-red-600">{errors.note}</div>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link href={route('transactions.index')} className="text-sm text-gray-600 hover:underline">
                  Voltar
                </Link>
                <button
                  disabled={processing || blocked}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Transferir
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
