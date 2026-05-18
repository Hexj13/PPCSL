import type { TranslationsPart1 } from './i18n-types-part1';
import type { TranslationsPart2 } from './i18n-types-part2';

export type Locale = string;
export type Translations = TranslationsPart1 & TranslationsPart2;
