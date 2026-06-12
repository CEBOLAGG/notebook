'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

/**
 * Item da navegação lateral com ícone + label e ESTADO ATIVO claro
 * (fundo + peso), no padrão de ferramenta interna.
 */
export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: IconName;
  children: string;
}) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150 ${
        active
          ? 'bg-ink-100 font-semibold text-ink-900 dark:bg-ink-700/70 dark:text-white'
          : 'font-medium text-ink-600 hover:bg-ink-100/70 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-700/50 dark:hover:text-white'
      }`}
    >
      <Icon name={icon} className={`h-4 w-4 ${active ? 'text-brand-600 dark:text-brand-400' : 'opacity-60'}`} />
      {children}
    </Link>
  );
}
