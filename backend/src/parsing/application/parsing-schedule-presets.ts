export type FrequencyPresetKind = 'every_n_hours' | 'daily' | 'weekly' | 'custom';

export function presetToCronExpression(
  preset: FrequencyPresetKind,
  params: { everyNHours?: number; presetTime?: string; presetWeekday?: string },
): string {
  const timeMatch = params.presetTime?.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const presetHour = timeMatch ? Number(timeMatch[1]) : 0;
  const presetMinute = timeMatch ? Number(timeMatch[2]) : 0;
  const parsedWeekday = Number(params.presetWeekday);
  const presetWeekday =
    Number.isInteger(parsedWeekday) && parsedWeekday >= 0 && parsedWeekday <= 6 ? parsedWeekday : 0;
  if (preset === 'daily') {
    return `${presetMinute} ${presetHour} * * *`;
  }
  if (preset === 'weekly') {
    return `${presetMinute} ${presetHour} * * ${presetWeekday}`;
  }
  if (preset === 'every_n_hours') {
    const n = Math.max(1, Math.min(24, params.everyNHours ?? 6));
    return `0 */${n} * * *`;
  }
  throw new Error('custom preset requires cronExpression');
}
