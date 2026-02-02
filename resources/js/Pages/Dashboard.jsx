import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useState } from 'react';


export default function Dashboard({ month, income, expense, balance, byCategory, latest }) {
  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Dashboard</h2>}>
      <Head title="Dashboard" />

      <div className="py-8">
        <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Mês: {month}</div>
            <Link href={route('transactions.index')} className="text-sm text-indigo-600 hover:underline">
              Ver lançamentos
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Receitas" value={income} />
            <Card title="Despesas" value={expense} />
            <Card title="Saldo" value={balance} />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">Top categorias (despesas)</h3>
              {byCategory?.length ? (
                <ul className="space-y-2">
                  {byCategory.map((c) => (
                    <li key={c.category_id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{c.name}</span>
                      <span className="font-medium">{formatBRL(c.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Sem despesas neste mês.</p>
              )}
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">Últimos lançamentos</h3>
              {latest?.length ? (
                <ul className="space-y-2">
                  {latest.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="truncate text-gray-800">
                          {t.description || '(sem descrição)'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.date} · {t.category || '—'} · {t.account || '—'}
                        </div>
                      </div>
                      <div className={`ml-4 whitespace-nowrap font-medium ${t.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                        {formatBRL(t.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Sem lançamentos neste mês.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}

const [selectedMonth, setSelectedMonth] = useState(month);

function changeMonth(v) {
  const m = (v || '').slice(0, 7);
  setSelectedMonth(m);
  router.get(route('dashboard'), { month: m }, { preserveState: true, replace: true });
}

function Card({ title, value }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-800">{formatBRL(value || 0)}</div>
    </div>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}
