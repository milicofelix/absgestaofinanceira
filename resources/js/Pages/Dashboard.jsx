import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { formatDateBR } from '@/utils/formatters';

export default function Dashboard({
  month,
  filters,
  categories,
  accountsFilter,
  income,
  expense,
  balance,
  byCategory,
  latest,
  accounts,
  openingBalance,
  lifetimeIncome,
  lifetimeExpense,
  budgetsBadge,
}) {
  const [selectedMonth, setSelectedMonth] = useState(filters?.month || month);
  const [showAccumulatedExpense, setShowAccumulatedExpense] = useState(false);
  const { flash } = usePage().props;
  const [type, setType] = useState(filters?.type || '');
  const [categoryId, setCategoryId] = useState(filters?.category_id || '');
  const [accountId, setAccountId] = useState(filters?.account_id || '');
  const [installment, setInstallment] = useState(filters?.installment || '');
  const [status, setStatus] = useState(filters?.status || '');
  const [q, setQ] = useState(filters?.q || '');

  const hasActiveExtraFilters = !!(
    (filters?.type || '') ||
    (filters?.category_id || '') ||
    (filters?.account_id || '') ||
    (filters?.installment || '') ||
    (filters?.status || '') ||
    (filters?.q || '')
  );

  const [showFilters, setShowFilters] = useState(hasActiveExtraFilters);

  useEffect(() => {
    if (hasActiveExtraFilters) {
      setShowFilters(true);
    }
  }, [hasActiveExtraFilters]);

  function applyFilters(next = {}) {
    const params = {
      month: (next.month ?? selectedMonth),
      type: (next.type ?? type) || undefined,
      category_id: (next.category_id ?? categoryId) || undefined,
      account_id: (next.account_id ?? accountId) || undefined,
      installment: (next.installment ?? installment) || undefined,
      status: (next.status ?? status) || undefined,
      q: (next.q ?? q) || undefined,
    };

    setSelectedMonth(params.month);
    if ('type' in next) setType(next.type);
    if ('category_id' in next) setCategoryId(next.category_id);
    if ('account_id' in next) setAccountId(next.account_id);
    if ('installment' in next) setInstallment(next.installment);
    if ('status' in next) setStatus(next.status);
    if ('q' in next) setQ(next.q);

    router.get(route('dashboard'), params, { preserveState: true, replace: true });
  }

  function clearFilters() {
    setType('');
    setCategoryId('');
    setAccountId('');
    setInstallment('');
    setStatus('');
    setQ('');
    router.get(route('dashboard'), { month: selectedMonth }, { preserveState: true, replace: true });
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

  function daysInMonth(y, m1to12) {
    return new Date(y, m1to12, 0).getDate();
  }

  function buildClosingDate(selectedMonth, closingDay) {
    const [yy, mm] = String(selectedMonth || '').slice(0, 7).split('-').map(Number);
    if (!yy || !mm) return null;

    const lastDay = daysInMonth(yy, mm);
    const d = Math.min(Number(closingDay || 0), lastDay);
    if (!d) return null;

    return new Date(yy, mm - 1, d, 0, 0, 0, 0);
  }

  function isClosedForMonth(selectedMonth, closingDay) {
    const closingDate = buildClosingDate(selectedMonth, closingDay);
    if (!closingDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= closingDate;
  }

  function canShowPayInvoiceButton(a, selectedMonth) {
    const isCard = String(a?.type || '').toLowerCase() === 'credit_card';
    if (!isCard) return false;

    const closingDay = a?.statement_close_day;
    if (!closingDay) return false;

    if (!isClosedForMonth(selectedMonth, closingDay)) return false;

    return Math.abs(Number(a?.balance || 0)) > 0.00001;
  }

  const bankAccounts = useMemo(
    () => (accounts || []).filter((x) => String(x.type || '').toLowerCase() !== 'credit_card'),
    [accounts],
  );

  const visibleAccounts = useMemo(() => {
    if (!accountId) return accounts || [];
    return (accounts || []).filter((a) => String(a.id) === String(accountId));
  }, [accounts, accountId]);

  // --------------------------
  // Modal pagar fatura (Dashboard)
  // --------------------------
  const [payInvoiceOpen, setPayInvoiceOpen] = useState(false);
  const [payCard, setPayCard] = useState(null);
  const [payInvoiceBankId, setPayInvoiceBankId] = useState('');
  const [payInvoiceDate, setPayInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [payInvoiceError, setPayInvoiceError] = useState('');

  const selectedBank = useMemo(() => {
    const id = Number(payInvoiceBankId);
    return (bankAccounts || []).find((b) => Number(b.id) === id) || null;
  }, [payInvoiceBankId, bankAccounts]);

  function openPayInvoiceModal(cardAccount) {
    if (!bankAccounts.length) {
      alert('Cadastre uma conta bancária para registrar o pagamento do cartão.');
      return;
    }
    setPayInvoiceError('');
    setPayCard(cardAccount);
    setPayInvoiceBankId(String(bankAccounts[0]?.id || ''));
    setPayInvoiceDate(new Date().toISOString().slice(0, 10));
    setPayInvoiceOpen(true);
  }

  function closePayInvoiceModal() {
    setPayInvoiceOpen(false);
    setPayCard(null);
    setPayInvoiceError('');
  }

  function confirmPayInvoice() {
    if (!payCard) return;

    const bankId = Number(payInvoiceBankId);
    if (!bankId || !bankAccounts.some((b) => Number(b.id) === bankId)) {
      setPayInvoiceError('Conta inválida.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payInvoiceDate || ''))) {
      setPayInvoiceError('Data inválida.');
      return;
    }

    const bank = bankAccounts.find((b) => Number(b.id) === bankId);
    const bankBalance = bank && bank.balance !== undefined ? Number(bank.balance || 0) : null;

    const cardDebt = Math.max(0, Math.abs(Number(payCard?.balance || 0)));
    if (bankBalance !== null && cardDebt > 0 && bankBalance + 1e-9 < cardDebt) {
      setPayInvoiceError(
        `Saldo insuficiente na conta "${bank?.name}". Disponível: ${formatBRL(bankBalance)}. Necessário aprox.: ${formatBRL(cardDebt)}.`
      );
      return;
    }

    setPayInvoiceError('');

    router.post(
      route('credit-cards.pay-invoice', payCard.id),
      {
        month: selectedMonth,
        paid_bank_account_id: bankId,
        paid_at: payInvoiceDate,
      },
      {
        preserveScroll: true,
        onSuccess: () => closePayInvoiceModal(),
        onError: (errors) => {
          const msg =
            (errors && (errors.message || errors.error || errors.paid_at || errors.paid_bank_account_id || errors.month)) ||
            'Não foi possível registrar o pagamento.';
          setPayInvoiceError(String(msg));
        },
      },
    );
  }

  function payInvoice(cardAccount) {
    openPayInvoiceModal(cardAccount);
  }

  return (
    <AuthenticatedLayout
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Visão geral do mês selecionado</p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {flash?.success && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">
                {flash.success}
              </div>
            )}
            {flash?.error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-900/25 dark:text-rose-200">
                {flash.error}
              </div>
            )}
          </div>
        </div>
      }
    >
      <Head title="Dashboard" />

      {payInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePayInvoiceModal} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-slate-100">Pagar fatura do cartão</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {payCard?.name} · {formatMonthPtBR(selectedMonth)}
                </div>
              </div>

              <button
                type="button"
                onClick={closePayInvoiceModal}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Conta pagadora
                </label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  value={payInvoiceBankId}
                  onChange={(e) => setPayInvoiceBankId(e.target.value)}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {selectedBank?.balance !== undefined && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Saldo disponível: <span className="font-semibold">{formatBRL(selectedBank.balance)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Data do pagamento
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  value={payInvoiceDate}
                  onChange={(e) => setPayInvoiceDate(e.target.value)}
                />
              </div>

              {payInvoiceError && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-900/25 dark:text-rose-200">
                  {payInvoiceError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePayInvoiceModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmPayInvoice}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Confirmar pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Filtros do dashboard</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Refine os dados exibidos no resumo e nos lançamentos do mês.
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveExtraFilters && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                    Filtros ativos
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Mês</label>
                    <input
                      type="month"
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={selectedMonth}
                      onChange={(e) => applyFilters({ month: (e.target.value || '').slice(0, 7) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Tipo</label>
                    <select
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={type}
                      onChange={(e) => applyFilters({ type: e.target.value })}
                    >
                      <option value="">Todos</option>
                      <option value="income">Receitas</option>
                      <option value="expense">Despesas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Categoria</label>
                    <select
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={categoryId}
                      onChange={(e) => applyFilters({ category_id: e.target.value })}
                    >
                      <option value="">Todas</option>
                      {(categories || []).map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Conta</label>
                    <select
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={accountId}
                      onChange={(e) => applyFilters({ account_id: e.target.value })}
                    >
                      <option value="">Todas</option>
                      {(accountsFilter || []).map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Parcelamento</label>
                    <select
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={installment}
                      onChange={(e) => applyFilters({ installment: e.target.value })}
                    >
                      <option value="">Todos</option>
                      <option value="only">Somente parcelados</option>
                      <option value="none">Somente à vista</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Status</label>
                    <select
                      className="mt-1 w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={status}
                      onChange={(e) => applyFilters({ status: e.target.value })}
                    >
                      <option value="">Todos</option>
                      <option value="open">Em aberto</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 xl:col-span-6">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">Busca</label>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Digite para buscar (descrição, conta, categoria...)"
                        className="w-full rounded-lg border-gray-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyFilters({ q: e.currentTarget.value });
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => applyFilters({ q })}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Buscar
                      </button>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href={route('transactions.index', {
                      month: selectedMonth,
                      type: type || undefined,
                      category_id: categoryId || undefined,
                      account_id: accountId || undefined,
                      installment: installment || undefined,
                      status: status || undefined,
                      q: q || undefined,
                    })}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    Ver lançamentos →
                  </Link>
                </div>
              </div>
            )}
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

          {/* toggle acumulado */}
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {showAccumulatedExpense ? 'Despesas acumuladas' : 'Receitas acumuladas'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={showAccumulatedExpense}
              onClick={() => setShowAccumulatedExpense((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition',
                showAccumulatedExpense ? 'bg-rose-500' : 'bg-emerald-600',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                  showAccumulatedExpense ? 'translate-x-5' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>

          {budgetsBadge?.total > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Metas do mês em atenção</div>
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
          <div className={['grid grid-cols-1 gap-4 items-stretch', 'md:grid-cols-5'].join(' ')}>
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

            <StatCard
              title={
                showAccumulatedExpense
                  ? 'Despesas acumuladas (até este mês)'
                  : 'Receitas acumuladas (até este mês)'
              }
              value={showAccumulatedExpense ? lifetimeExpense : lifetimeIncome}
              icon={showAccumulatedExpense ? 'expense' : 'wallet'}
              tone={showAccumulatedExpense ? 'red' : 'purple'}
              href={route('transactions.index', {
                month: selectedMonth,
                type: showAccumulatedExpense ? 'expense' : 'income',
              })}
            />
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

            {visibleAccounts?.length ? (
              <ul className="space-y-4">
                {visibleAccounts.map((a) => {
                  const isCard = String(a.type || '').toLowerCase() === 'credit_card';
                  const balanceValue = Number(a.balance || 0);

                  return (
                    <li
                      key={a.id}
                      className="rounded-2xl border border-gray-100 p-4 dark:border-slate-800"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4 lg:hidden">
                            <div className="min-w-0">
                              <div className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">
                                {a.name}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                {isCard ? 'Cartão de crédito' : 'Conta'}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div
                                className={[
                                  'text-2xl font-bold',
                                  balanceValue >= 0 ? 'text-gray-900 dark:text-slate-100' : 'text-rose-700 dark:text-rose-300',
                                ].join(' ')}
                              >
                                {formatBRL(balanceValue)}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-slate-400">
                                {isCard ? 'fatura/saldo' : 'saldo atual'}
                              </div>
                            </div>
                          </div>

                          <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-6">
                            <div className="min-w-0">
                              <div className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">
                                {a.name}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                {isCard ? 'Cartão de crédito' : 'Conta'}
                              </div>
                            </div>
                          </div>
                          {!isCard && (
                            
                            <div className="mt-4 flex flex-wrap gap-2">
                              <InfoPill label="Inicial" value={formatBRL(a.initial_balance || 0)} tone="gray" />
                              <InfoPill label="Entradas" value={formatBRL(a.income || 0)} tone="green" />
                              <InfoPill label="Saídas" value={formatBRL(a.expense || 0)} tone="red" />
                              <InfoPill label="Anterior" value={formatBRL(a.opening_balance || 0)} tone="gray" />
                            </div>
                          )}

                          {isCard && (
                            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
                              <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                                <InfoPill
                                  label="Fatura atual"
                                  value={formatBRL(a.invoice_amount || 0)}
                                  tone="violet"
                                />
                                <InfoPill
                                  label="Compras"
                                  value={String(Number(a.invoice_purchase_count || 0))}
                                  tone="gray"
                                />
                                <InfoPill
                                  label="Fatura anterior"
                                  value={formatBRL(a.previous_invoice_amount || 0)}
                                  tone="blue"
                                />
                                {a.credit_limit !== null && (
                                  <>
                                    <InfoPill
                                      label="Limite"
                                      value={formatBRL(a.credit_limit)}
                                      tone="sky"
                                    />
                                    <InfoPill
                                      label="Utilizado"
                                      value={formatBRL(a.used_limit || 0)}
                                      tone="amber"
                                    />
                                    <InfoPill
                                      label="Disponível"
                                      value={formatBRL(a.available_limit || 0)}
                                      tone="emerald"
                                    />
                                  </>
                                )}
                              </div>

                              {canShowPayInvoiceButton(a, selectedMonth) && (
                                <div className="mt-4">
                                  <button
                                    type="button"
                                    onClick={() => payInvoice(a)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-200 dark:hover:bg-emerald-900/35"
                                    title="Pagar fatura do cartão"
                                  >
                                    ✓ Pagar fatura
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="hidden shrink-0 text-right lg:block">
                          <div
                            className={[
                              'text-2xl font-bold',
                              balanceValue >= 0 ? 'text-gray-900 dark:text-slate-100' : 'text-rose-700 dark:text-rose-300',
                            ].join(' ')}
                          >
                            {formatBRL(balanceValue)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-slate-400">
                            {isCard ? 'fatura/saldo' : 'saldo atual'}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-slate-800 dark:bg-slate-800">
                <div>
                  {accountId
                    ? 'Nenhuma conta encontrada para o filtro selecionado.'
                    : 'Sem contas cadastradas.'}
                </div>

                {!accountId && (
                  <Link
                    href={route('accounts.index')}
                    className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  >
                    + Criar conta
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* grids de baixo */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* top categorias */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Top categorias (despesas)</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                  {monthLabel}
                </span>
              </div>

              {byCategory?.length ? (
                <ul className="space-y-3">
                  {byCategory.map((c) => {
                    const pctBar = Math.round((Number(c.total || 0) / maxCategory) * 100);
                    const share = totalByCategory ? Math.round((Number(c.total || 0) / totalByCategory) * 100) : 0;

                    return (
                      <li key={c.category_id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium text-gray-800 dark:text-slate-100">{c.name}</span>

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
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:bg-slate-900 dark:ring-slate-800 dark:text-slate-400">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Últimos lançamentos</h3>
                <Link
                  href={route('transactions.index', { month: selectedMonth })}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-500 dark:hover:text-emerald-600"
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

                            <div className="flex items-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                              <Link
                                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                                href={route('transactions.edit', t.id)}
                              >
                                Editar
                              </Link>
                              <button
                                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                                onClick={() => confirm('Excluir este lançamento?') && router.delete(route('transactions.destroy', t.id))}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className={[
                            'whitespace-nowrap text-right text-sm font-bold',
                            t.type === 'expense' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300',
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
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:bg-slate-900 dark:ring-slate-800 dark:text-slate-400">
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
 * tone: green | blue | purple | yellow | red | gray | amber | emerald | violet | sky
 */
function StatCard({ title, value, icon, tone = 'green', href, subLabel }) {
  const toneClasses = getPastelToneClasses(tone);

  const body = (
    <div className={['relative h-full rounded-2xl p-6 shadow-sm ring-1 transition', toneClasses.card, 'hover:shadow-md'].join(' ')}>
      <div className={['absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl ring-1', toneClasses.icon].join(' ')}>
        <Icon name={icon} size={18} />
      </div>

      <div className="mt-2">
        <div className={['text-sm font-semibold leading-5', toneClasses.title].join(' ')}>
          <span className="block line-clamp-2 min-h-[40px]">{title}</span>
        </div>

        <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-slate-100">{formatBRL(value || 0)}</div>

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

function InfoPill({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-200',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
  };

  return (
    <div className={`rounded-xl px-3 py-2 ${tones[tone] || tones.gray}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-bold break-words">{value}</div>
    </div>
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
        <path d="M17 15h4V9h-4c-2 0-3 1.5-3 3s1 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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