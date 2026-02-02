import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ mode, category }) {
  const { data, setData, post, put, processing, errors } = useForm({
    name: category?.name ?? '',
    type: category?.type ?? 'expense',
    color: category?.color ?? '',
  });

  function submit(e) {
    e.preventDefault();
    if (mode === 'create') post(route('categories.store'));
    else put(route('categories.update', category.id));
  }

  const badgeClass =
    data.type === 'income'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-700';

  const colorValue = (data.color || '').trim();
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue);

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Nova categoria' : 'Editar categoria'}
          </h2>
          <p className="text-sm text-gray-500">
            Defina o tipo e (opcionalmente) uma cor para identificar no app
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Nova categoria' : 'Editar categoria'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <form onSubmit={submit} className="space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Nome da categoria
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Ex: Alimentação, Transporte, Salário…"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                />
                {errors.name && (
                  <div className="mt-1 text-sm text-rose-600">{errors.name}</div>
                )}
              </div>

              {/* Tipo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tipo
                  </label>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                    {data.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </div>

                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={data.type}
                  onChange={(e) => setData('type', e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>

                {errors.type && (
                  <div className="mt-1 text-sm text-rose-600">{errors.type}</div>
                )}
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Cor (opcional)
                </label>

                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="#22c55e"
                    value={data.color}
                    onChange={(e) => setData('color', e.target.value)}
                  />

                  <div
                    className="h-10 w-10 rounded-lg ring-1 ring-gray-200"
                    title={isHex ? colorValue : 'Cor inválida'}
                    style={{ backgroundColor: isHex ? colorValue : '#f3f4f6' }}
                  />
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Use HEX (ex: <span className="font-semibold">#22c55e</span>). Se deixar vazio, o sistema usa padrão.
                </p>

                {errors.color && (
                  <div className="mt-1 text-sm text-rose-600">{errors.color}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={route('categories.index')}
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

          {/* dica */}
          <div className="mt-4 text-xs text-gray-400">
            Dica: para despesas, use tons mais quentes; para receitas, tons verdes.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
