import type { ComponentProps } from 'react';

import { HomeHeroDescription } from './HomeHeroDescription';

export interface HomeHeroProps extends ComponentProps<'div'> {
  title: string;
  subtitle: string;
  subtitleBold: string;
  subtitle2: string;
  subtitle3: string;
  descriptionIntro?: string;
  descriptionDetails?: string;
  expandLabel?: string;
  collapseLabel?: string;
}

export function HomeHero({
  title,
  subtitle,
  subtitleBold,
  subtitle2,
  subtitle3,
  descriptionIntro,
  descriptionDetails,
  expandLabel,
  collapseLabel,
  className,
  ...props
}: HomeHeroProps) {
  const rootClassName = ['mb-6 md:mb-8', className].filter(Boolean).join(' ');
  const hasDescription =
    descriptionIntro !== undefined &&
    descriptionDetails !== undefined &&
    expandLabel !== undefined &&
    collapseLabel !== undefined;

  return (
    <div className={rootClassName} {...props}>
      <h1 className="text-[30px] font-extrabold mb-4 leading-tight text-primary-900">{title}</h1>
      <ul className="list-disc pl-5 text-base font-medium leading-relaxed tracking-wide text-primary-900 marker:text-primary-700">
        <li>
          <h2 className="text-base font-medium leading-relaxed tracking-wide text-primary-900">
            <span>{subtitle}</span>
            <span className="text-primary-500 font-bold"> {subtitle3}</span>
            <span>{subtitle2}</span>
            <span className="text-primary-500 font-bold">{subtitleBold}</span>
          </h2>
        </li>
        {hasDescription && (
          <li>
            <HomeHeroDescription
              descriptionIntro={descriptionIntro}
              descriptionDetails={descriptionDetails}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
            />
          </li>
        )}
      </ul>
    </div>
  );
}
