import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function Index({ contacts }) {
  const { data, setData, post, processing } = useForm({ contact_user_id: '' });

  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // debounce simples
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) { setOptions([]); return; }

      setLoading(true);
      const res = await fetch(route('transfer_contacts.userSearch', { q: term }), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const json = await res.json();
      setOptions(json.users || []);
      setLoading(false);
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  function selectUser(u) {
    setData('contact_user_id', u.id);
    setQ(u.email);
    setOptions([]);
  }

  function submit(e) {
    e.preventDefault();
    if (!data.contact_user_id) return;
    post(route('transfer_contacts.store'), { preserveScroll: true });
  }

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Contatos para transferência</h2>}>
      <Head title="Contatos" />

      <div className="py-8">
        <div className="mx-auto max-w-3xl sm:px-6 lg:px-8 space-y-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Adicionar contato por e-mail</label>

                <div className="relative mt-1">
                  <input
                    className="w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="Digite parte do e-mail…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setData('contact_user_id', '');
                    }}
                  />

                  {options.length > 0 && (
                    <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      {options.map((u) => (
                        <button
                          type="button"
                          key={u.id}
                          className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                          onClick={() => selectUser(u)}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{u.email}</div>
                            <div className="text-xs text-gray-500 truncate">{u.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {loading && (
                    <div className="mt-2 text-xs text-gray-400">Buscando…</div>
                  )}
                </div>
              </div>

              <button
                disabled={processing || !data.contact_user_id}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Adicionar
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900 mb-3">Meus contatos</div>

            {!contacts?.length ? (
              <div className="text-sm text-gray-500">Nenhum contato ainda.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{c.email}</div>
                      <div className="text-xs text-gray-500 truncate">{c.name}</div>
                    </div>

                    <button
                      className="text-sm font-semibold text-rose-600 hover:underline"
                      onClick={() => router.delete(route('transfer_contacts.destroy', c.id), { preserveScroll: true })}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
