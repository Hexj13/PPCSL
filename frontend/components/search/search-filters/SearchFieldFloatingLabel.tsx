import type { ReactNode } from 'react';

type SearchFieldFloatingLabelProps = {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  floating: boolean;
  htmlFor?: string;
};

export function SearchFieldFloatingLabel({
  label,
  icon,
  trailing,
  floating,
  htmlFor,
}: SearchFieldFloatingLabelProps) {
  const className = `search-field-floating-label ${floating ? 'is-floating' : ''}`;
  const content = (
    <>
      {!floating && icon ? (
        <span className="search-field-floating-icon shrink-0">{icon}</span>
      ) : null}
      <span className="truncate min-w-0">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className} title={label}>
        {content}
      </label>
    );
  }

  return (
    <span className={className} title={label}>
      {content}
    </span>
  );
}
