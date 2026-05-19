import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import {
  getButtonContainerStyle,
  getButtonTextStyle,
  type ButtonVariant,
} from '@/theme/buttonStyles';

type AppButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  variant: ButtonVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: object;
};

export function AppButton({
  variant,
  children,
  disabled,
  style,
  textStyle,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled ?? false;
  const effectiveVariant = variant === 'search' && isDisabled ? 'searchDisabled' : variant;

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        ...getButtonContainerStyle(effectiveVariant, { pressed, disabled: isDisabled }),
        style,
      ]}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text style={[getButtonTextStyle(effectiveVariant, { disabled: isDisabled }), textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
