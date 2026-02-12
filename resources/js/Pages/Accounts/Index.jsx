import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ accounts }) {
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">Contas</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie suas contas e saldo inicial</p>
          </div>

          <Link
            href={route('accounts.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            + Nova conta
          </Link>
        </div>
      }
    >
      <Head title="Contas" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Saldo inicial</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">{a.name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                        {labelType(a.type)}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                      {formatBRL(Number(a.initial_balance))}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                          href={route('accounts.edit', a.id)}
                        >
                          Editar
                        </Link>

                        <button
                          className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-300 dark:hover:text-rose-200"
                          onClick={() =>
                            confirm('Excluir esta conta?') &&
                            router.delete(route('accounts.destroy', a.id))
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {accounts.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500 dark:text-slate-400" colSpan={4}>
                      Nenhuma conta cadastrada.
                      <div className="mt-2">
                        <Link
                          href={route('accounts.create')}
                          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                        >
                          Criar a primeira conta
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* dica/observação */}
          <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Dica: use “Banco” para conta corrente/poupança, “Cartão” para cartão de crédito e “Dinheiro” para caixa.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function labelType(v) {
  if (v === 'cash') return 'Dinheiro';
  if (v === 'bank') return 'Banco';
  if (v === 'debit') return 'Débito';
  if (v === 'credit_card') return 'Cartão';
  return 'Outro';
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
