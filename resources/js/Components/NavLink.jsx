import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, className = '', children, ...props }) {
  return (
    <Link
      {...props}
      className={
        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-semibold leading-5 transition duration-150 ease-in-out focus:outline-none ' +
        (active
          ? 'border-emerald-500 text-gray-900 focus:border-emerald-700'
          : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 focus:border-gray-300 focus:text-gray-900') +
        ' ' +
        className
      }
    >
      {children}
    </Link>
  );
}
