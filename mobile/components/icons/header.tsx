import colors from '@/theme/synced/colors';

import { Icon, IconPath } from './Icon';

type HeaderIconProps = { size?: number; color?: string };

export function MenuIcon({ size = 24, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

export function CloseIcon({ size = 24, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M6 18L18 6M6 6l12 12" />
    </Icon>
  );
}

export function DocumentsIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </Icon>
  );
}

export function HeartIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </Icon>
  );
}

export function ScaleIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </Icon>
  );
}

export function UserIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </Icon>
  );
}

export function LogoutIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </Icon>
  );
}

export function SearchIcon({ size = 16, color = colors.primary[700] }: HeaderIconProps) {
  return (
    <Icon size={size} color={color}>
      <IconPath d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </Icon>
  );
}
