import { FilterRow } from './FilterRow';

type FilterSelectRowProps = {
  label: string;
  valueSummary: string;
  placeholder: string;
  onPress: () => void;
  showBadge?: boolean;
};

export function FilterSelectRow({
  label,
  valueSummary,
  placeholder,
  onPress,
  showBadge,
}: FilterSelectRowProps) {
  return (
    <FilterRow
      label={label}
      valueSummary={showBadge ? `${valueSummary} •` : valueSummary}
      placeholder={placeholder}
      onPress={onPress}
    />
  );
}
