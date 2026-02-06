import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import MoneyInput from '@/Components/MoneyInput';

export default function TransferForm({ accounts, defaultDate, defaultRecipientMode = 'self' }) {
  const { data, setData, post, processing, errors } = useForm({
    recipient_mode: defaultRecipientMode ?? 'self', // 'self' | 'other'
    recipient_user_id: '',
    from_account_id: accounts?.[0]?.id ?? '',
    to_account_id: accounts?.[1]?.id ?? (accounts?.[0]?.id ?? ''),
    amount: '',
    date: defaultDate,
    description: 'Transferência',
    note: '',
  });

  const blocked = !accounts || accounts.length < 2;

  // ---------- Autocomplete destinatário ----------
  const [recipientQ, setRecipientQ] = useState('');
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);

  // contas do destinatário (quando other)
  const [recipientAccounts, setRecipientAccounts] = useState([]);

  // opções do select "Para"
  const toAccountOptions = useMemo(() => {
    return data.recipient_mode === 'other' ? recipientAccounts : (accounts || []);
  }, [data.recipient_mode, recipientAccounts, accounts]);

  // limpar estado ao trocar modo
  useEffect(() => {
    if (data.recipient_mode === 'self') {
      setRecipientQ('');
      setRecipientOptions([]);
      setRecipientAccounts([]);

      // garante que to_account_id volte para uma conta do usuário (se possível)
      const fallback = accounts?.[1]?.id ?? accounts?.[0]?.id ?? '';
      setData('recipient_user_id', '');
      setData('to_account_id', fallback);
    } else {
      // modo other: limpa destino até escolher alguém
      setRecipientAccounts([]);
      setData('recipient_user_id', '');
      setData('to_account_id', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recipient_mode]);

  // debounce de busca de destinatário por email
  useEffect(() => {
    if (data.recipient_mode !== 'other') return;

    const term = recipientQ.trim();
    if (term.length < 2) {
      setRecipientOptions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setRecipientLoading(true);
        const res = await fetch(route('transfers.recipientSearch', { q: term }), {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        const json = await res.json();
        setRecipientOptions(json.recipients || []);
      } catch {
        setRecipientOptions([]);
      } finally {
        setRecipientLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [recipientQ, data.recipient_mode]);

  async function selectRecipient(u) {
    setData('recipient_user_id', u.id);
    setRecipientQ(u.email);
    setRecipientOptions([]);

    try {
      const res = await fetch(route('transfers.recipientAccounts', { recipient_user_id: u.id }), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const json = await res.json();
      const accs = json.accounts || [];
      setRecipientAccounts(accs);
      setData('to_account_id', accs?.[0]?.id ?? '');
    } catch {
      setRecipientAccounts([]);
      setData('to_account_id', '');
    }
  }

  // quando escolher destinatário, carrega contas (backup caso algo mude por fora)
  useEffect(() => {
    if (data.recipient_mode !== 'other' || !data.recipient_user_id) return;

    fetch(route('transfers.recipientAccounts', { recipient_user_id: data.recipient_user_id }), {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((r) => r.json())
      .then((json) => {
        const accs = json.accounts || [];
        setRecipientAccounts(accs);
        // se não existe mais a conta selecionada, seta a primeira
        if (!accs.some((a) => String(a.id) === String(data.to_account_id))) {
          setData('to_account_id', accs?.[0]?.id ?? '');
        }
      })
      .catch(() => {
        setRecipientAccounts([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recipient_mode, data.recipient_user_id]);

  // validações de UI
  const needsRecipient = data.recipient_mode === 'other';
  const missingRecipient = needsRecipient && !data.recipient_user_id;
  const missingToAccount = needsRecipient && !data.to_account_id;

  const uiBlocked = blocked || missingRecipient || missingToAccount;

  function submit(e) {
    e.preventDefault();
    post(route('transfers.store'));
  }

  return (
    <AuthenticatedLayout
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Transferência</h2>
          <p className="text-sm text-gray-500">Envie valor de uma conta para outra</p>
        </div>
      }
    >
      <Head title="Transferência" />

      <div className="py-8">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {blocked && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold">Atenção</div>
                <div className="mt-1 text-amber-800">
                  Você precisa ter pelo menos <b>2 contas</b> cadastradas para fazer transferência.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={route('accounts.create')}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    + Criar conta
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">De (conta origem)</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.from_account_id}
                    onChange={(e) => setData('from_account_id', e.target.value)}
                    disabled={blocked}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.from_account_id && <div className="mt-1 text-sm text-rose-600">{errors.from_account_id}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Para (conta destino)</label>
                  <select
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.to_account_id}
                    onChange={(e) => setData('to_account_id', e.target.value)}
                    disabled={blocked || (data.recipient_mode === 'other' && !data.recipient_user_id)}
                  >
                    <option value="">
                      {data.recipient_mode === 'other' && !data.recipient_user_id
                        ? '(selecione um destinatário)'
                        : '(selecione)'}
                    </option>

                    {toAccountOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        
                        {a.name}
                      
                      </option>
                    ))}
                  </select>
                  {errors.to_account_id && <div className="mt-1 text-sm text-rose-600">{errors.to_account_id}</div>}
                </div>
              </div>

              {/* valor + data */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Valor</label>

                  {/* ✅ agora fica idêntico aos inputs padrão */}
                  <div className="mt-1">
                    <MoneyInput
                      value={data.amount}
                      onValueChange={(normalized) => setData('amount', normalized)}
                      disabled={blocked}
                      placeholder="0,00"
                      prefix="R$"
                      inputClassName="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    />
                  </div>

                  {errors.amount && <div className="mt-1 text-sm text-rose-600">{errors.amount}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                    value={data.date}
                    onChange={(e) => setData('date', e.target.value)}
                    disabled={blocked}
                  />
                  {errors.date && <div className="mt-1 text-sm text-rose-600">{errors.date}</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Descrição (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  disabled={blocked}
                />
                {errors.description && <div className="mt-1 text-sm text-rose-600">{errors.description}</div>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Nota (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50"
                  value={data.note}
                  onChange={(e) => setData('note', e.target.value)}
                  disabled={blocked}
                />
                {errors.note && <div className="mt-1 text-sm text-rose-600">{errors.note}</div>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={route('transactions.index')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:underline"
                >
                  Voltar
                </Link>

                <button
                  disabled={processing || blocked}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  Transferir
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Dica: use a descrição para identificar a transferência (ex.: “BB → Nubank”).
          </div>

          {/* ajuda rápida */}
          {data.recipient_mode === 'other' && (
            <div className="mt-3 text-xs text-gray-500">
              Não achou o e-mail? Cadastre em <b>Contatos para transferência</b>.
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
