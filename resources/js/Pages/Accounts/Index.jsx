import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ accounts }) {
  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Contas</h2>}>
      <Head title="Contas" />

      <div className="py-8">
        <div className="mx-auto max-w-5xl space-y-4 sm:px-6 lg:px-8">
          <div className="flex justify-end">
            <Link href={route('accounts.create')} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Nova conta
            </Link>
          </div>

          <div className="overflow-hidden rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Saldo inicial</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">{labelType(a.type)}</td>
                    <td className="px-4 py-3">{formatBRL(Number(a.initial_balance))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3">
                        <Link className="text-indigo-600 hover:underline" href={route('accounts.edit', a.id)}>Editar</Link>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => confirm('Excluir esta conta?') && router.delete(route('accounts.destroy', a.id))}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                      Nenhuma conta cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function labelType(v) {
  if (v === 'cash') return 'Dinheiro';
  if (v === 'bank') return 'Banco';
  if (v === 'credit_card') return 'Cartão';
  return 'Outro';
}
function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
