import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/images/abs_logo_light.png"
                alt="ABS Gestão Financeira"
                className="h-20 w-auto drop-shadow-sm"
              />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            {children}
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} ABS Gestão Financeira
          </div>
        </div>
      </div>
    </div>
  );
}
