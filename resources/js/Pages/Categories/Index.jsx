import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ categories }) {
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Categorias</h2>
            <p className="text-sm text-gray-500">
              Organize seus lançamentos por tipo
            </p>
          </div>

          <Link
            href={route('categories.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            + Nova categoria
          </Link>
        </div>
      }
    >
      <Head title="Categorias" />

      <div className="py-8">
        <div className="mx-auto max-w-5xl sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {c.name}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          c.type === 'expense'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {c.type === 'expense' ? 'Despesa' : 'Receita'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                          href={route('categories.edit', c.id)}
                        >
                          Editar
                        </Link>

                        <button
                          className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                          onClick={() =>
                            confirm('Excluir esta categoria?') &&
                            router.delete(route('categories.destroy', c.id))
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-gray-500"
                      colSpan={3}
                    >
                      Nenhuma categoria cadastrada.
                      <div className="mt-2">
                        <Link
                          href={route('categories.create')}
                          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Criar a primeira categoria
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Dica: categorias de <strong>Despesa</strong> aparecem no gráfico do
            dashboard.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
