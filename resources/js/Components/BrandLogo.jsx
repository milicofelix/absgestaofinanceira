import { Link } from '@inertiajs/react';

export default function BrandLogo({ href = '/', size = 'md', showText = false, className = '' }) {
  const sizes = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-20',
  };

  return (
    <Link href={href} className={['inline-flex items-center gap-3', className].join(' ')}>
      <img
        src="/images/abs_logo.png"
        alt="ABS Gestão Financeira"
        className={[sizes[size] ?? sizes.md, 'w-auto'].join(' ')}
      />
      {showText && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-900">ABS Gestão Financeira</div>
          <div className="text-xs text-gray-500">Controle de gastos</div>
        </div>
      )}
    </Link>
  );
}
