export const TIRE_TREAD_VALUES = [
  'summer',
  'winter',
  'all_season',
  'mud_at',
  'mud_mt',
  'mud_rt',
  'sport_semi_slick',
  'race_slick',
] as const;

export type TireTread = (typeof TIRE_TREAD_VALUES)[number];

export const TIRE_TREAD_SET = new Set<string>(TIRE_TREAD_VALUES);
