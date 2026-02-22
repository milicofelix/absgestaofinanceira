import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { formatDateBR } from '@/utils/formatters';

export default function Dashboard({
  month,
  income,
  expense,
  balance,
  byCategory,
  latest,
  accounts,
  openingBalance,
  lifetimeIncome,
  budgetsBadge,
}) {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [showLifetimeIncome, setShowLifetimeIncome] = useState(false);

  function changeMonth(v) {
    const m = (v || '').slice(0, 7);
    setSelectedMonth(m);
    router.get(route('dashboard'), { month: m }, { preserveState: true, replace: true });
  }

  const monthLabel = useMemo(() => formatMonthPtBR(selectedMonth), [selectedMonth]);

  const maxCategory = useMemo(() => {
    const max = Math.max(0, ...(byCategory || []).map((c) => Number(c.total || 0)));
    return max || 1;
  }, [byCategory]);

  const totalByCategory = useMemo(
    () => (byCategory || []).reduce((acc, c) => acc + Number(c.total || 0), 0),
    [byCategory],
  );

  const spendRate = useMemo(() => {
    const i = Number(income || 0);
    const e = Number(expense || 0);
    if (i <= 0) return 0;
    return Math.round((e / i) * 100);
  }, [income, expense]);

  const absBalance = useMemo(() => Math.abs(Number(balance || 0)), [balance]);

  // Saldo "pouco" = menor que 10% da receita do mês
  const isLowRemaining = useMemo(() => {
    const i = Number(income || 0);
    const b = Number(balance || 0);
    if (i <= 0) return false;
    if (b < 0) return false;
    return b > 0 && b < i * 0.1;
  }, [income, balance]);

  const balanceTone = useMemo(() => {
    const b = Number(balance || 0);
    if (b < 0) return 'red';
    if (isLowRemaining) return 'yellow';
    return 'green';
  }, [balance, isLowRemaining]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">
              Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Visão geral do mês selecionado
            </p>
          </div>

          <Link
            href={route('transactions.create')}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            + Lançamento
          </Link>
        </div>
      }
    >
      <Head title="Dashboard" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* filtro + link */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <span className="font-medium text-gray-700 dark:text-slate-200">Mês</span>
              <input
                type="month"
                className="rounded-lg border-gray-300 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                value={selectedMonth}
                onChange={(e) => changeMonth(e.target.value)}
              />
            </div>

            <Link
              href={route('transactions.index', { month: selectedMonth })}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Ver lançamentos →
            </Link>
          </div>

          {/* resumo rápido do mês */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              Gastos: {spendRate}% da receita
            </span>

            <span
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold',
                Number(balance || 0) >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200',
              ].join(' ')}
            >
              {Number(balance || 0) >= 0 ? 'Sobrou' : 'Faltou'}: {formatBRL(absBalance)}
            </span>

            <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
              Mês: {monthLabel}
            </span>
          </div>

          {/* toggle receitas acumuladas */}
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Receitas acumuladas
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={showLifetimeIncome}
              onClick={() => setShowLifetimeIncome((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition',
                showLifetimeIncome ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                  showLifetimeIncome ? 'translate-x-5' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>

          {budgetsBadge?.total > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Metas do mês em atenção
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    {budgetsBadge.exceeded ? (
                      <span className="font-semibold text-rose-700 dark:text-rose-300">
                        {budgetsBadge.exceeded} estourada(s)
                      </span>
                    ) : null}
                    {budgetsBadge.warning ? (
                      <span
                        className={
                          budgetsBadge.exceeded
                            ? 'ml-2 font-semibold text-amber-800 dark:text-amber-300'
                            : 'font-semibold text-amber-800 dark:text-amber-300'
                        }
                      >
                        {budgetsBadge.warning} em risco
                      </span>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={route('budgets.index', { month: budgetsBadge.month })}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Ver metas →
                </Link>
              </div>
            </div>
          )}

          {/* cards principais */}
          <div
            className={[
              'grid grid-cols-1 gap-4 items-stretch',
              showLifetimeIncome ? 'md:grid-cols-5' : 'md:grid-cols-4',
            ].join(' ')}
          >
            <StatCard
              title="Saldo inicial (mês)"
              value={openingBalance}
              icon="balance"
              tone="blue"
              href={route('transactions.index', { month: selectedMonth })}
            />

            <StatCard
              title="Receitas (mês)"
              value={income}
              icon="income"
              tone="green"
              href={route('transactions.index', { month: selectedMonth, type: 'income' })}
            />

            <StatCard
              title="Despesas (mês)"
              value={expense}
              icon="expense"
              tone="red"
              href={route('transactions.index', { month: selectedMonth, type: 'expense' })}
            />

            <StatCard
              title="Saldo (mês)"
              value={balance}
              icon="balance"
              tone={balanceTone}
              href={route('transactions.index', { month: selectedMonth })}
              subLabel={balanceTone === 'yellow' ? 'atenção: sobrando pouco' : undefined}
            />

            {showLifetimeIncome && (
              <StatCard
                title="Receitas acumuladas (até este mês)"
                value={lifetimeIncome}
                icon="wallet"
                tone="purple"
                href={route('transactions.index', { month: selectedMonth, type: 'income' })}
              />
            )}
          </div>

          {/* contas */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Contas</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Saldos considerando inicial + entradas − saídas
                </p>
              </div>
              <Link
                href={route('accounts.index')}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Gerenciar contas
              </Link>
            </div>

            {accounts?.length ? (
              <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                {accounts.map((a) => (
                  <li key={a.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900 dark:text-slate-100">
                        {a.name}
                      </div>

                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Inicial: {formatBRL(a.initial_balance)} ·{' '}
                        <span className="text-emerald-700 dark:text-emerald-300">
                          +{formatBRL(a.income)}
                        </span>{' '}
                        ·{' '}
                        <span className="text-rose-600 dark:text-rose-300">
                          -{formatBRL(a.expense)}
                        </span>
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                          anterior: {formatBRL(a.opening_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={[
                          'text-lg font-bold',
                          Number(a.balance) >= 0
                            ? 'text-gray-900 dark:text-slate-100'
                            : 'text-rose-700 dark:text-rose-300',
                        ].join(' ')}
                      >
                        {formatBRL(a.balance)}
                      </div>
                     <div className="text-xs text-gray-400 dark:text-slate-500">
                      {a.type === 'credit_card'
                        ? (Number(a.balance) > 0 ? 'dívida atual' : 'crédito no cartão')
                        : 'saldo atual'}
                    </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <div>Sem contas cadastradas.</div>
                <Link
                  href={route('accounts.index')}
                  className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Criar conta
                </Link>
              </div>
            )}
          </div>

          {/* grids de baixo */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* top categorias */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Top categorias (despesas)
                </h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                  {monthLabel}
                </span>
              </div>

              {byCategory?.length ? (
                <ul className="space-y-3">
                  {byCategory.map((c) => {
                    const pctBar = Math.round((Number(c.total || 0) / maxCategory) * 100);
                    const share = totalByCategory
                      ? Math.round((Number(c.total || 0) / totalByCategory) * 100)
                      : 0;

                    return (
                      <li key={c.category_id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium text-gray-800 dark:text-slate-200">
                            {c.name}
                          </span>

                          <div className="ml-4 flex items-center gap-2">
                            <span className="whitespace-nowrap font-semibold text-gray-900 dark:text-slate-100">
                              {formatBRL(c.total)}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                              {share}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-600"
                            style={{ width: `${Math.max(5, pctBar)}%` }}
                            title={`${share}% do total`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <div>Sem despesas neste mês.</div>
                  <Link
                    href={route('transactions.create')}
                    className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    + Adicionar lançamento
                  </Link>
                </div>
              )}
            </div>

            {/* últimos lançamentos */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Últimos lançamentos
                </h3>
                <Link
                  href={route('transactions.index', { month: selectedMonth })}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Ver todos
                </Link>
              </div>

              {latest?.length ? (
                <ul className="space-y-3">
                  {latest.map((t) => (
                    <li
                      key={t.id}
                      className="group rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:bg-gray-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900 dark:text-slate-100">
                            {t.description || '(sem descrição)'}
                          </div>

                          <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {formatDateBR(t.date)} · {t.category || '—'} · {t.account || '—'}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            {t.type === 'expense' ? (
                              <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/25 dark:text-rose-200">
                                Despesa
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                                Receita
                              </span>
                            )}

                            {/* ações rápidas no desktop (aparece no hover) */}
                            <div className="flex items-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                              <Link
                                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                                href={route('transactions.edit', t.id)}
                              >
                                Editar
                              </Link>
                              <button
                                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                                onClick={() =>
                                  confirm('Excluir este lançamento?') &&
                                  router.delete(route('transactions.destroy', t.id))
                                }
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className={[
                            'whitespace-nowrap text-right text-sm font-bold',
                            t.type === 'expense'
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-emerald-700 dark:text-emerald-300',
                          ].join(' ')}
                        >
                          {t.type === 'expense' ? '-' : '+'}
                          {formatBRL(t.amount)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <div>Sem lançamentos neste mês.</div>
                  <Link
                    href={route('transactions.create')}
                    className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    + Adicionar lançamento
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/**
 * tone: green | blue | purple | yellow | red | gray
 */
function StatCard({ title, value, icon, tone = 'green', href, subLabel }) {
  const toneClasses = getPastelToneClasses(tone);

  const body = (
    <div
      className={[
        'relative h-full rounded-2xl p-6 shadow-sm ring-1 transition',
        toneClasses.card,
        'hover:shadow-md',
      ].join(' ')}
    >
      {/* Ícone menor no topo direito */}
      <div
        className={[
          'absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl ring-1',
          toneClasses.icon,
        ].join(' ')}
      >
        <Icon name={icon} size={18} />
      </div>

      <div className="pr-14">
        <div className={['text-sm font-semibold leading-5', toneClasses.title].join(' ')}>
          <span className="block line-clamp-2 min-h-[40px]">{title}</span>
        </div>

        <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-slate-100">
          {formatBRL(value || 0)}
        </div>

        {subLabel && <div className={['mt-2 text-xs font-semibold', toneClasses.sub].join(' ')}>{subLabel}</div>}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

function getPastelToneClasses(tone) {
  switch (tone) {
    case 'blue':
      return {
        card: 'bg-sky-50 ring-sky-200/60 dark:bg-sky-900/20 dark:ring-sky-900/40',
        title: 'text-sky-800 dark:text-sky-200',
        sub: 'text-sky-700 dark:text-sky-300',
        icon: 'bg-white/70 text-sky-700 ring-sky-200/70 dark:bg-slate-900/60 dark:text-sky-200 dark:ring-sky-900/40',
      };
    case 'purple':
      return {
        card: 'bg-violet-50 ring-violet-200/60 dark:bg-violet-900/20 dark:ring-violet-900/40',
        title: 'text-violet-800 dark:text-violet-200',
        sub: 'text-violet-700 dark:text-violet-300',
        icon: 'bg-white/70 text-violet-700 ring-violet-200/70 dark:bg-slate-900/60 dark:text-violet-200 dark:ring-violet-900/40',
      };
    case 'yellow':
      return {
        card: 'bg-amber-50 ring-amber-200/60 dark:bg-amber-900/15 dark:ring-amber-900/35',
        title: 'text-amber-900 dark:text-amber-200',
        sub: 'text-amber-800 dark:text-amber-300',
        icon: 'bg-white/70 text-amber-800 ring-amber-200/70 dark:bg-slate-900/60 dark:text-amber-200 dark:ring-amber-900/35',
      };
    case 'red':
      return {
        card: 'bg-rose-50 ring-rose-200/60 dark:bg-rose-900/15 dark:ring-rose-900/35',
        title: 'text-rose-900 dark:text-rose-200',
        sub: 'text-rose-800 dark:text-rose-300',
        icon: 'bg-white/70 text-rose-700 ring-rose-200/70 dark:bg-slate-900/60 dark:text-rose-200 dark:ring-rose-900/35',
      };
    case 'gray':
      return {
        card: 'bg-gray-50 ring-gray-200/70 dark:bg-slate-900 dark:ring-slate-800',
        title: 'text-gray-800 dark:text-slate-200',
        sub: 'text-gray-700 dark:text-slate-300',
        icon: 'bg-white/70 text-gray-700 ring-gray-200/70 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800',
      };
    case 'green':
    default:
      return {
        card: 'bg-emerald-50 ring-emerald-200/60 dark:bg-emerald-900/15 dark:ring-emerald-900/35',
        title: 'text-emerald-900 dark:text-emerald-200',
        sub: 'text-emerald-800 dark:text-emerald-300',
        icon: 'bg-white/70 text-emerald-700 ring-emerald-200/70 dark:bg-slate-900/60 dark:text-emerald-200 dark:ring-emerald-900/35',
      };
  }
}

function Icon({ name, size = 22 }) {
  if (name === 'income') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'expense') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'balance') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7l1-3h10l1 3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6 10v10h12V10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7h18v14H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path
          d="M17 15h4V9h-4c-2 0-3 1.5-3 3s1 3 3 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M3 7l2-3h14l2 3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function formatMonthPtBR(yyyyMm) {
  const v = String(yyyyMm || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(v)) return v || '—';
  const [y, m] = v.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
}
