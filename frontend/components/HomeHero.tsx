import { ComponentProps } from 'react';

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
  return (
    <div className={`mb-8 ${className || ''}`} {...props}>
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 leading-tight text-text-secondary">
        {title}
      </h1>
      <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide text-text-secondary">
        <span>{subtitle} </span>
        <span className="text-primary-500 font-bold">{subtitleBold}</span>
        <span> {subtitle2} </span>
        <span className="text-primary-700">{subtitle3}</span>
      </p>
    </div>
  );
}
