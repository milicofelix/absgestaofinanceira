import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
  const page = usePage();
  const user = page.props?.auth?.user ?? null; // ✅ evita crash quando não tiver auth
  const navBadge = page.props?.nav?.budgets_badge ?? null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('sidebarCollapsed') === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const navItems = useMemo(
    () => [
      { name: 'Dashboard', href: route('dashboard'), active: route().current('dashboard') },

      { name: 'Lançamentos', href: route('transactions.index'), active: route().current('transactions.*') },

      { name: 'Categorias', href: route('categories.index'), active: route().current('categories.*') },

      { name: 'Contas', href: route('accounts.index'), active: route().current('accounts.*') },

      {
        name: 'Transferências',
        href: route('transfers.create'),
        active: route().current('transfers.*') || route().current('transfer_contacts.*'),
        children: [
          { name: 'Nova transferência', href: route('transfers.create'), active: route().current('transfers.*') },
          { name: 'Contatos', href: route('transfer_contacts.index'), active: route().current('transfer_contacts.*') },
        ],
      },

      { name: 'Recorrências', href: route('recurrings.index'), active: route().current('recurrings.*') },

      {
        name: 'Metas',
        href: route('budgets.index'),
        active: route().current('budgets.*'),
        badge: navBadge?.total ? String(navBadge.total) : null,
        badgeTone: navBadge?.exceeded ? 'red' : navBadge?.warning ? 'yellow' : 'gray',
      },
    ],
    [navBadge],
  );

  // ✅ se por algum motivo renderizar sem user, não quebra (mas ideal é nunca usar layout nessas páginas)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900">Sessão não encontrada</div>
            <div className="mt-1 text-sm text-gray-600">
              Esta página requer autenticação. Volte e faça login.
            </div>
            <div className="mt-4">
              <Link
                href={route('login')}
                className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Ir para login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity sm:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={[
          'fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200 bg-white transition-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'sm:-translate-x-full' : 'sm:translate-x-0',
          'sm:block',
        ].join(' ')}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
          <Link href={route('dashboard')} className="inline-flex items-center gap-3">
            <img src="/images/abs_logo.png" alt="ABS Gestão Financeira" className="h-20 w-auto" />
          </Link>

          <button
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 sm:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Menu</div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              if (!hasChildren) {
                return (
                  <SidebarLink
                    key={item.name}
                    href={item.href}
                    active={item.active}
                    badge={item.badge}
                    badgeTone={item.badgeTone}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.name}
                  </SidebarLink>
                );
              }

              return (
                <SidebarGroup
                  key={item.name}
                  item={item}
                  open={openGroup === item.name}
                  onToggle={() => setOpenGroup((v) => (v === item.name ? null : item.name))}
                  onNavigate={() => setSidebarOpen(false)}
                />
              );
            })}
          </nav>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="px-2">
             {user && (
                <>
                  <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </>
              )}
            </div>

            <div className="mt-3 space-y-1">
              <SidebarLink href={route('profile.edit')} active={route().current('profile.edit')}>
                Perfil
              </SidebarLink>

              <Link
                href={route('logout')}
                method="post"
                as="button"
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                Sair
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className={sidebarCollapsed ? 'sm:pl-0' : 'sm:pl-72'}>
        {/* Top bar */}
        <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
                  aria-label="Abrir menu"
                >
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Desktop toggle sidebar */}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="hidden sm:inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
                  aria-label={sidebarCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
                  title={sidebarCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
                >
                  {sidebarCollapsed ? (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h7M4 12h7M4 18h7M15 6h5M15 12h5M15 18h5" />
                    </svg>
                  )}
                </button>

                {/* Title */}
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-gray-900">ABS Gestão Financeira</div>
                  <div className="text-xs text-gray-500">Controle de gastos</div>
                </div>
              </div>

              {/* Desktop quick action */}
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={route('transactions.create')}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Lançamento
                </Link>
              </div>

              {/* User dropdown */}
              <div className="flex items-center">
                <div className="relative">
                  <Dropdown>
                    <Dropdown.Trigger>
                      <span className="inline-flex rounded-md">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-semibold leading-4 text-gray-600 transition hover:text-gray-900 focus:outline-none"
                        >
                          {user.name}
                          <svg className="-me-0.5 ms-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </span>
                    </Dropdown.Trigger>

                    <Dropdown.Content>
                      <Dropdown.Link href={route('profile.edit')}>Perfil</Dropdown.Link>
                      <Dropdown.Link href={route('logout')} method="post" as="button">
                        Sair
                      </Dropdown.Link>
                    </Dropdown.Content>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile quick links */}
          <div className="border-t border-gray-100 px-4 py-2 sm:hidden">
            <div className="flex gap-3">
              <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                Dashboard
              </ResponsiveNavLink>

              <ResponsiveNavLink href={route('transactions.index')} active={route().current('transactions.*')}>
                Lançamentos
              </ResponsiveNavLink>

              <ResponsiveNavLink href={route('budgets.index')} active={route().current('budgets.*')}>
                Metas
              </ResponsiveNavLink>

              {/* Transferências dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup((v) => (v === '__top_transfers__' ? null : '__top_transfers__'))}
                  className={[
                    'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition',
                    route().current('transfers.*') || route().current('transfer_contacts.*')
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')}
                >
                  Transferências
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {openGroup === '__top_transfers__' && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl bg-white p-1 shadow-lg ring-1 ring-gray-200">
                    <Link
                      href={route('transfers.create')}
                      className={[
                        'block rounded-lg px-3 py-2 text-sm font-semibold transition',
                        route().current('transfers.*') ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      ].join(' ')}
                      onClick={() => setOpenGroup(null)}
                    >
                      Nova transferência
                    </Link>
                    <Link
                      href={route('transfer_contacts.index')}
                      className={[
                        'block rounded-lg px-3 py-2 text-sm font-semibold transition',
                        route().current('transfer_contacts.*') ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      ].join(' ')}
                      onClick={() => setOpenGroup(null)}
                    >
                      Contatos
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Header */}
        {header && (
          <header className="bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
          </header>
        )}

        <main>{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ href, active, children, onClick, badge, badgeTone = 'gray' }) {
  const badgeClass =
    badgeTone === 'red'
      ? 'bg-rose-100 text-rose-800 ring-rose-200'
      : badgeTone === 'yellow'
        ? 'bg-amber-100 text-amber-900 ring-amber-200'
        : 'bg-gray-100 text-gray-700 ring-gray-200';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
      ].join(' ')}
    >
      <span className="truncate">{children}</span>

      {badge ? (
        <span className={['inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-bold ring-1', badgeClass].join(' ')}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarGroup({ item, open, onToggle, onNavigate }) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className={[
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition',
          item.active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
        ].join(' ')}
        aria-expanded={open}
      >
        <span className="truncate">{item.name}</span>
        <svg className={['h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0'].join(' ')} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="ml-2 space-y-1 border-l border-gray-100 pl-2">
          {item.children.map((child) => (
            <Link
              key={child.name}
              href={child.href}
              onClick={() => {
                onNavigate?.();
              }}
              className={[
                'flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition',
                child.active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}
            >
              <span className="truncate">{child.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
