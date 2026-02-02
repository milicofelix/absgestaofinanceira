import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
  const user = usePage().props.auth.user;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { name: 'Dashboard', href: route('dashboard'), active: route().current('dashboard') },
      { name: 'Lançamentos', href: route('transactions.index'), active: route().current('transactions.*') || route().current('transactions.index') },
      { name: 'Categorias', href: route('categories.index'), active: route().current('categories.*') || route().current('categories.index') },
      { name: 'Contas', href: route('accounts.index'), active: route().current('accounts.*') || route().current('accounts.index') },
    ],
    [],
  );

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
        className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200 bg-white transition-transform sm:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
          <Link href={route('dashboard')} className="inline-flex items-center gap-3">
            <img
              src="/images/abs_logo.png"
              alt="ABS Gestão Financeira"
              className="h-20 w-auto"
            />
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
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarLink key={item.name} href={item.href} active={item.active}>
                {item.name}
              </SidebarLink>
            ))}
          </nav>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="px-2">
              <div className="text-sm font-semibold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
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
      <div className="sm:pl-72">
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
                  + Lançamento
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
            </div>
          </div>
        </nav>

        {/* Header (page title area) */}
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

function SidebarLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition',
        active
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
      ].join(' ')}
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}
