// resources/js/Pages/Transactions/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateBR } from '@/utils/formatters';

export default function Index({ transactions, filters, categories, accounts }) {
  const [month, setMonth] = useState(filters.month || new Date().toISOString().slice(0, 7));
  const [type, setType] = useState(filters.type || '');
  const [categoryId, setCategoryId] = useState(filters.category_id || '');
  //const [accountId, setAccountId] = useState(filters.account_id || '');
  const [accountIds, setAccountIds] = useState(
    Array.isArray(filters.account_ids)
      ? filters.account_ids.map(String)
      : (filters.account_id ? [String(filters.account_id)] : [])
  );
  const [q, setQ] = useState(filters.q || '');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [installmentFilter, setInstallmentFilter] = useState(filters.installment || '');
  const [status, setStatus] = useState(filters.status || '');
  // --------------------------
  // Modal detalhes
  // --------------------------
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [details, setDetails] = useState(null); // { transaction, summary, installments }
  // -------------------------- 
  // Dropdown de contas
  // --------------------------
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
  }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAccountsLabel = useMemo(() => {
  if (!accountIds.length) return 'Todas';

    const selected = (accounts || []).filter((a) => accountIds.includes(String(a.id)));

    if (selected.length === 1) return selected[0].name;
    if (selected.length === 2) return selected.map((a) => a.name).join(', ');

    return `${selected.length} contas selecionadas`;
  }, [accountIds, accounts]);

  

  async function openDetails(t) {
    try {
      setDetailsError('');
      setDetailsLoading(true);
      setDetailsOpen(true);
      setDetails(null);

      const res = await fetch(route('transactions.show', t.id), {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });

      if (!res.ok) {
        throw new Error('Não foi possível carregar os detalhes.');
      }

      const data = await res.json();
      setDetails(data);
    } catch (e) {
      setDetailsError(String(e?.message || 'Erro ao carregar detalhes.'));
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetails(null);
    setDetailsError('');
    setDetailsLoading(false);
  }

  function compactCompetence(v) {
    if (!v) return '—';
    const [year, month] = String(v).split('-');
    if (!year || !month) return v;
    return `${month}/${String(year).slice(-2)}`;
  }

  // --------------------------
  // Modal pagamento cartão
  // --------------------------
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTx, setPayTx] = useState(null);
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!detailsOpen) return;
    if (!details?.summary?.is_installment) return;

    const t = setTimeout(() => {
      const el = document.querySelector('[data-current-installment="1"]');
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);

    return () => clearTimeout(t);
  }, [detailsOpen, details]);

  useEffect(() => {
    const someModalOpen = payModalOpen || detailsOpen;
    if (!someModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [payModalOpen, detailsOpen]);

  const queryParams = useMemo(
    () => ({
      month,
      type: type || undefined,
      category_id: categoryId || undefined,
      // account_id: accountId || undefined,
      account_ids: accountIds.length ? accountIds : undefined,
      q: q || undefined,
      installment: installmentFilter || undefined,
      status: status || undefined,
    }),
    // [month, type, categoryId, accountId, q, installmentFilter, status],
    [month, type, categoryId, accountIds, q, installmentFilter, status],

  );

  const bankAccounts = useMemo(
    () => (accounts || []).filter((a) => String(a.type || '').toLowerCase() !== 'credit_card'),
    [accounts],
  );

  const selectedBank = useMemo(() => {
    const id = Number(payBankId);
    return (bankAccounts || []).find((a) => Number(a.id) === id) || null;
  }, [payBankId, bankAccounts]);

  function openPayModal(t) {
    if (!bankAccounts.length) {
      alert('Cadastre uma conta bancária para registrar o pagamento do cartão.');
      return;
    }
    setPayError('');
    setPayTx(t);
    setPayBankId(String(bankAccounts[0]?.id || ''));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayModalOpen(true);
  }

  function closePayModal() {
    setPayModalOpen(false);
    setPayTx(null);
    setPayError('');
  }

  function confirmPay() {
    if (!payTx) return;

    const bankId = Number(payBankId);
    if (!bankId || !bankAccounts.some((a) => Number(a.id) === bankId)) {
      setPayError('Conta inválida.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payDate || ''))) {
      setPayError('Data inválida.');
      return;
    }

    // Pré-check de saldo (client-side) — depende de accounts ter "balance"
    const bank = bankAccounts.find((a) => Number(a.id) === bankId);
    const bankBalance = bank && bank.balance !== undefined ? Number(bank.balance || 0) : null;

    if (bankBalance !== null) {
      const required = Number(payTx.amount || 0);
      if (bankBalance + 1e-9 < required) {
        setPayError(`Saldo insuficiente na conta "${bank?.name}". Disponível: ${formatBRL(bankBalance)}.`);
        return;
      }
    }

    setPayError('');

    router.post(
      route('transactions.markPaid', payTx.id),
      {
        paid_bank_account_id: bankId,
        cleared_at: payDate,
      },
      {
        preserveScroll: true,
        onSuccess: () => closePayModal(),
        onError: (errors) => {
          const msg =
            (errors && (errors.message || errors.error || errors.cleared_at || errors.paid_bank_account_id)) ||
            'Não foi possível registrar o pagamento.';
          setPayError(String(msg));
        },
      },
    );
  }

  // --------------------------
  // filtros/export
  // --------------------------
  function exportFile() {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      params.set(k, String(v));
    });
    params.set('format', exportFormat);
    window.location.href = `${route('reports.transactions.export')}?${params.toString()}`;
  }

  function applyFilters() {
    router.get(route('transactions.index'), queryParams, {
      preserveState: true,
      replace: true,
    });
  }

  function clearFilters() {
    setType('');
    setCategoryId('');
    // setAccountId('');
    setAccountIds([]);
    setQ('');
    setInstallmentFilter('');
    setStatus('');
    router.get(route('transactions.index'), { month }, { preserveState: true, replace: true });
  }

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function markAsCleared(t) {
    if (t.is_cleared) return;

    const isCreditCardExpense =
      t.type === 'expense' && String(t.account?.type || '').toLowerCase() === 'credit_card';

    // caso NORMAL (banco / pix etc): atualiza o lançamento
    if (!isCreditCardExpense) {
      return router.put(route('transactions.update', t.id), { is_cleared: true }, { preserveScroll: true });
    }

    // CARTÃO: abre modal banco + data
    openPayModal(t);
  }

  // --------------------------
  // regra botão pagar (apenas após fechamento)
  // --------------------------
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

  function getAccountById(list, id) {
    return (list || []).find((a) => Number(a.id) === Number(id));
  }

  function canShowPayButton(t) {
    if (t.is_cleared) return false;
    if (String(t.type || '').toLowerCase() !== 'expense') return false;

    const accFromTx = t.account;
    const accFromList = getAccountById(accounts, t.account_id);

    const acc =
      accFromTx && (accFromTx.statement_close_day || accFromTx.closing_day) ? accFromTx : accFromList || accFromTx;

    if (!acc) return false;

    const isCreditCard = String(acc.type || '').toLowerCase() === 'credit_card';
    if (!isCreditCard) return false;

    const closingDay = acc.statement_close_day ?? acc.closing_day;
    if (!closingDay) return false;

    return isClosedForMonth(month, closingDay);
  }

  // --------------------------
  // UI rules: destaque / badge
  // --------------------------
  function rowTone(t) {
    if (!isInstallment(t)) return { row: '', cell: '', left: '', sticky: '' };

    const cell = 'bg-violet-50/70 dark:bg-violet-900/10';
    const row = 'hover:bg-violet-50/80 dark:hover:bg-violet-900/15';
    const left = 'border-l-4 border-violet-500 dark:border-violet-400';
    const sticky = 'bg-violet-50/70 dark:bg-violet-900/10';

    return { row, cell, left, sticky };
  }

  // --------------------------
  // ✅ AGRUPAMENTO (front-only)
  // --------------------------
  const data = transactions?.data || [];
  const normalRows = useMemo(() => data.filter((t) => !isInstallment(t)), [data]);
  const installmentRows = useMemo(() => data.filter((t) => isInstallment(t)), [data]);

  const showInstallmentHeader = installmentRows.length > 0; // mostra quando existir parcela
  const headerTitle = 'Compras parceladas';

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Lançamentos</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Receitas e despesas do período selecionado</p>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            href={route('transactions.create', {
              month: filters.month || undefined,
              type: filters.type || undefined,
              category_id: filters.category_id || undefined,
              // account_id: filters.account_id || undefined,
              // account_ids: filters.account_ids?.length ? filters.account_ids : undefined,
              account_id: filters.account_ids?.[0] || filters.account_id || undefined,
              q: filters.q || undefined,
              installment: filters.installment || undefined,
              status: filters.status || undefined,
            })}
            >
            + Novo lançamento
          </Link>
        </div>
      }
    >
      <Head title="Lançamentos" />

      {/* -------------------- MODAL PAGAMENTO CARTÃO -------------------- */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closePayModal} aria-hidden="true" />
            <div className="relative my-6 w-full max-w-md rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-slate-100">Pagar fatura do cartão</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {payTx?.account?.name || 'Cartão'} · Valor: {formatBRL(payTx?.amount || 0)}
                </div>
              </div>

              <button
                type="button"
                onClick={closePayModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-gray-500 hover:bg-gray-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Fechar"
                aria-label="Fechar modal"
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
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
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
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              {payError && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-900/25 dark:text-rose-200">
                  {payError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePayModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmPay}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Confirmar pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* -------------------------------------------------------------- */}

      {/* ✅ MODAL DETALHES */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} aria-hidden="true" />

          <div
            className="relative my-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 max-h-[85vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()} // ✅ evita fechar clicando dentro
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-slate-100">Detalhes</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {details?.transaction?.description || '—'}
                </div>
              </div>

            <button
              type="button"
              onClick={closeDetails}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-gray-500 hover:bg-gray-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Fechar"
              aria-label="Fechar modal"
            >
              ✕
            </button>
            </div>

            <div className="mt-4">
              {detailsLoading ? (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-950 dark:text-slate-300">
                  Carregando detalhes...
                </div>
              ) : detailsError ? (
                <div className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:bg-rose-900/25 dark:text-rose-200">
                  {detailsError}
                </div>
              ) : details ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <InfoBox label="Valor (lançamento)" value={formatBRL(details.transaction.amount)} />
                    <InfoBox label="Data" value={formatDateBR(details.transaction.date)} />
                    <InfoBox label="Compra" value={formatDateBR(details.transaction.purchase_date)} />
                    <InfoBox label="Competência" value={details.transaction.competence_month || '—'} />
                    <InfoBox label="Conta" value={details.transaction.account?.name || '—'} />
                    <InfoBox label="Categoria" value={details.transaction.category?.name || '—'} />
                  </div>

                  {details.summary?.is_installment && (
                    <div className="rounded-2xl bg-violet-50/60 p-4 ring-1 ring-violet-200 dark:bg-violet-900/10 dark:ring-violet-900/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-violet-900 dark:text-violet-200">Compra parcelada</div>
                        <div className="text-sm font-semibold text-violet-900/80 dark:text-violet-200/80">
                          Total da compra: {formatBRL(details.summary.total_amount || 0)}
                        </div>
                      </div>

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                         <thead className="text-xs uppercase text-violet-900/70 dark:text-violet-200/70">
                            <tr>
                              <th className="py-2 pr-3">Parcela</th>
                              <th className="py-2 pr-3">Data</th>
                              <th className="hidden py-2 pr-3 sm:table-cell">Competência</th>
                              <th className="hidden py-2 pr-3 sm:table-cell">Status</th>
                              <th className="py-2 pr-3 sm:hidden">Info</th>
                              <th className="py-2 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-violet-200/60 dark:divide-violet-900/30">
                            {(details.installments || []).map((p) => {
                            const currentN = Number(details?.transaction?.installment_number || 0);
                            const isCurrent = currentN && Number(p.installment_number) === currentN;

                            return (
                              <tr
                                key={p.id}
                                data-current-installment={isCurrent ? '1' : '0'}
                                className={[
                                  isCurrent
                                    ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-900/40'
                                    : '',
                                ].join(' ')}
                              >
                                <td className="py-2 pr-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {p.installment_number}/{details.summary.installments_count || '?'}
                                    </span>

                                    {isCurrent && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                                        Atual
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2 pr-3">{formatDateBR(p.date)}</td>
                                <td className="hidden py-2 pr-3 sm:table-cell">{p.competence_month || '—'}</td>

                                <td className="hidden py-2 pr-3 sm:table-cell">
                                  {p.is_cleared ? 'Paga' : 'Em aberto'}
                                </td>

                                <td className="py-2 pr-3 sm:hidden">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-violet-900 ring-1 ring-violet-200 dark:bg-slate-800 dark:text-violet-200 dark:ring-slate-700">
                                      <IconCalendarMini />
                                      {compactCompetence(p.competence_month)}
                                    </span>

                                    <span
                                      className={[
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                        p.is_cleared
                                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/40'
                                          : 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/35',
                                      ].join(' ')}
                                    >
                                      {p.is_cleared ? <IconCheckMini /> : <IconClockMini />}
                                      {p.is_cleared ? 'Paga' : 'Aberta'}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-2 text-right font-semibold">{formatBRL(p.amount)}</td>
                              </tr>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Filtros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Filtros</div>

              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <div className={`${filtersOpen ? 'block' : 'hidden'} mt-4 sm:block`}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-8 sm:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Mês
                  </label>
                  <input
                    type="month"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={month}
                    onChange={(e) => setMonth(normalizeMonth(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Tipo
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Categoria
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                 {/* Conta */}
                <div className="sm:col-span-2 relative" ref={accountDropdownRef}>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Conta
                  </label>

                  <button
                    type="button"
                    onClick={() => setAccountDropdownOpen((v) => !v)}
                    className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-gray-700 shadow-sm
                              focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <span className="truncate">{selectedAccountsLabel}</span>
                    <svg className="h-4 w-4 shrink-0 opacity-70" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                      <path d="M5 7l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {accountDropdownOpen && (
                    <div
                      className="absolute z-30 mt-2 w-full min-w-[260px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl
                                dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="max-h-64 overflow-y-auto">
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
                            checked={accountIds.length === 0}
                            onChange={() => setAccountIds([])}
                          />
                          <span className="text-sm text-gray-700 dark:text-slate-200">Todas as contas</span>
                        </label>

                        {(accounts || []).map((a) => {
                          const checked = accountIds.includes(String(a.id));

                          return (
                            <label
                              key={a.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
                                checked={checked}
                                onChange={() => {
                                  setAccountIds((prev) => {
                                    const id = String(a.id);
                                    return prev.includes(id)
                                      ? prev.filter((x) => x !== id)
                                      : [...prev, id];
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-700 dark:text-slate-200">{a.name}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-gray-100 px-2 pt-2 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAccountIds([])}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Limpar
                        </button>

                        <button
                          type="button"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Parcelamento
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={installmentFilter}
                    onChange={(e) => setInstallmentFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="only">Somente parcelados</option>
                    <option value="none">Somente normais</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Status
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="open">Em aberto</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Busca
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Descrição..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    Filtrar
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                  >
                    Limpar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
                  <select
                    className="w-full rounded-lg border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:w-48"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="csv">CSV</option>
                  </select>

                  <button
                    type="button"
                    onClick={exportFile}
                    className="w-full whitespace-nowrap rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 sm:w-auto"
                    title="Exportar com os filtros atuais"
                  >
                    Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ MOBILE: cards */}
          <div className="space-y-2 sm:hidden">
            {data.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <>
                {normalRows.map((t) => (
                  <MobileCard
                    key={t.id}
                    t={t}
                    month={month}
                    rowTone={rowTone}
                    markAsCleared={markAsCleared}
                    canShowPayButton={canShowPayButton}
                    onOpenDetails={openDetails}
                  />
                ))}

                {showInstallmentHeader && installmentRows.length > 0 && (
                  <div className="pt-2">
                    <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                      {headerTitle}
                    </div>
                  </div>
                )}

                {installmentRows.map((t) => (
                  <MobileCard
                    key={t.id}
                    t={t}
                    month={month}
                    rowTone={rowTone}
                    markAsCleared={markAsCleared}
                    canShowPayButton={canShowPayButton}
                    onOpenDetails={openDetails} 
                  />
                ))}
              </>
            )}
          </div>

          {/* ✅ DESKTOP: tabela */}
          <div className="hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-[940px] w-full table-fixed text-left text-sm">
                 <colgroup>
                  <col className="w-[110px]" />
                  <col className="w-[320px]" />
                  <col className="w-[130px]" />
                  <col className="w-[160px]" />
                  <col className="w-[130px]" />
                  <col className="w-[120px]" />
                  <col className="w-[170px]" />
                </colgroup>
                <thead className="border-b bg-gray-50 text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Data</th>
                    <th className="px-3 py-3 font-semibold">Descrição</th>
                    <th className="px-3 py-3 font-semibold">Categoria</th>
                    <th className="px-3 py-3 font-semibold">Conta</th>
                    <th className="px-3 py-3 font-semibold">Pagamento</th>
                    <th className="px-3 py-3 text-right font-semibold">Valor</th>
                    <th className="px-3 py-3 text-right font-semibold sticky right-0 z-10 bg-gray-50 dark:bg-slate-950 shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-gray-500 dark:text-slate-400" colSpan={7}>
                        Nenhum lançamento encontrado.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {normalRows.map((t) => (
                        <DesktopRow
                          key={t.id}
                          t={t}
                          month={month}
                          rowTone={rowTone}
                          markAsCleared={markAsCleared}
                          canShowPayButton={canShowPayButton}
                          onOpenDetails={openDetails}
                          accounts={accounts}
                        />
                      ))}

                      {showInstallmentHeader && installmentRows.length > 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600
                                      dark:bg-slate-950 dark:text-slate-300"
                          >
                            {headerTitle}
                          </td>
                        </tr>
                      )}

                      {installmentRows.map((t) => (
                        <DesktopRow
                          key={t.id}
                          t={t}
                          month={month}
                          rowTone={rowTone}
                          markAsCleared={markAsCleared}
                          canShowPayButton={canShowPayButton}
                          onOpenDetails={openDetails}
                          accounts={accounts}
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination links={transactions.links} />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ---------- helpers ---------- */

function isInstallment(t) {
  return !!t?.installment_id;
}

// ✅ "Novo": prioriza created_at (se existir), fallback para date
function isNewTx(t, hours = 24) {
  const now = new Date();

  // preferível: created_at vindo do Laravel (ISO)
  if (t?.purchase_date) {
    const created = new Date(t.purchase_date);
    if (!Number.isNaN(created.getTime())) {
      const diff = now.getTime() - created.getTime();
      return diff >= 0 && diff <= hours * 60 * 60 * 1000;
    }
  }

  // fallback (menos preciso): date como meia-noite local
  const base = t?.date ? new Date(`${t.date}T00:00:00`) : null;
  if (!base || Number.isNaN(base.getTime())) return false;
  const diffMs = now.getTime() - base.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/25 dark:text-violet-200 dark:ring-violet-900/40">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      Novo
    </span>
  );
}

function Pagination({ links }) {
  if (!links || links.length <= 3) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-wrap items-center justify-center gap-1 border-t bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {links.map((l, idx) => (
          <button
            key={idx}
            disabled={!l.url}
            onClick={() => l.url && router.get(l.url, {}, { preserveState: true, replace: true })}
            className={[
              'rounded px-3 py-1 text-sm font-semibold',
              l.active
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
              !l.url ? 'opacity-50' : '',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: l.label }}
          />
        ))}
      </div>
    </div>
  );
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function normalizeMonth(v) {
  if (!v) return new Date().toISOString().slice(0, 7);
  return v.slice(0, 7);
}

function getClearedLabel(transaction) {
  if (transaction.type === 'income') return transaction.is_cleared ? 'Recebida' : 'A receber';
  return transaction.is_cleared ? 'Paga' : 'Em aberto';
}

/* ---------- UI bits: payment/account/status + icons ---------- */

function PaymentIcon({ method, className = '' }) {
  const m = String(method || '').toLowerCase();
  if (m === 'pix') return <IconPix className={className} />;
  if (m === 'credit_card' || m === 'debit_card' || m === 'card') return <IconCard className={className} />;
  if (m === 'cash') return <IconCash className={className} />;
  if (m === 'transfer') return <IconTransfer className={className} />;
  return <IconDots className={className} />;
}

function PaymentLabel(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'pix') return 'Pix';
  if (m === 'credit_card') return 'Crédito';
  if (m === 'debit_card') return 'Débito';
  if (m === 'card') return 'Cartão';
  if (m === 'cash') return 'Dinheiro';
  if (m === 'transfer') return 'Transfer.';
  return 'Outro';
}

function AccountTypeIcon({ type, className = '' }) {
  const t = String(type || '').toLowerCase();
  if (t === 'credit_card') return <IconCard className={className} />;
  return <IconBank className={className} />;
}

function StatusBadge({ t }) {
  const label = getClearedLabel(t);
  const tone = t.is_cleared ? 'emerald' : t.type === 'income' ? 'sky' : 'amber';

  const toneCls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200 ring-emerald-200/60 dark:ring-emerald-900/40'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200 ring-sky-200/60 dark:ring-sky-900/40'
        : 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 ring-amber-200/60 dark:ring-amber-900/35';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${toneCls}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

/* ---------- MOBILE CARD (extraído p/ não duplicar lógica) ---------- */

function MobileCard({ t, month, rowTone, markAsCleared, canShowPayButton, onOpenDetails }) {
  const showNew = isNewTx(t, 24);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails?.(t)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenDetails?.(t)}
      className={[
        'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800',
        isInstallment(t) ? 'border-l-4 border-violet-500 dark:border-violet-400 bg-violet-50/60 dark:bg-violet-900/10' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              <PaymentIcon method={t.payment_method} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate font-semibold text-gray-900 dark:text-slate-100">
                  {t.description || <span className="text-gray-400 dark:text-slate-500">(sem descrição)</span>}
                </div>
                {showNew && <NewBadge />}
              </div>

              <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                {formatDateBR(t.purchase_date)} • {t.category?.name || '—'} •{' '}
                {t.payment_method === 'transfer' && t.transfer_label
                  ? t.transfer_label
                  : (t.account?.name || '—')}
              </div>

            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              <AccountTypeIcon type={t.account?.type} />
              <span className="truncate max-w-[180px]">{t.account?.name || '—'}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              <PaymentIcon method={t.payment_method} />
              {PaymentLabel(t.payment_method)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={[
                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                t.type === 'expense'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
              ].join(' ')}
            >
              {t.type === 'expense' ? 'Despesa' : 'Receita'}
            </span>

            {t.installment_id && (
              <span
                className={[
                  'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                  t.installment?.is_active
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
                ].join(' ')}
                title={t.installment?.is_active ? 'Parcelamento ativo' : 'Parcelamento cancelado'}
              >
                {t.installment_number}/{t.installment?.installments_count ?? '?'}
              </span>
            )}

            <StatusBadge t={t} />
            {t.payment_method === 'transfer' && t.transfer_label && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-200">
                {t.transfer_label}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div
            className={[
              'whitespace-nowrap text-sm font-bold',
              t.type === 'expense'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-emerald-700 dark:text-emerald-300',
            ].join(' ')}
          >
            {t.type === 'expense' ? '-' : '+'}
            {formatBRL(t.amount)}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Link
              onClick={(e) => e.stopPropagation()}
              href={route('transactions.edit', { transaction: t.id, month })}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Editar"
            >
              <IconEdit />
            </Link>

            {t.installment_id && t.installment_number === 1 && t.installment?.is_active && (
              <button
                className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
                title="Cancelar parcelamento"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm('Cancelar este parcelamento? As parcelas futuras não pagas serão removidas.')) return;
                  router.post(route('installments.cancel', t.installment_id));
                }}
              >
                <IconBlock />
              </button>
            )}

            {canShowPayButton(t) && (
              <button
                className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                title="Marcar como pago"
                onClick={(e) => {e.stopPropagation(); markAsCleared(t)}}
              >
                ✓
              </button>
            )}

            <button
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
              title="Excluir"
              onClick={(e) => { e.stopPropagation(); confirm('Excluir este lançamento?') && router.delete(route('transactions.destroy', t.id))}}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- DESKTOP ROW (extraído) ---------- */

function DesktopRow({ t, month, rowTone, markAsCleared, canShowPayButton, onOpenDetails }) {
  const tone = rowTone(t);
  const showNew = isNewTx(t, 24);

  return (
    <tr
      className={['transition-colors cursor-pointer', tone.row].join(' ')}
      onClick={() => onOpenDetails?.(t)}
    >
      <td className={['px-3 py-3 text-gray-700 dark:text-slate-200 whitespace-nowrap', tone.cell, tone.left].join(' ')}>
        {formatDateBR(t.date)}
      </td>

      <td className={['px-3 py-3', tone.cell].join(' ')}>
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
            <PaymentIcon method={t.payment_method} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate text-gray-900 dark:text-slate-100 font-semibold">
                {t.description || <span className="text-gray-400 dark:text-slate-500">(sem descrição)</span>}
              </div>
              {showNew && <NewBadge />}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  t.type === 'expense'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200',
                ].join(' ')}
              >
                {t.type === 'expense' ? 'Despesa' : 'Receita'}
              </span>

              {t.installment_id && (
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    t.installment?.is_active
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
                  ].join(' ')}
                  title={t.installment?.is_active ? 'Parcelamento ativo' : 'Parcelamento cancelado'}
                >
                  {t.installment_number}/{t.installment?.installments_count ?? '?'}
                </span>
              )}

              <StatusBadge t={t} />

              {t.purchase_date && t.purchase_date !== t.date && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Compra {formatDateBR(t.purchase_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className={['px-3 py-3 text-gray-700 dark:text-slate-200 truncate', tone.cell].join(' ')}>
        {t.category?.name || '—'}
      </td>

      <td className={['px-3 py-3', tone.cell].join(' ')}>
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
            <AccountTypeIcon type={t.account?.type} />
          </span>
          <span className="min-w-0 truncate">{t.account?.name || '—'}</span>
        </div>
      </td>

      <td className={['px-3 py-3', tone.cell].join(' ')}>
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
            <PaymentIcon method={t.payment_method} />
          </span>
          <span className="truncate font-semibold">{PaymentLabel(t.payment_method)}</span>
        </div>
      </td>

      <td
        className={[
          'px-3 py-3 text-right font-semibold whitespace-nowrap',
          tone.cell,
          t.type === 'expense'
            ? 'text-rose-600 dark:text-rose-300'
            : 'text-emerald-600 dark:text-emerald-300',
        ].join(' ')}
      >
        {formatBRL(t.amount)}
      </td>

      <td
        className={[
          'px-3 py-3 text-right sticky right-0',
          isInstallment(t) ? tone.sticky : 'bg-white dark:bg-slate-900',
          'shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]',
        ].join(' ')}
      >
        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Link
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            href={route('transactions.edit', { transaction: t.id, month })}
            title="Editar"
          >
            <IconEdit />
          </Link>

          {t.installment_id && t.installment_number === 1 && t.installment?.is_active && (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
              title="Cancelar parcelamento"
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm('Cancelar este parcelamento? As parcelas futuras não pagas serão removidas.')) return;
                router.post(route('installments.cancel', t.installment_id));
              }}
            >
              <IconBlock />
            </button>
          )}

          {canShowPayButton(t) && (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
              title="Pagar"
              onClick={(e) => {
                e.stopPropagation();
                markAsCleared(t);
              }}
            >
              ✓
            </button>
          )}

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30"
            title="Excluir"
            onClick={(e) => {
              e.stopPropagation();
              confirm('Excluir este lançamento?') &&
                router.delete(route('transactions.destroy', { transaction: t.id, month }));
            }}
          >
            <IconTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Inline SVGs ---------- */

function IconBase({ children, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconPix({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3l2.5 2.5L12 8 9.5 5.5 12 3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16l2.5 2.5L12 21l-2.5-2.5L12 16Z" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

function IconCard({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M3 7h18v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      <path d="M7 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconCash({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h16v10H4V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 11h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconTransfer({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M7 7h12l-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 7v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 17v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconBank({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9v10M10 9v10M14 9v10M18 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 9l9-5 9 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconDots({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </IconBase>
  );
}

function IconEdit({ className = '' }) {
  return (
    <IconBase className={className}>
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconTrash({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M6 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 7l1 14h6l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </IconBase>
  );
}

function IconBlock({ className = '' }) {
  return (
    <IconBase className={className}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function IconCalendarMini({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className}`} fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheckMini({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className}`} fill="none" aria-hidden="true">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClockMini({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className}`} fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}