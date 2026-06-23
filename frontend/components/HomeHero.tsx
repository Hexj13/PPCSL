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
  const rootClassName = ['mb-8', className].filter(Boolean).join(' ');
  const hasDescription =
    descriptionIntro !== undefined &&
    descriptionDetails !== undefined &&
    expandLabel !== undefined &&
    collapseLabel !== undefined;

  return (
    <div className={rootClassName} {...props}>
      <h1 className="text-[30px] font-extrabold mb-4 leading-tight text-primary-900">{title}</h1>
      <h2 className="text-[24px] font-medium leading-relaxed tracking-wide text-primary-900">
        <span>{subtitle}</span>
        <span className="text-primary-500 font-bold"> {subtitle3}</span>
        <span>{subtitle2}</span>
        <span className="text-primary-500 font-bold">{subtitleBold}</span>
      </h2>
      {hasDescription && (
        <HomeHeroDescription
          descriptionIntro={descriptionIntro}
          descriptionDetails={descriptionDetails}
          expandLabel={expandLabel}
          collapseLabel={collapseLabel}
        />
      )}
    </div>
  );
}
