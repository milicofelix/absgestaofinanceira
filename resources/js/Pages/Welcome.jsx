import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth, isHome = false }) {
  return (
    <>
      <Head title="Financeito" />

      <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50 text-gray-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
        {/* Topbar */}
        <header className="border-b border-gray-100 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href={route('welcome')} className="flex items-center">
                {/* Se tiver logo dark, use 2 imagens. Se não tiver, mantém uma só */}
                <img
                  src="/images/abs_logo_dark.png"
                  alt="ABS Gestão Financeira"
                  className={`h-20 w-auto ${isHome ? 'drop-shadow' : ''}`}
                />
              </Link>

              <div className="leading-tight">
                <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">Financeito</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">Controle de gastos</div>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              {auth?.user ? (
                <Link
                  href={route('dashboard')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Ir para o Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href={route('login')}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Entrar
                  </Link>
                  <Link
                    href={route('register')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero */}
        <main className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Organize seu dinheiro sem planilha
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 lg:text-5xl">
                Controle de gastos simples,
                <span className="text-emerald-700 dark:text-emerald-300"> bonito</span> e rápido.
              </h1>

              <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-slate-300">
                Lance despesas e receitas, acompanhe o saldo por conta e visualize
                seus gastos por categoria. Tudo com login e segurança.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {auth?.user ? (
                  <>
                    <Link
                      href={route('transactions.create')}
                      className="rounded-lg bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      + Criar lançamento
                    </Link>
                    <Link
                      href={route('transactions.index')}
                      className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Ver lançamentos
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={route('register')}
                      className="rounded-lg bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Começar agora
                    </Link>
                    <Link
                      href={route('login')}
                      className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Já tenho conta
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-slate-400">
                <Badge>Dashboard por mês</Badge>
                <Badge>Saldo por conta</Badge>
                <Badge>Top categorias</Badge>
                <Badge>Transferências</Badge>
              </div>
            </div>

            {/* Card da direita */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Resumo do mês</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Visão rápida do Financeito</div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
                  Exemplo
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MiniCard title="Receitas" value="R$ 0,00" />
                <MiniCard title="Despesas" value="R$ 0,00" />
                <MiniCard title="Saldo" value="R$ 0,00" />
              </div>

              <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/50">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">Top categorias</div>
                <div className="mt-3 space-y-3">
                  <BarRow label="Alimentação" pct={70} />
                  <BarRow label="Transporte" pct={45} />
                  <BarRow label="Assinaturas" pct={25} />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                <div>
                  <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Pronto pra usar</div>
                  <div className="text-xs text-emerald-800/70 dark:text-emerald-200/70">
                    Categorias e conta padrão já vêm configuradas.
                  </div>
                </div>
                <div className="text-emerald-700 dark:text-emerald-200">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de benefícios */}
          <section className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature
              title="Rápido de lançar"
              desc="Adicionar despesas/receitas em segundos, com filtros e paginação."
              icon="⚡"
            />
            <Feature
              title="Organização por contas"
              desc="Acompanhe saldo por conta (banco, cartão, dinheiro) e transferências."
              icon="🏦"
            />
            <Feature
              title="Visão do mês"
              desc="Dashboard por mês com top categorias e últimos lançamentos."
              icon="📊"
            />
          </section>
        </main>

        <footer className="border-t border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500 dark:text-slate-400">
              © {new Date().getFullYear()} Financeito • Adriano F Freitas
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500">
              Feito com Laravel + Inertia + React
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      {children}
    </span>
  );
}

function MiniCard({ title, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">{title}</div>
      <div className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function BarRow({ label, pct }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-400">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-white dark:bg-slate-900">
        <div className="h-2 rounded bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Feature({ title, desc, icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg dark:bg-emerald-900/20">
          {icon}
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{desc}</p>
    </div>
  );
}