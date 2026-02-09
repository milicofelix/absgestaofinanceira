import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import MoneyInput from '@/Components/MoneyInput';
import { useEffect, useMemo } from 'react';

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
    first_due_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (mode === 'edit') {
      setData('is_cleared', !!transaction?.is_cleared);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, transaction?.id]);


  const blocked = categories.length === 0 || accounts.length === 0;

  const filteredCategories = useMemo(() => {
    return (categories || []).filter((c) => c.type === data.type);
  }, [categories, data.type]);

  const canInstallment = isCreate && data.type === 'expense';

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

  function submit(e) {
    e.preventDefault();

    // ✅ segurança extra: se já está travado, não envia
    if (formDisabled) return;

    // EDIT: mantém fluxo normal
    if (mode !== 'create') {
      return put(route('transactions.update', transaction.id));
    }

    // CREATE: se parcelado -> installments.store
    if (canInstallment && data.is_installment) {
      return post(route('installments.store'), {
        preserveScroll: true,
        onError: () => {},
      });
    }

    // CREATE normal
    return post(route('transactions.store'));
  }

  function onChangeType(nextType) {
    // ✅ segurança extra
    if (formDisabled) return;

    setData('type', nextType);

    const current = categories.find((c) => String(c.id) === String(data.category_id));
    if (!current || current.type !== nextType) {
      const first = categories.find((c) => c.type === nextType);
      setData('category_id', first ? String(first.id) : '');
    }

    // ✅ se mudou para receita, desliga parcelamento
    if (nextType !== 'expense') {
      setData('is_installment', false);
    }
  }

  const typeBadge =
    data.type === 'income'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-700';

  // ✅ payload para installments.store (reaproveita campos)
  const installmentPayload = useMemo(() => {
    return {
      account_id: data.account_id,
      category_id: data.category_id || null,
      description: data.description,
      total_amount: data.amount,
      installments_count: data.installments_count,
      first_due_date: data.first_due_date,
    };
  }, [data.account_id, data.category_id, data.description, data.amount, data.installments_count, data.first_due_date]);

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'}
          </h2>
          <p className="text-sm text-gray-500">
            Registre uma {data.type === 'income' ? 'receita' : 'despesa'} com conta e categoria
          </p>
        </div>
      }
    >
      <Head title={mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'} />

      <div className="py-8">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {blocked && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold">Atenção</div>
                <div className="mt-1 text-amber-800">
                  Para lançar, cadastre ao menos <b>1 categoria</b> e <b>1 conta</b>.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={route('categories.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    + Criar categoria
                  </Link>
                  <Link
                    href={route('accounts.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    + Criar conta
                  </Link>
                </div>
              </div>
            )}

            {isClearedLocked && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="font-semibold">Lançamento {lockTitle}</div>
                <div className="mt-1 text-emerald-800">{lockText}</div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                // ✅ se for parcelado, antes de enviar, ajusta o data pra bater com installments.store
                if (!formDisabled && mode === 'create' && canInstallment && data.is_installment) {
                  setData((prev) => ({
                    ...prev,
                    ...installmentPayload,
                  }));
                }
                submit(e);
              }}
              className="space-y-5"
            >
              {/* Tipo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Tipo</label>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${typeBadge}`}>
                    {data.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>

                <select
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.type}
                  onChange={(e) => onChangeType(e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>

                {errors.type && <div className="mt-1 text-sm text-rose-600">{errors.type}</div>}
              </div>

              {/* ✅ Parcelamento (somente create + expense) */}
              {canInstallment && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Parcelar compra</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Gere automaticamente as parcelas futuras (ex.: 12x).
                      </div>
                    </div>

                    <input
                      disabled={formDisabled}
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-70"
                      checked={!!data.is_installment}
                      onChange={(e) => !formDisabled && setData('is_installment', e.target.checked)}
                    />
                  </div>

                  {data.is_installment && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">Qtd parcelas</label>
                        <input
                          disabled={formDisabled}
                          type="number"
                          min="2"
                          max="60"
                          step="1"
                          className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                          value={data.installments_count}
                          onChange={(e) => !formDisabled && setData('installments_count', e.target.value)}
                        />
                        {errors.installments_count && (
                          <div className="mt-1 text-sm text-rose-600">{errors.installments_count}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">1º vencimento</label>
                        <input
                          disabled={formDisabled}
                          type="date"
                          className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                          value={data.first_due_date}
                          onChange={(e) => !formDisabled && setData('first_due_date', e.target.value)}
                        />
                        {errors.first_due_date && (
                          <div className="mt-1 text-sm text-rose-600">{errors.first_due_date}</div>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-200">
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
                  <label className="block text-sm font-semibold text-gray-700">
                    {canInstallment && data.is_installment ? 'Valor total' : 'Valor'}
                  </label>

                  {/* ✅ trava MoneyInput com wrapper (evita bug no carregamento) */}
                  <div className={['mt-1', formDisabled ? 'pointer-events-none opacity-70' : ''].join(' ')}>
                    <MoneyInput
                      value={data.amount}
                      onValueChange={(normalized) => !formDisabled && setData('amount', normalized)}
                      placeholder="0,00"
                      prefix="R$"
                    />
                  </div>

                  {errors.amount && <div className="mt-1 text-sm text-rose-600">{errors.amount}</div>}
                  {errors.total_amount && <div className="mt-1 text-sm text-rose-600">{errors.total_amount}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    {canInstallment && data.is_installment ? 'Data (opcional)' : 'Data'}
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.date}
                    onChange={(e) => !formDisabled && setData('date', e.target.value)}
                    disabled={formDisabled || (canInstallment && data.is_installment)}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    {canInstallment && data.is_installment
                      ? 'Ao parcelar, a data usada é o 1º vencimento.'
                      : 'Data do lançamento.'}
                  </div>
                  {errors.date && <div className="mt-1 text-sm text-rose-600">{errors.date}</div>}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Descrição</label>
                <input
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  placeholder="Ex: Mercado, aluguel, salário..."
                  value={data.description}
                  onChange={(e) => !formDisabled && setData('description', e.target.value)}
                />
                {errors.description && <div className="mt-1 text-sm text-rose-600">{errors.description}</div>}
              </div>

              {/* Categoria + Conta */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Categoria</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.category_id}
                    onChange={(e) => !formDisabled && setData('category_id', e.target.value)}
                    disabled={formDisabled || categories.length === 0}
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
                  {errors.category_id && <div className="mt-1 text-sm text-rose-600">{errors.category_id}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Conta</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.account_id}
                    onChange={(e) => !formDisabled && setData('account_id', e.target.value)}
                    disabled={formDisabled || accounts.length === 0}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.account_id && <div className="mt-1 text-sm text-rose-600">{errors.account_id}</div>}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Forma de pagamento</label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.payment_method}
                  onChange={(e) => !formDisabled && setData('payment_method', e.target.value)}
                  disabled={formDisabled || (canInstallment && data.is_installment)}
                >
                  <option value="pix">Pix</option>
                  <option value="card">Cartão</option>
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>

                {canInstallment && data.is_installment && (
                  <div className="mt-1 text-xs text-gray-500">
                    Ao parcelar, a forma de pagamento pode ser tratada depois (se quiser, podemos gravar no installment também).
                  </div>
                )}
              </div>

              {/* ✅ Pago/Recebido (somente edit) - separado */}
              {mode === 'edit' && (
                <label
                  className={[
                    'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
                    isClearedLocked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50',
                  ].join(' ')}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {data.type === 'income' ? 'Recebido' : 'Pago'}
                    </div>

                    <div className="text-xs text-gray-600">
                      {isClearedLocked ? clearedHint : 'Marque quando este lançamento estiver quitado.'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isClearedLocked && (
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {clearedLabel}
                      </span>
                    )}

                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-70"
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
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing || formDisabled}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Dica: use categorias separadas para despesas e receitas — fica bem melhor no dashboard.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
