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
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200';

  const colorValue = (data.color || '').trim();
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue);

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {mode === 'create' ? 'Nova categoria' : 'Editar categoria'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Defina o tipo e (opcionalmente) uma cor para identificar no app
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Nova categoria' : 'Editar categoria'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <form onSubmit={submit} className="space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Nome da categoria
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Ex: Alimentação, Transporte, Salário…"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                />
                {errors.name && (
                  <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.name}</div>
                )}
              </div>

              {/* Tipo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Tipo
                  </label>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                    {data.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </div>

                <select
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={data.type}
                  onChange={(e) => setData('type', e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>

                {errors.type && (
                  <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.type}</div>
                )}
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Cor (opcional)
                </label>

                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="#22c55e"
                    value={data.color}
                    onChange={(e) => setData('color', e.target.value)}
                  />

                  <div
                    className="h-10 w-10 rounded-lg ring-1 ring-gray-200 dark:ring-slate-800"
                    title={isHex ? colorValue : 'Cor inválida'}
                    style={{ backgroundColor: isHex ? colorValue : '#0b1220' }} // fallback escuro neutro
                  />
                </div>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Use HEX (ex: <span className="font-semibold">#22c55e</span>). Se deixar vazio, o sistema usa padrão.
                </p>

                {errors.color && (
                  <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.color}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={route('categories.index')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline dark:text-slate-300 dark:hover:text-white"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-900"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>

          {/* dica */}
          <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Dica: para despesas, use tons mais quentes; para receitas, tons verdes.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
