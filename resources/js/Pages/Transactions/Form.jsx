import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import MoneyInput from '@/Components/MoneyInput';
import { useEffect, useMemo, useRef } from 'react';
import Checkbox from '@/Components/Checkbox';

export default function Form({ mode, transaction, categories, accounts }) {
  const isCreate = mode === 'create';

  const { data, setData, post, put, processing, errors } = useForm({
    // lançamento normal
    type: transaction?.type ?? 'expense',
    amount: transaction?.amount ?? '', // normalizado: "1234.56"
    date: transaction?.date ?? new Date().toISOString().slice(0, 10),
    description: transaction?.description ?? '',
    category_id: transaction?.category_id ?? (categories?.[0]?.id ?? ''),
    account_id: transaction?.account_id ?? (accounts?.[0]?.id ?? ''),
    payment_method: transaction?.payment_method ?? 'pix',
    is_cleared: transaction?.is_cleared ?? false,

    // ✅ parcelamento (somente create/expense)
    is_installment: false,
    installments_count: 12,
    first_due_date: new Date().toISOString().slice(0, 10), // não enviado no parcelado
  });

  // ✅ sync no edit
  useEffect(() => {
    if (mode === 'edit') setData('is_cleared', !!transaction?.is_cleared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, transaction?.id]);

  const blocked = (categories?.length ?? 0) === 0 || (accounts?.length ?? 0) === 0;

  const filteredCategories = useMemo(() => {
    return (categories || []).filter((c) => c.type === data.type);
  }, [categories, data.type]);

  const canInstallment = isCreate && data.type === 'expense';
 

  // guarda a última conta NÃO-cartão selecionada, pra voltar quando desmarcar parcelado
  const lastNonCCAccountIdRef = useRef(null);

  // sempre que a conta atual for não-cartão, salva ela como "última normal"
  useEffect(() => {
    const acc = (accounts || []).find((a) => String(a.id) === String(data.account_id));
    if (acc && acc.type !== 'credit_card') {
      lastNonCCAccountIdRef.current = String(acc.id);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [data.account_id, accounts?.length]);

  // ✅ listas de contas
  const creditCardAccounts = useMemo(() => {
      return (accounts || []).filter((a) => a.type === 'credit_card');
  }, [accounts]);

  // ✅ conta selecionada (para mostrar fechamento do cartão)
  const selectedAccount = useMemo(() => {
    return (accounts || []).find((a) => String(a.id) === String(data.account_id));
  }, [accounts, data.account_id]);

  const isCreditCard = (selectedAccount?.type ?? null) === 'credit_card';
  const closeDay = Number(selectedAccount?.statement_close_day || 0) || null;

  const isPayingWithCreditCard = data.payment_method === 'credit_card';
  const showInstallmentBox = canInstallment && isPayingWithCreditCard;

  // contas visíveis no combo "Conta"
  const visibleAccounts = useMemo(() => {
    if (isPayingWithCreditCard) return creditCardAccounts;
    return (accounts || []).filter((a) => a.type !== 'credit_card');
  }, [accounts, creditCardAccounts, isPayingWithCreditCard]);

  const clearedLabel = data.type === 'income' ? 'Recebida' : 'Paga';
  const clearedHint =
    data.type === 'income'
      ? 'Este lançamento já foi marcado como recebido e não pode ser alterado aqui.'
      : 'Este lançamento já foi marcado como pago e não pode ser alterado aqui.';

  // ✅ trava total no EDIT quando já quitado
  const isClearedLocked = mode === 'edit' && !!(transaction?.is_cleared ?? data.is_cleared);

  // ✅ se estiver bloqueado por falta de categoria/conta OU já quitado => trava tudo
  const formDisabled = blocked || isClearedLocked;

  const lockTitle = data.type === 'income' ? 'Recebido' : 'Pago';
  const lockText =
    data.type === 'income'
      ? 'Este lançamento já foi marcado como recebido. Para manter o histórico correto, a edição foi bloqueada.'
      : 'Este lançamento já foi marcado como pago. Para manter o histórico correto, a edição foi bloqueada.';

    // ✅ ao desmarcar parcelado: se estava num cartão, volta pra uma conta "normal"
    useEffect(() => {
      if (formDisabled) return;

      // Ligou "cartão de crédito" -> garante que account_id seja um cartão
      if (isPayingWithCreditCard) {
        const acc = (accounts || []).find((a) => String(a.id) === String(data.account_id));
        const currentIsCC = (acc?.type ?? null) === 'credit_card';

        if (!currentIsCC) {
          const firstCC = creditCardAccounts?.[0];
          if (firstCC) setData('account_id', String(firstCC.id));
        }
        return;
      }

      // Desligou "cartão de crédito" -> se estava em cartão, volta pra última conta normal
      const acc = (accounts || []).find((a) => String(a.id) === String(data.account_id));
      const currentIsCC = (acc?.type ?? null) === 'credit_card';

      if (currentIsCC) {
        const preferred = lastNonCCAccountIdRef.current;
        const existsPreferred =
          preferred && (accounts || []).some((a) => String(a.id) === String(preferred) && a.type !== 'credit_card');

        const fallbackNonCC = (accounts || []).find((a) => a.type !== 'credit_card');
        const nextId = existsPreferred ? preferred : (fallbackNonCC ? String(fallbackNonCC.id) : null);

        if (nextId) setData('account_id', nextId);
      }

      // ao sair do cartão, também desligamos parcelamento (não faz sentido manter)
      if (data.is_installment) setData('is_installment', false);

      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayingWithCreditCard, formDisabled, accounts?.length, creditCardAccounts?.length]);

  // ✅ ao marcar parcelado: força "credit_card" (porque parcelamento é só no crédito)
  useEffect(() => {
    if (formDisabled) return;

    if (canInstallment && data.is_installment) {
      setData('payment_method', 'credit_card');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInstallment, data.is_installment, formDisabled]);

  function submit(e) {
    e.preventDefault();
    if (formDisabled) return;

    // EDIT: mantém fluxo normal
    if (mode !== 'create') {
      return put(route('transactions.update', transaction.id));
    }

    // CREATE: parcelado -> installments.store
    if (canInstallment && data.is_installment) {
      const installmentPayload = {
        account_id: data.account_id,
        category_id: data.category_id || null,
        description: data.description,
        total_amount: data.amount,
        installments_count: data.installments_count,
        purchase_date: data.date,
        first_due_date: null, // backend calcula com statement_close_day
      };

      return router.post(route('installments.store'), installmentPayload, {
        preserveScroll: true,
        onError: () => {},
      });
    }

    // CREATE normal
    return post(route('transactions.store'));
  }

  function onChangeType(nextType) {
    if (formDisabled) return;

    setData('type', nextType);

    const current = (categories || []).find((c) => String(c.id) === String(data.category_id));
    if (!current || current.type !== nextType) {
      const first = (categories || []).find((c) => c.type === nextType);
      setData('category_id', first ? String(first.id) : '');
    }

    // ✅ se mudou para receita, desliga parcelamento
    if (nextType !== 'expense') {
      setData('is_installment', false);
    }
  }

  const typeBadge =
    data.type === 'income'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200';

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Registre uma {data.type === 'income' ? 'receita' : 'despesa'} com conta e categoria
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            {blocked && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="font-semibold">Atenção</div>
                <div className="mt-1 text-amber-800 dark:text-amber-200/90">
                  Para lançar, cadastre ao menos <b>1 categoria</b> e <b>1 conta</b>.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={route('categories.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-slate-950 dark:text-amber-200 dark:ring-amber-900/40 dark:hover:bg-slate-800"
                  >
                    + Criar categoria
                  </Link>
                  <Link
                    href={route('accounts.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-slate-950 dark:text-amber-200 dark:ring-amber-900/40 dark:hover:bg-slate-800"
                  >
                    + Criar conta
                  </Link>
                </div>
              </div>
            )}

            {isClearedLocked && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                <div className="font-semibold">Lançamento {lockTitle}</div>
                <div className="mt-1 text-emerald-800 dark:text-emerald-200/90">{lockText}</div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              {/* Tipo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Tipo</label>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${typeBadge}`}>
                    {data.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>

                <select
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                  value={data.type}
                  onChange={(e) => onChangeType(e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>

                {errors.type && <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.type}</div>}
              </div>

               {/* ✅ Toggle: pagar com cartão de crédito */}
              {isCreate && data.type === 'expense' && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Pagar com cartão de crédito</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Se marcado, a conta deve ser um cartão. Você pode escolher “à vista” ou “parcelado”.
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={formDisabled}
                      role="switch"
                      aria-checked={isPayingWithCreditCard}
                      onClick={() => {
                        if (formDisabled) return;
                        setData('payment_method', isPayingWithCreditCard ? 'pix' : 'credit_card');
                      }}
                      className={[
                        'relative inline-flex h-7 w-12 items-center rounded-full transition',
                        formDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                        isPayingWithCreditCard ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                          isPayingWithCreditCard ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* ✅ Parcelamento (somente create + expense) */}
              {canInstallment && isPayingWithCreditCard && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Parcelar compra</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Gere automaticamente as parcelas futuras (ex.: 12x).
                      </div>
                    </div>

                    <Checkbox
                      disabled={formDisabled}
                      className="mt-1"
                      checked={!!data.is_installment}
                      onChange={(e) => !formDisabled && setData('is_installment', e.target.checked)}
                    />
                  </div>

                  {data.is_installment && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                          Qtd parcelas
                        </label>
                        <input
                          disabled={formDisabled}
                          type="number"
                          min="2"
                          max="60"
                          step="1"
                          className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900"
                          value={data.installments_count}
                          onChange={(e) => !formDisabled && setData('installments_count', Number(e.target.value))}
                        />
                        {errors.installments_count && (
                          <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.installments_count}</div>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-gray-700 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                          {isCreditCard && closeDay ? (
                            <>
                              Fechamento do cartão: <b>dia {closeDay}</b>. A <b>1ª parcela</b> será calculada
                              automaticamente com base na data da compra.
                            </>
                          ) : (
                            <>
                              A <b>1ª parcela</b> será calculada automaticamente (configure o fechamento na conta do cartão
                              para ficar certinho).
                            </>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
                          Observação: o valor total será dividido e a última parcela ajusta centavos automaticamente.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Valor + Data */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {canInstallment && data.is_installment ? 'Valor total' : 'Valor'}
                  </label>

                  <div className={['mt-1', formDisabled ? 'pointer-events-none opacity-70' : ''].join(' ')}>
                    <MoneyInput
                      value={data.amount}
                      onValueChange={(normalized) => !formDisabled && setData('amount', normalized)}
                      placeholder="0,00"
                      prefix="R$"
                    />
                  </div>

                  {errors.amount && <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.amount}</div>}
                  {errors.total_amount && (
                    <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.total_amount}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {canInstallment && data.is_installment ? 'Data da compra' : 'Data'}
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                    value={data.date}
                    onChange={(e) => !formDisabled && setData('date', e.target.value)}
                    disabled={formDisabled}
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {canInstallment && data.is_installment
                      ? 'Data da compra (usada para calcular a fatura do cartão).'
                      : 'Data do lançamento.'}
                  </div>

                  {errors.date && <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.date}</div>}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Descrição</label>
                <input
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                  placeholder="Ex: Mercado, aluguel, salário..."
                  value={data.description}
                  onChange={(e) => !formDisabled && setData('description', e.target.value)}
                />
                {errors.description && <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.description}</div>}
              </div>

              {/* Categoria + Conta */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Categoria */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Categoria</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                    value={data.category_id}
                    onChange={(e) => !formDisabled && setData('category_id', e.target.value)}
                    disabled={formDisabled || (filteredCategories?.length ?? 0) === 0}
                  >
                    {filteredCategories.length === 0 ? (
                      <option value="">(sem categorias para este tipo)</option>
                    ) : (
                      filteredCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>

                  {errors.category_id && (
                    <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.category_id}</div>
                  )}
                </div>

                {/* Conta */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Conta</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                    value={data.account_id}
                    onChange={(e) => !formDisabled && setData('account_id', e.target.value)}
                    disabled={formDisabled || (visibleAccounts?.length ?? 0) === 0}
                  >
                    {visibleAccounts.length === 0 ? (
                      <option value="">
                        {(canInstallment && data.is_installment) || data.payment_method === 'credit_card'
                          ? '(cadastre uma conta do tipo cartão de crédito)'
                          : '(cadastre uma conta bancária)'}
                      </option>
                    ) : (
                      visibleAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    )}
                  </select>

                  {/* Hint “inteligente” */}
                  {((canInstallment && data.is_installment) || data.payment_method === 'credit_card') && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Mostrando apenas contas do tipo <b>cartão de crédito</b>.
                    </div>
                  )}

                  {errors.account_id && (
                    <div className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.account_id}</div>
                  )}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Forma de pagamento</label>

                {canInstallment && data.is_installment ? (
                  <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                    Cartão de crédito (automático)
                  </div>
                ) : isCreditCard ? (
                  <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                    Cartão de crédito (pela conta selecionada)
                  </div>
                ) : (
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                    value={data.payment_method}
                    onChange={(e) => !formDisabled && setData('payment_method', e.target.value)}
                    disabled={formDisabled}
                  >
                    <option value="pix">Pix</option>
                    <option value="debit_card">Cartão de débito</option>
                    <option value="cash">Dinheiro</option>
                    <option value="transfer">Transferência</option>
                    <option value="other">Outro</option>
                  </select>
                )}
              </div>

              {/* ✅ Pago/Recebido (somente edit) */}
              {mode === 'edit' && (
                <label
                  className={[
                    'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
                    isClearedLocked
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-950',
                  ].join(' ')}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {data.type === 'income' ? 'Recebido' : 'Pago'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-slate-400">
                      {isClearedLocked ? clearedHint : 'Marque quando este lançamento estiver quitado.'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isClearedLocked && (
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-200 dark:ring-emerald-900/40">
                        {clearedLabel}
                      </span>
                    )}

                    <Checkbox
                      checked={!!data.is_cleared}
                      disabled={isClearedLocked}
                      onChange={(e) => !isClearedLocked && setData('is_cleared', e.target.checked)}
                    />
                  </div>
                </label>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href={route('transactions.index')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing || formDisabled}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Dica: use categorias separadas para despesas e receitas — fica bem melhor no dashboard.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
