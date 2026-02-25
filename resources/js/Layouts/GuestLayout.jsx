import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="inline-flex items-center">
              {/* opção simples: 2 imagens (uma some no dark) */}
              <img
                src="/images/abs_logo_light.png"
                alt="ABS Gestão Financeira"
                className="h-20 w-auto drop-shadow-sm dark:hidden"
              />
              <img
                src="/images/abs_logo_dark.png"
                alt="ABS Gestão Financeira"
                className="hidden h-20 w-auto drop-shadow-sm dark:block"
              />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-800">
            {children}
          </div>

          <div className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500">
            © {new Date().getFullYear()} ABS Gestão Financeira
          </div>
        </div>
      </div>
    </div>
  );
}