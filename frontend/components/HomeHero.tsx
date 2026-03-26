import type { ComponentProps } from 'react';

export interface HomeHeroProps extends ComponentProps<'div'> {
  title: string;
  subtitle: string;
  subtitleBold: string;
  subtitle2: string;
  subtitle3: string;
}

export function HomeHero({
  title,
  subtitle,
  subtitleBold,
  subtitle2,
  subtitle3,
  className,
  ...props
}: HomeHeroProps) {
  const rootClassName = ['mb-8', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} {...props}>
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 leading-tight text-primary-900">
        {title}
      </h1>
      <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide text-primary-900">
        <span>{subtitle}</span>
        <span className="text-primary-500 font-bold"> {subtitle3}</span>
        <span>{subtitle2}</span>
        <span className="text-primary-500 font-bold">{subtitleBold}</span>
      </p>
    </div>
  );
}
