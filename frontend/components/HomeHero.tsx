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
    <div className={`mb-8 md:mb-12 relative ${className || ''}`} {...props}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary-500/10 via-primary-400/5 to-transparent rounded-2xl -z-10" />
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight pl-4 md:pl-5">
        <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent drop-shadow-lg">
          {title}
        </span>
      </h1>
      <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide pl-4 md:pl-5">
        <span className="text-white">{subtitle} </span>
        <span className="text-primary-500 font-bold">{subtitleBold}</span>
        <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {' '}
          {subtitle2}{' '}
        </span>
        <span className="bg-gradient-to-r from-primary-400 to-[#3ECA74] bg-clip-text text-transparent">
          {subtitle3}
        </span>
      </p>
    </div>
  );
}
