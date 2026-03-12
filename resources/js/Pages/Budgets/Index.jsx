import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MoneyInput from '@/Components/MoneyInput';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function Index({ filters, categories, budgets }) {
  const [month, setMonth] = useState(filters?.month || new Date().toISOString().slice(0, 7));

  const budgetByCategory = useMemo(() => {
    const map = new Map();
    (budgets || []).forEach((b) => map.set(String(b.category_id), b));
    return map;
  }, [budgets]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('default'); // default | override
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const selectedCategory = useMemo(() => {
    if (!editingCategoryId) return null;
    return (categories || []).find((c) => String(c.id) === String(editingCategoryId)) || null;
  }, [editingCategoryId, categories]);

  const selectedBudget = useMemo(() => {
    if (!editingCategoryId) return null;
    return budgetByCategory.get(String(editingCategoryId)) || null;
  }, [editingCategoryId, budgetByCategory]);

  const { data, setData, post, put, processing, errors, reset } = useForm({
    category_id: '',
    year: '',
    month: '',
    amount: '',
  });

  const { data: defaultData, setData: setDefaultData, post: postDefault, put: putDefault, processing: processingDefault, errors: defaultErrors, reset: resetDefault } = useForm({
    category_id: '',
    amount: '',
    month: '',
  });

  function normalizeMonth(v) {
    if (!v) return new Date().toISOString().slice(0, 7);
    return String(v).slice(0, 7);
  }

  function changeMonth(v) {
    const m = normalizeMonth(v);
    setMonth(m);
    router.get(route('budgets.index'), { month: m }, { preserveState: true, replace: true });
  }

  function openDefaultModal(categoryId) {
    const current = budgetByCategory.get(String(categoryId));
    setEditingCategoryId(String(categoryId));
    setModalMode('default');
    setModalOpen(true);

    setDefaultData({
      category_id: String(categoryId),
      amount: current?.default_amount ?? '',
      month,
    });
  }

  function openOverrideModal(categoryId) {
    const current = budgetByCategory.get(String(categoryId));
    const m = normalizeMonth(month);
    const [y, mo] = m.split('-');

    setEditingCategoryId(String(categoryId));
    setModalMode('override');
    setModalOpen(true);

    setData({
      category_id: String(categoryId),
      year: y,
      month: String(Number(mo)),
      amount: current?.override_amount ?? current?.amount ?? '',
    });
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCategoryId(null);
    setModalMode('default');
    reset();
    resetDefault();
  }

  function submitDefault(e) {
    e.preventDefault();
    if (!editingCategoryId) return;

    if (selectedBudget?.default_budget_id) {
      putDefault(route('budget-defaults.update', selectedBudget.default_budget_id), {
        preserveScroll: true,
        onSuccess: () => closeModal(),
      });
    } else {
      postDefault(route('budget-defaults.store'), {
        preserveScroll: true,
        onSuccess: () => closeModal(),
      });
    }
  }

  function submitOverride(e) {
    e.preventDefault();
    if (!editingCategoryId) return;

    if (selectedBudget?.id) {
      put(route('budgets.update', selectedBudget.id), {
        preserveScroll: true,
        onSuccess: () => closeModal(),
      });
    } else {
      post(route('budgets.store'), {
        preserveScroll: true,
        onSuccess: () => closeModal(),
      });
    }
  }

  function removeDefault(categoryId) {
    const b = budgetByCategory.get(String(categoryId));
    if (!b?.default_budget_id) return;

    if (!confirm('Remover a meta padrão desta categoria?')) return;

    router.delete(route('budget-defaults.destroy', b.default_budget_id), {
      data: { month },
      preserveScroll: true,
    });
  }

  function removeOverride(categoryId) {
    const b = budgetByCategory.get(String(categoryId));
    if (!b?.id) return;

    if (!confirm('Remover o ajuste deste mês?')) return;

    router.delete(route('budgets.destroy', b.id), { preserveScroll: true });
  }

  const monthLabel = useMemo(() => formatMonthPtBR(month), [month]);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Metas por categoria</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Defina uma meta padrão e ajuste apenas os meses que precisarem de um valor diferente.
            </p>
          </div>

          <Link
            href={route('transactions.index', { month })}
            className="hidden rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50
                       dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 sm:inline-flex"
          >
            Ver lançamentos →
          </Link>
        </div>
      }
    >
      <Head title="Metas por categoria" />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                <span className="font-semibold text-gray-700 dark:text-slate-200">Mês</span>
                <input
                  type="month"
                  className="rounded-lg border-gray-300 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500
                             dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={month}
                  onChange={(e) => changeMonth(e.target.value)}
                />
                <span className="hidden rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200
                                 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800 sm:inline-flex"
                >
                  {monthLabel}
                </span>
              </div>

              <Link
                href={route('transactions.index', { month })}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300 sm:hidden"
              >
                Ver lançamentos →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(categories || []).map((c) => {
              const b = budgetByCategory.get(String(c.id));
              const status = b?.status || 'none';
              const tone = getBudgetTone(status);
              const pct = clamp(Number(b?.percent || 0), 0, 999);

              return (
                <div
                  key={c.id}
                  className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{c.name}</div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    {b?.source === 'override' && 'Usando ajuste deste mês'}
                    {b?.source === 'default' && 'Usando meta padrão'}
                    {(!b || b?.source === 'none') && 'Sem meta definida'}
                  </div>

                  <div className="mt-3">
                    {b?.amount ? (
                      <div className="text-sm text-gray-600 dark:text-slate-300">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{formatBRL(b.spent)}</span> de{' '}
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{formatBRL(b.amount)}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        Defina uma meta padrão para esta categoria.
                      </div>
                    )}
                  </div>

                  {b?.source === 'override' && b?.default_amount && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                      Meta padrão: <span className="font-semibold">{formatBRL(b.default_amount)}</span>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400">
                      <span className={tone.text}>{b?.amount ? labelForStatus(status) : '—'}</span>
                      <span className="text-gray-500 dark:text-slate-400">{b?.amount ? `${pct}%` : ''}</span>
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                      <div
                        className={['h-2 rounded-full', tone.bar].join(' ')}
                        style={{ width: `${b?.amount ? Math.max(5, Math.min(100, pct)) : 0}%` }}
                        title={b?.amount ? `${pct}%` : ''}
                      />
                    </div>

                    {b?.amount && (
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>
                          Restante:{' '}
                          <span className="font-semibold text-gray-700 dark:text-slate-200">
                            {formatBRL(b.remaining)}
                          </span>
                        </span>

                        {status === 'exceeded' && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            Estourou
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openDefaultModal(c.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50
                                 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {b?.default_budget_id ? 'Editar padrão' : 'Definir padrão'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openOverrideModal(c.id)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100
                                 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                    >
                      {b?.id ? 'Editar ajuste do mês' : 'Ajustar este mês'}
                    </button>

                    {b?.default_budget_id && (
                      <button
                        type="button"
                        onClick={() => removeDefault(c.id)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100
                                   dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                      >
                        Remover padrão
                      </button>
                    )}

                    {b?.id && (
                      <button
                        type="button"
                        onClick={() => removeOverride(c.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100
                                   dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      >
                        Remover ajuste
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {(!categories || categories.length === 0) && (
              <div className="col-span-full rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                Você ainda não tem categorias de despesa. Crie uma categoria para definir metas.
                <div className="mt-3">
                  <Link
                    href={route('categories.create')}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    + Criar categoria
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && modalMode === 'default' && (
        <Modal onClose={closeModal} title={selectedBudget?.default_budget_id ? 'Editar meta padrão' : 'Definir meta padrão'}>
          <form onSubmit={submitDefault} className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Categoria</div>
              <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                {selectedCategory?.name || '—'}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Essa meta será usada automaticamente nos próximos meses, até você alterar.
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Valor padrão</label>
              <div className="mt-1">
                <MoneyInput
                  value={defaultData.amount}
                  onValueChange={(normalized) => setDefaultData('amount', normalized)}
                  placeholder="0,00"
                  prefix="R$"
                  inputClassName="dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
              {defaultErrors.amount && <div className="mt-1 text-sm text-rose-600 dark:text-rose-400">{defaultErrors.amount}</div>}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
              >
                Cancelar
              </button>

              <button
                disabled={processingDefault}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                Salvar padrão
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalOpen && modalMode === 'override' && (
        <Modal onClose={closeModal} title={selectedBudget?.id ? 'Editar ajuste do mês' : 'Ajustar este mês'}>
          <form onSubmit={submitOverride} className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Categoria</div>
              <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                {selectedCategory?.name || '—'}
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
              Esse valor vale apenas para o mês selecionado e substitui a meta padrão neste período.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Ano</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={data.year}
                  onChange={(e) => setData('year', e.target.value)}
                />
                {errors.year && <div className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.year}</div>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Mês</label>
                <select
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={data.month}
                  onChange={(e) => setData('month', e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                {errors.month && <div className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.month}</div>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Valor para este mês</label>
              <div className="mt-1">
                <MoneyInput
                  value={data.amount}
                  onValueChange={(normalized) => setData('amount', normalized)}
                  placeholder="0,00"
                  prefix="R$"
                  inputClassName="dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
              {errors.amount && <div className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.amount}</div>}
            </div>

            <input type="hidden" value={data.category_id} />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
              >
                Cancelar
              </button>

              <button
                disabled={processing}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                Salvar ajuste
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AuthenticatedLayout>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</div>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function formatBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMonthPtBR(value) {
  if (!value) return '';
  const [y, m] = String(value).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function labelForStatus(status) {
  if (status === 'exceeded') return 'Acima da meta';
  if (status === 'warning') return 'Quase no limite';
  if (status === 'ok') return 'Dentro da meta';
  return 'Sem meta';
}

function getBudgetTone(status) {
  if (status === 'exceeded') {
    return {
      text: 'text-rose-700 dark:text-rose-300',
      bar: 'bg-rose-500',
    };
  }

  if (status === 'warning') {
    return {
      text: 'text-amber-700 dark:text-amber-300',
      bar: 'bg-amber-500',
    };
  }

  if (status === 'ok') {
    return {
      text: 'text-emerald-700 dark:text-emerald-300',
      bar: 'bg-emerald-500',
    };
  }

  return {
    text: 'text-gray-500 dark:text-slate-400',
    bar: 'bg-gray-300 dark:bg-slate-700',
  };
}
