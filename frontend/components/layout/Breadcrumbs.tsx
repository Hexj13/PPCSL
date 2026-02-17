import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label={t('breadcrumbs.ariaLabel')}
    >
      <ol className="flex items-center space-x-2">
        {items.flatMap((item, index) => {
          const isLast = index === items.length - 1;
          const elements = [];

          if (index > 0) {
            elements.push(
              <li key={`separator-${index}`} className="flex items-center">
                <span className="text-text-secondary" aria-hidden="true">
                  /
                </span>
              </li>,
            );
          }

          elements.push(
            <li key={index} className="flex items-center">
              {isLast ? (
                <span className="text-primary-700 font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-primary-700 hover:text-primary-900 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-text-secondary">{item.label}</span>
              )}
            </li>,
          );

          return elements;
        })}
      </ol>
    </nav>
  );
}
