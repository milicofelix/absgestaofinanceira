import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ categories }) {
  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Categorias</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Organize seus lançamentos por tipo
            </p>
          </div>

          <Link
            href={route('categories.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            + Nova categoria
          </Link>
        </div>
      }
    >
      <Head title="Categorias" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-950/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">
                        {c.name}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          c.type === 'expense'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
                        ].join(' ')}
                      >
                        {c.type === 'expense' ? 'Despesa' : 'Receita'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                          href={route('categories.edit', c.id)}
                        >
                          Editar
                        </Link>

                        <button
                          className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-300 dark:hover:text-rose-200"
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
                      className="px-4 py-10 text-center text-gray-500 dark:text-slate-400"
                      colSpan={3}
                    >
                      Nenhuma categoria cadastrada.
                      <div className="mt-2">
                        <Link
                          href={route('categories.create')}
                          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
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

          <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Dica: categorias de <strong>Despesa</strong> aparecem no gráfico do dashboard.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
