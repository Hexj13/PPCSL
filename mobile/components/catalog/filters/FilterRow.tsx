import { Pressable, StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/synced/colors';

type FilterRowProps = {
  label: string;
  valueSummary?: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
  leadingIcon?: React.ReactNode;
};

export function FilterRow({
  label,
  valueSummary,
  placeholder,
  disabled,
  onPress,
  leadingIcon,
}: FilterRowProps) {
  const summary = typeof valueSummary === 'string' ? valueSummary : '';
  const placeholderText = typeof placeholder === 'string' ? placeholder : '';
  const display = summary.trim() ? summary : placeholderText;
  const hasValue = Boolean(summary.trim());

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.summary, !hasValue && styles.placeholder]} numberOfLines={1}>
          {display}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
    borderRadius: 8,
    backgroundColor: colors.bg.base,
    marginBottom: 8,
  },
  rowPressed: { borderColor: colors.primary[600] },
  rowDisabled: { opacity: 0.5 },
  icon: { marginRight: 10 },
  body: { flex: 1 },
  label: { fontSize: 12, color: colors.text.secondary, marginBottom: 2 },
  summary: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },
  placeholder: { color: colors.text.secondary, fontWeight: '400' },
  chevron: { fontSize: 20, color: colors.primary[700], marginLeft: 8 },
});
