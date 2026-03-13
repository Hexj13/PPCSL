import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: string;
  allowLastItemLink?: boolean;
  itemClassName?: string;
  secondaryItemClassName?: string;
  itemHoverClassName?: string;
}

const DEFAULT_SEPARATOR = ' / ';

const defaultLinkColor = 'text-primary-700';
const defaultSecondaryColor = 'text-text-secondary';

export function Breadcrumbs({
  items,
  className = '',
  separator = DEFAULT_SEPARATOR,
  allowLastItemLink = false,
  itemClassName,
  secondaryItemClassName,
  itemHoverClassName,
}: BreadcrumbsProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const linkColor = itemClassName ?? defaultLinkColor;
  const secondaryColor = secondaryItemClassName ?? defaultSecondaryColor;
  const linkHover = itemHoverClassName ?? 'hover-only:hover:text-primary-900';

  return (
    <nav
      className={`flex items-center flex-wrap gap-x-2 text-sm min-w-0 ${className}`}
      aria-label={t('breadcrumbs.ariaLabel')}
    >
      <ol className="flex items-center flex-wrap gap-x-2 min-w-0">
        {items.flatMap((item, index) => {
          const isLast = index === items.length - 1;
          const elements = [];

          if (index > 0) {
            elements.push(
              <li key={`separator-${index}`} className="flex items-center shrink-0">
                <span className={secondaryColor} aria-hidden="true">
                  {separator}
                </span>
              </li>,
            );
          }

          const href = item.href;
          const renderAsLink = href && (!isLast || allowLastItemLink);
          elements.push(
            <li key={index} className="flex items-center min-w-0">
              {renderAsLink && href ? (
                <Link
                  href={href}
                  className={`relative ${linkColor} ${linkHover} transition-colors duration-200 truncate block min-w-0 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover-only:hover:after:scale-x-100`}
                  {...(isLast && { 'aria-current': 'page' })}
                  onClick={item.onClick}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? `${linkColor} font-medium min-w-0 truncate block` : secondaryColor
                  }
                  {...(isLast && { 'aria-current': 'page' })}
                >
                  {item.label}
                </span>
              )}
            </li>,
          );

          return elements;
        })}
      </ol>
    </nav>
  );
}
