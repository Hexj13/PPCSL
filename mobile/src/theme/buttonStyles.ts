import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

import colors from '@/theme/synced/colors';

export type ButtonVariant =
  | 'search'
  | 'searchDisabled'
  | 'secondary'
  | 'primary'
  | 'filterRow'
  | 'drawerNavItem'
  | 'drawerLogin'
  | 'createListing';

type ButtonState = { pressed?: boolean; disabled?: boolean };

export function getButtonContainerStyle(
  variant: ButtonVariant,
  state: ButtonState = {},
): ViewStyle[] {
  const { pressed, disabled } = state;
  const base: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 8,
  };

  switch (variant) {
    case 'search':
      return [
        base,
        {
          height: 48,
          borderWidth: 2,
          borderColor: pressed ? colors.primary[900] : colors.primary[700],
          backgroundColor: `${colors.primary[500]}1F`,
        },
      ];
    case 'searchDisabled':
      return [
        base,
        {
          height: 48,
          borderWidth: 2,
          borderColor: `${colors.primary[700]}4D`,
          backgroundColor: colors.bg.secondary,
          opacity: 0.7,
        },
      ];
    case 'secondary':
      return [
        base,
        {
          height: 48,
          borderWidth: 2,
          borderColor: colors.divider,
          backgroundColor: colors.bg.secondary,
          opacity: disabled ? 0.5 : 1,
        },
      ];
    case 'primary':
      return [
        base,
        {
          height: 52,
          backgroundColor: pressed ? colors.primary[600] : colors.primary[500],
          opacity: disabled ? 0.5 : 1,
        },
      ];
    case 'filterRow':
      return [
        base,
        {
          minHeight: 48,
          paddingHorizontal: 12,
          borderWidth: 2,
          borderColor: pressed ? colors.primary[600] : `${colors.primary[500]}40`,
          backgroundColor: colors.bg.base,
          opacity: disabled ? 0.5 : 1,
        },
      ];
    case 'drawerNavItem':
      return [
        base,
        {
          justifyContent: 'flex-start',
          paddingVertical: 14,
          paddingHorizontal: 10,
        },
      ];
    case 'drawerLogin':
      return [
        base,
        {
          paddingVertical: 14,
          paddingHorizontal: 10,
          borderWidth: 2,
          borderColor: pressed ? colors.primary[900] : colors.primary[700],
          backgroundColor: `${colors.primary[500]}1A`,
        },
      ];
    case 'createListing':
      return [
        base,
        {
          paddingVertical: 14,
          borderWidth: 2,
          borderColor: pressed ? `${colors.accent}CC` : colors.accent,
          backgroundColor: `${colors.bg.base}E6`,
        },
      ];
    default:
      return [base];
  }
}

export function getButtonTextStyle(variant: ButtonVariant, state: ButtonState = {}): TextStyle {
  const { pressed } = state;
  switch (variant) {
    case 'search':
    case 'searchDisabled':
      return { color: colors.primary[900], fontWeight: '600', fontSize: 15 };
    case 'secondary':
      return { color: colors.text.primary, fontWeight: '600', fontSize: 15 };
    case 'primary':
      return {
        color: colors.text.onPrimary,
        fontWeight: '700',
        fontSize: 16,
      };
    case 'drawerNavItem':
      return {
        color: pressed ? colors.primary[700] : colors.primary[900],
        fontWeight: '500',
        fontSize: 14,
      };
    case 'drawerLogin':
      return { color: colors.primary[900], fontWeight: '600', fontSize: 14 };
    case 'createListing':
      return { color: colors.primary[900], fontWeight: '600', fontSize: 14 };
    default:
      return { color: colors.text.primary, fontSize: 14 };
  }
}

export const buttonStyles = StyleSheet.create({
  fullWidth: { width: '100%' },
});
