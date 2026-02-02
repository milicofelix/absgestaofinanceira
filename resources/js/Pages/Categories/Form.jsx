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

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">
      {mode === 'create' ? 'Nova categoria' : 'Editar categoria'}
    </h2>}>
      <Head title="Categoria" />

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
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                {errors.type && <div className="mt-1 text-sm text-red-600">{errors.type}</div>}
              </div>

              <div>
                <label className="text-sm font-medium">Cor (opcional)</label>
                <input className="mt-1 w-full rounded border-gray-300" placeholder="#22c55e" value={data.color} onChange={(e) => setData('color', e.target.value)} />
                {errors.color && <div className="mt-1 text-sm text-red-600">{errors.color}</div>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link href={route('categories.index')} className="text-sm text-gray-600 hover:underline">Voltar</Link>
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
