import Svg, { G, Path } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  children: React.ReactNode;
};

export function Icon({ size = 24, color = 'currentColor', children }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} fill="none">
        {children}
      </G>
    </Svg>
  );
}

export function IconPath({
  d,
  strokeWidth = 2,
  strokeLinecap = 'round' as const,
  strokeLinejoin = 'round' as const,
  fill = 'none',
}: {
  d: string;
  strokeWidth?: number;
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeLinejoin?: 'round' | 'miter' | 'bevel';
  fill?: string;
}) {
  return (
    <Path
      d={d}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      fill={fill}
    />
  );
}
