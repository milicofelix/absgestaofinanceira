import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function Dashboard({ month, income, expense, balance, byCategory, latest, accounts, openingBalance }) {
  const [selectedMonth, setSelectedMonth] = useState(month);

  function changeMonth(v) {
    const m = (v || '').slice(0, 7);
    setSelectedMonth(m);
    router.get(route('dashboard'), { month: m }, { preserveState: true, replace: true });
  }

  const maxCategory = useMemo(() => {
    const max = Math.max(0, ...(byCategory || []).map((c) => Number(c.total || 0)));
    return max || 1;
  }, [byCategory]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">Visão geral do mês selecionado</p>
          </div>

          <Link
            href={route('transactions.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            + Lançamento
          </Link>
        </div>
      }
    >
      <Head title="Dashboard" />

      <div className="py-8">
        <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

          {/* filtro + link */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Mês</span>
              <input
                type="month"
                className="rounded-lg border-gray-300 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                value={selectedMonth}
                onChange={(e) => changeMonth(e.target.value)}
              />
            </div>

            <Link
              href={route('transactions.index', { month: selectedMonth })}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Ver lançamentos →
            </Link>
          </div>

          {/* cards principais */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Saldo inicial"
              value={openingBalance}
              icon="balance"
              accent={Number(openingBalance) >= 0 ? 'emerald' : 'rose'}
            />
            <StatCard
              title="Receitas"
              value={income}
              icon="income"
              accent="emerald"
            />
            <StatCard
              title="Despesas"
              value={expense}
              icon="expense"
              accent="rose"
            />
            <StatCard
              title="Saldo"
              value={balance}
              icon="balance"
              accent={Number(balance) >= 0 ? 'emerald' : 'rose'}
            />
          </div>

          {/* contas */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contas</h3>
                <p className="text-sm text-gray-500">Saldos considerando inicial + entradas − saídas</p>
              </div>
              <Link
                href={route('accounts.index')}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Gerenciar contas
              </Link>
            </div>

            {accounts?.length ? (
              <ul className="divide-y divide-gray-100">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-4">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900">{a.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Inicial: {formatBRL(a.initial_balance)} ·{' '}
                        <span className="text-emerald-700">+{formatBRL(a.income)}</span> ·{' '}
                        <span className="text-rose-600">-{formatBRL(a.expense)}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      <span className="text-emerald-700">{formatBRL(a.income)}</span> ·{' '}
                      <span className="text-rose-600">-{formatBRL(a.expense)}</span>
                    </div>

                    <div className="ml-4 text-right">
                      <div className={`text-lg font-bold ${Number(a.balance) >= 0 ? 'text-gray-900' : 'text-rose-700'}`}>
                        {formatBRL(a.balance)}
                      </div>
                      <div className="text-xs text-gray-400">saldo</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                Sem contas cadastradas. Crie uma conta para começar.
              </div>
            )}
          </div>

          {/* grids de baixo */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* top categorias */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Top categorias (despesas)</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {selectedMonth}
                </span>
              </div>

              {byCategory?.length ? (
                <ul className="space-y-3">
                  {byCategory.map((c) => {
                    const pct = Math.round((Number(c.total || 0) / maxCategory) * 100);
                    return (
                      <li key={c.category_id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium text-gray-800">{c.name}</span>
                          <span className="ml-4 whitespace-nowrap font-semibold text-gray-900">
                            {formatBRL(c.total)}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-emerald-600"
                            style={{ width: `${Math.max(5, pct)}%` }}
                            title={`${pct}%`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Sem despesas neste mês.</p>
              )}
            </div>

            {/* últimos lançamentos */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Últimos lançamentos</h3>
                <Link
                  href={route('transactions.index', { month: selectedMonth })}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Ver todos
                </Link>
              </div>

              {latest?.length ? (
                <ul className="space-y-3">
                  {latest.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900">
                            {t.description || '(sem descrição)'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {t.date} · {t.category || '—'} · {t.account || '—'}
                          </div>
                          <div className="mt-2">
                            {t.type === 'expense' ? (
                              <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                                Despesa
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Receita
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`whitespace-nowrap text-right text-sm font-bold ${t.type === 'expense' ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {t.type === 'expense' ? '-' : '+'}{formatBRL(t.amount)}
                        </div>
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

function StatCard({ title, value, icon, accent = 'emerald' }) {
  const accentClass =
    accent === 'rose'
      ? 'text-rose-700 bg-rose-50'
      : 'text-emerald-700 bg-emerald-50';

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-600">{title}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{formatBRL(value || 0)}</div>
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentClass}`}>
          <Icon name={icon} />
        </div>
      </div>
    </div>
  );
}

function Icon({ name }) {
  // ícones simples em SVG sem dependências
  if (name === 'income') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'expense') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}
