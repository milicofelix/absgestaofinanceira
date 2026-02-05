import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import MoneyInput from '@/Components/MoneyInput';

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
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Transferência</h2>
          <p className="text-sm text-gray-500">Envie valor de uma conta para outra</p>
        </div>
      }
    >
      <Head title="Transferência" />

      <div className="py-8">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {blocked && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold">Atenção</div>
                <div className="mt-1 text-amber-800">
                  Você precisa ter pelo menos <b>2 contas</b> cadastradas para fazer transferência.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">De (conta origem)</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.from_account_id}
                    onChange={(e) => setData('from_account_id', e.target.value)}
                    disabled={blocked}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.from_account_id && <div className="mt-1 text-sm text-rose-600">{errors.from_account_id}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Para (conta destino)</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.to_account_id}
                    onChange={(e) => setData('to_account_id', e.target.value)}
                    disabled={blocked}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.to_account_id && <div className="mt-1 text-sm text-rose-600">{errors.to_account_id}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Valor</label>

                  {/* ✅ agora fica idêntico aos inputs padrão */}
                  <div className="mt-1">
                    <MoneyInput
                      value={data.amount}
                      onValueChange={(normalized) => setData('amount', normalized)}
                      disabled={blocked}
                      placeholder="0,00"
                      prefix="R$"
                      inputClassName="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    />
                  </div>

                  {errors.amount && <div className="mt-1 text-sm text-rose-600">{errors.amount}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.date}
                    onChange={(e) => setData('date', e.target.value)}
                    disabled={blocked}
                  />
                  {errors.date && <div className="mt-1 text-sm text-rose-600">{errors.date}</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Descrição (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  disabled={blocked}
                />
                {errors.description && <div className="mt-1 text-sm text-rose-600">{errors.description}</div>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Nota (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.note}
                  onChange={(e) => setData('note', e.target.value)}
                  disabled={blocked}
                />
                {errors.note && <div className="mt-1 text-sm text-rose-600">{errors.note}</div>}
              </div>

              <div className="flex items-center justify-between pt-2">
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
                  Transferir
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Dica: use a descrição para identificar a transferência (ex.: “BB → Nubank”).
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
