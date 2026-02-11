// resources/js/Pages/Recurrings/Form.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

function formatBRLInput(v) {
  // mantém string (não formata pra não atrapalhar digitação)
  return String(v ?? '');
}

export default function Form({ mode, recurring, accounts, categories }) {
  const isEdit = mode === 'edit';

  const { data, setData, post, put, processing, errors } = useForm({
    account_id: recurring?.account_id ?? '',
    category_id: recurring?.category_id ?? '',
    type: recurring?.type ?? 'expense',
    description: recurring?.description ?? '',
    amount: recurring?.amount ?? '',
    frequency: recurring?.frequency ?? 'monthly',
    interval: recurring?.interval ?? 1,
    start_date: recurring?.start_date ?? '',
    end_date: recurring?.end_date ?? '',
    next_run_date: recurring?.next_run_date ?? new Date().toISOString().slice(0, 10),
    auto_post: recurring?.auto_post ?? true,
    is_active: recurring?.is_active ?? true,
  });

  const filteredCategories = useMemo(() => {
    const t = data.type;
    return (categories || []).filter((c) => !c.type || c.type === t);
  }, [categories, data.type]);

  function submit(e) {
    e.preventDefault();
    if (isEdit) put(route('recurrings.update', recurring.id));
    else post(route('recurrings.store'));
  }

  const inputBase =
    'mt-1 w-full rounded-lg border shadow-sm text-sm focus:border-emerald-500 focus:ring-emerald-500 ' +
    'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 ' +
    'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';

  const labelBase = 'text-sm font-semibold text-gray-700 dark:text-slate-200';

  const errorText = (msg) =>
    msg ? <div className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{msg}</div> : null;

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-slate-100">
              {isEdit ? 'Editar recorrência' : 'Nova recorrência'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Defina lançamentos automáticos (mensal/anual)</p>
          </div>

          <Link
            href={route('recurrings.index')}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-300"
          >
            Voltar →
          </Link>
        </div>
      }
    >
      <Head title={isEdit ? 'Editar recorrência' : 'Nova recorrência'} />

      <div className="py-6 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={submit}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* tipo */}
              <div>
                <label className={labelBase}>Tipo</label>
                <select
                  className={inputBase}
                  value={data.type}
                  onChange={(e) => setData('type', e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                {errorText(errors.type)}
              </div>

              {/* valor */}
              <div>
                <label className={labelBase}>Valor</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={inputBase}
                  value={formatBRLInput(data.amount)}
                  onChange={(e) => setData('amount', e.target.value)}
                />
                {errorText(errors.amount)}
              </div>

              {/* conta */}
              <div>
                <label className={labelBase}>Conta</label>
                <select
                  className={inputBase}
                  value={data.account_id}
                  onChange={(e) => setData('account_id', e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {(accounts || []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {errorText(errors.account_id)}
              </div>

              {/* categoria */}
              <div>
                <label className={labelBase}>Categoria</label>
                <select
                  className={inputBase}
                  value={data.category_id || ''}
                  onChange={(e) => setData('category_id', e.target.value || '')}
                >
                  <option value="">—</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errorText(errors.category_id)}
              </div>

              {/* descrição */}
              <div className="sm:col-span-2">
                <label className={labelBase}>Descrição</label>
                <input
                  type="text"
                  className={inputBase}
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  placeholder="Ex.: Aluguel, Netflix, Salário..."
                />
                {errorText(errors.description)}
              </div>

              {/* frequência */}
              <div>
                <label className={labelBase}>Frequência</label>
                <select
                  className={inputBase}
                  value={data.frequency}
                  onChange={(e) => setData('frequency', e.target.value)}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
                {errorText(errors.frequency)}
              </div>

              {/* intervalo */}
              <div>
                <label className={labelBase}>Intervalo</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={inputBase}
                  value={data.interval}
                  onChange={(e) => setData('interval', e.target.value)}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">Ex.: 1 = todo mês / todo ano</div>
                {errorText(errors.interval)}
              </div>

              {/* próxima execução */}
              <div>
                <label className={labelBase}>Próximo lançamento</label>
                <input
                  type="date"
                  className={inputBase}
                  value={data.next_run_date}
                  onChange={(e) => setData('next_run_date', e.target.value)}
                />
                {errorText(errors.next_run_date)}
              </div>

              {/* início */}
              <div>
                <label className={labelBase}>Data de início (opcional)</label>
                <input
                  type="date"
                  className={inputBase}
                  value={data.start_date || ''}
                  onChange={(e) => setData('start_date', e.target.value)}
                />
                {errorText(errors.start_date)}
              </div>

              {/* fim */}
              <div>
                <label className={labelBase}>Data de fim (opcional)</label>
                <input
                  type="date"
                  className={inputBase}
                  value={data.end_date || ''}
                  onChange={(e) => setData('end_date', e.target.value)}
                />
                {errorText(errors.end_date)}
              </div>
            </div>

            {/* toggles */}
            <div className="mt-6 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Gerar automaticamente</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Se ligado, o sistema cria o lançamento sozinho no dia.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
                  checked={!!data.auto_post}
                  onChange={(e) => setData('auto_post', e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Ativa</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Se desligado, não gera lançamentos.</div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
                  checked={!!data.is_active}
                  onChange={(e) => setData('is_active', e.target.checked)}
                />
              </label>
            </div>

            {/* ações */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Link
                href={route('recurrings.index')}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={processing}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
              >
                {isEdit ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>

          {/* dica */}
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            Dica: para testar rapidamente, crie uma recorrência com <b className="text-gray-700 dark:text-slate-200">Próximo lançamento</b>{' '}
            hoje e rode{' '}
            <code className="rounded bg-white px-1 py-0.5 text-gray-800 dark:bg-slate-900 dark:text-slate-100 dark:ring-1 dark:ring-slate-800">
              php artisan recurring:post
            </code>
            .
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
