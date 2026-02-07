import MoneyInput from '@/Components/MoneyInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

 export default function Form({ mode, account }) {
   const { data, setData, post, put, processing, errors } = useForm({
     name: account?.name ?? '',
     type: account?.type ?? 'bank',
     initial_balance: account?.initial_balance ?? 0,
    statement_close_day: account?.statement_close_day ?? '', // ✅ NOVO
   });

  const isCreditCard = data.type === 'credit_card';

  const nameLabel = useMemo(() => {
    return isCreditCard ? 'Nome do cartão' : 'Nome da conta';
  }, [isCreditCard]);

  const namePlaceholder = useMemo(() => {
    if (isCreditCard) return 'Ex: Nubank Visa, Itaú Platinum, Inter Mastercard';
    if (data.type === 'cash') return 'Ex: Carteira, Dinheiro';
    return 'Ex: Itaú, Banco do Brasil, Nubank, Mercado Pago';
  }, [isCreditCard, data.type]);

   function submit(e) {
     e.preventDefault();
     if (mode === 'create') post(route('accounts.store'));
     else put(route('accounts.update', account.id));
   }

   return (
     <AuthenticatedLayout
       header={
         <div>
           <h2 className="text-xl font-semibold text-gray-900">
             {mode === 'create' ? 'Nova conta' : 'Editar conta'}
           </h2>
           <p className="text-sm text-gray-500">
            Informe os dados básicos {isCreditCard ? 'do cartão' : 'da conta'}
           </p>
         </div>
       }
     >
       <Head title={mode === 'create' ? 'Nova conta' : 'Editar conta'} />

       <div className="py-8">
         <div className="mx-auto max-w-xl sm:px-6 lg:px-8">
           <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
             <form onSubmit={submit} className="space-y-5">
              {/* Ajuda rápida */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-semibold">Dica</div>
                <div className="mt-1">
                  {isCreditCard ? (
                    <>
                      Cartão de crédito gera <b>fatura</b>. O <b>fechamento</b> define em qual mês a compra entra.
                    </>
                  ) : (
                    <>
                      Conta é onde seu dinheiro “fica” (banco/carteira). O saldo inicial é o valor com que você começa.
                    </>
                  )}
                </div>
              </div>

               {/* Nome */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700">
                  {nameLabel}
                 </label>
                 <input
                   type="text"
                   className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder={namePlaceholder}
                   value={data.name}
                   onChange={(e) => setData('name', e.target.value)}
                 />
                 {errors.name && (
                   <div className="mt-1 text-sm text-rose-600">{errors.name}</div>
                 )}
               </div>

               {/* Tipo */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700">
                   Tipo
                 </label>
                 <select
                   className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                   value={data.type}
                   onChange={(e) => {
                     const next = e.target.value;
                     setData('type', next);
                     // ✅ se trocar pra não-cartão, limpa fechamento
                     if (next !== 'credit_card') setData('statement_close_day', '');
                   }}
                 >
                  <option value="bank">Banco / Conta digital</option>
                  <option value="cash">Dinheiro (carteira)</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="other">Outro (saldo)</option>
                 </select>
                 {errors.type && (
                   <div className="mt-1 text-sm text-rose-600">{errors.type}</div>
                 )}
               </div>

               {/* Fechamento da fatura (apenas cartão) */}
               {data.type === 'credit_card' && (
                 <div>
                   <label className="block text-sm font-semibold text-gray-700">
                     Fechamento da fatura (dia)
                   </label>
                   <input
                     type="number"
                     min="1"
                     max="28"
                     className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                     placeholder="Ex: 25"
                     value={data.statement_close_day}
                     onChange={(e) => setData('statement_close_day', e.target.value)}
                   />
                   <p className="mt-1 text-xs text-gray-500">
                     Compras no dia do fechamento (ou depois) entram na fatura do mês seguinte.
                   </p>
                   {errors.statement_close_day && (
                     <div className="mt-1 text-sm text-rose-600">{errors.statement_close_day}</div>
                   )}
                 </div>
               )}

              {/* Saldo inicial (somente contas de saldo) */}
              {!isCreditCard && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Saldo inicial
                  </label>
                  <MoneyInput
                    value={data.initial_balance}
                    onChange={(value) => setData('initial_balance', value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Valor disponível no início do controle
                  </p>
                  {errors.initial_balance && (
                    <div className="mt-1 text-sm text-rose-600">
                      {errors.initial_balance}
                    </div>
                  )}
                </div>
              )}

              {/* Aviso para cartão */}
              {isCreditCard && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Observação</div>
                  <div className="mt-1 text-amber-800">
                    Para cartão, o “saldo” é a <b>fatura</b>. Por isso, o campo de saldo inicial não é usado aqui.
                  </div>
                </div>
              )}

               {/* Actions */}
               <div className="flex items-center justify-between pt-4">
                 <Link
                   href={route('accounts.index')}
                   className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline"
                 >
                   Voltar
                 </Link>

                 <button
                   disabled={processing}
                   className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                 >
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
