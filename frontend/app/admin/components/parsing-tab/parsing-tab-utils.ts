import type { ReactElement } from 'react';
import React from 'react';

import type { ParserRun, ParserSchedule } from '@/lib/api/admin-parsing';
import type { City } from '@/lib/api/api-types';
import { registrationTypes } from '@/lib/constants';

import {
  cipautoParserCode,
  parserPdpDefaultsByCode,
  parserPreferredPdpCityNames,
  parserStaticPlpFileNameByCode,
} from './parsing-tab-constants';
import type { ParserPdpDefaults, PlpScanMode } from './parsing-tab-types';

export function getDefaultPlpScanMode(parserCode: string): PlpScanMode {
  return parserCode === cipautoParserCode ? 'all' : 'first_n';
}

export function isRunActive(status: string): boolean {
  return status === 'queued' || status === 'in_progress' || status === 'cancel_requested';
}

export function getRunStatusClassName(status: string): string {
  if (status === 'queued' || status === 'scheduled') {
    return 'text-semantic-info';
  }
  if (status === 'in_progress') {
    return 'text-accent';
  }
  if (status === 'cancel_requested' || status === 'cancelled') {
    return 'text-semantic-error';
  }
  if (status === 'completed' || status === 'success') {
    return 'text-semantic-success';
  }
  if (status === 'failed' || status === 'error') {
    return 'text-semantic-rose';
  }
  return 'text-text-secondary';
}

export function getScheduleStatusClassName(status: string): string {
  return status === 'active' ? 'text-primary-700' : 'text-text-secondary';
}

export function getAvailabilityIndicatorClassName(status: string | null | undefined): string {
  if (status === 'available') {
    return 'text-semantic-success';
  }
  if (status === 'partial') {
    return 'text-accent';
  }
  if (status === 'unavailable') {
    return 'text-semantic-error';
  }
  return 'text-text-secondary';
}

export function getSelectedOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '—';
}

export function getUtcOffsetSortKeyMinutes(timezone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
    const rawOffset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    if (rawOffset === 'GMT' || rawOffset === 'UTC') {
      return 0;
    }
    const match = rawOffset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      return 0;
    }
    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? '0');
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

export function getUtcOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const rawOffset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    if (rawOffset === 'GMT' || rawOffset === 'UTC') {
      return 'UTC+00:00';
    }
    const match = rawOffset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      return 'UTC+00:00';
    }
    const sign = match[1];
    const hours = match[2].padStart(2, '0');
    const minutes = (match[3] ?? '00').padStart(2, '0');
    return `UTC${sign}${hours}:${minutes}`;
  } catch {
    return 'UTC+00:00';
  }
}

export function normalizeCityName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zа-я0-9]+/gi, '');
}

export function getParserPdpDefaults(parserCode: string): ParserPdpDefaults {
  const configured = parserPdpDefaultsByCode.get(parserCode) ?? {};
  const registrationTypeRaw = configured.registrationType;
  const registrationType =
    typeof registrationTypeRaw === 'string' &&
    registrationTypes.includes(registrationTypeRaw as (typeof registrationTypes)[number])
      ? registrationTypeRaw
      : registrationTypes[0];
  const defaultHp = Number(configured.defaultHp);
  const delayMs = Number(configured.delayMs);

  return {
    listingStatus: configured.listingStatus === 'paused' ? 'paused' : 'active',
    registrationType,
    defaultHp: Number.isFinite(defaultHp) ? defaultHp : 100,
    delayMs: Number.isFinite(delayMs) ? delayMs : 3000,
    resume: Boolean(configured.resume),
    dryRun: Boolean(configured.dryRun),
    removeClosed: Boolean(configured.removeClosed),
    onlyFailed: Boolean(configured.onlyFailed),
    updateExisting: Boolean(configured.updateExisting),
  };
}

export function toLoginFileSlug(login: string): string {
  const normalized = login.trim().toLowerCase();
  if (!normalized) {
    return 'unknown-login';
  }
  return normalized.replace(/[^a-z0-9_-]+/g, '-');
}

export function getPlpRunFileName(run: ParserRun): string {
  const cfg = run.config_snapshot ?? {};
  const loginRaw = cfg.login;
  if (typeof loginRaw === 'string' && loginRaw.trim().length > 0) {
    return `${toLoginFileSlug(loginRaw)}.json`;
  }
  return parserStaticPlpFileNameByCode.get(run.parser_code) ?? '—';
}

export function getDefaultPdpCity(parserCode: string, cities: City[]): string {
  const firstCity = cities[0]?.name ?? '';
  if (!firstCity) {
    return '';
  }

  const preferredNames = parserPreferredPdpCityNames.get(parserCode);
  if (!preferredNames || preferredNames.size === 0) {
    return firstCity;
  }

  const preferredCity = cities.find((city) => {
    const raw = [city.name, city.nameEn, city.nameRu].filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    );
    return raw.some((v) => preferredNames.has(normalizeCityName(v)));
  });

  return preferredCity?.name ?? firstCity;
}

export function getSupportedTimezones(): string[] {
  const intlWithSupported = Intl as typeof Intl & {
    supportedValuesOf?: (_key: 'timeZone') => string[];
  };
  const values =
    typeof intlWithSupported.supportedValuesOf === 'function'
      ? intlWithSupported.supportedValuesOf('timeZone')
      : [];
  const europeanTimezones = values.filter((timezone) => timezone.startsWith('Europe/'));
  return [...new Set(['Europe/Chisinau', ...europeanTimezones])];
}

export function getScheduleFrequencyLabel(
  schedule: ParserSchedule,
  getTranslatedParsingValue: (_group: string, _value: string | null | undefined) => string,
): string {
  if (schedule.frequency_preset) {
    return getTranslatedParsingValue('frequency', schedule.frequency_preset);
  }
  return schedule.cron_expression || '—';
}

export function parseEveryNHoursFromCron(cronExpression: string): number | null {
  const match = cronExpression.match(/^0 \*\/(\d+) \* \* \*$/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function parseEveryNDaysFromCron(cronExpression: string): number | null {
  const match = cronExpression.match(/^([0-5]?\d) ([01]?\d|2[0-3]) \*\/(\d+) \* \*$/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[3]);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
    return null;
  }
  return parsed;
}

export function parsePresetTimeFromCron(cronExpression: string): string | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) {
    return null;
  }
  const minutes = Number(parts[0]);
  const hours = Number(parts[1]);
  if (
    !Number.isInteger(minutes) ||
    !Number.isInteger(hours) ||
    minutes < 0 ||
    minutes > 59 ||
    hours < 0 ||
    hours > 23
  ) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parsePresetWeekdayFromCron(cronExpression: string): string | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) {
    return null;
  }
  if (parts[4] === '7') {
    return '0';
  }
  const weekday = Number(parts[4]);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return null;
  }
  return String(weekday);
}

export function isValidPresetTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

export function isValidCronExpression(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }
  const validators = [
    /^(\*|([0-5]?\d)(-[0-5]?\d)?)(\/([1-9]\d*))?(,(\*|([0-5]?\d)(-[0-5]?\d)?)(\/([1-9]\d*))?)*$/,
    /^(\*|([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?)(\/([1-9]\d*))?(,(\*|([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?)(\/([1-9]\d*))?)*$/,
    /^(\*|([1-9]|[12]\d|3[01])(-([1-9]|[12]\d|3[01]))?)(\/([1-9]\d*))?(,(\*|([1-9]|[12]\d|3[01])(-([1-9]|[12]\d|3[01]))?)(\/([1-9]\d*))?)*$/,
    /^(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?)(\/([1-9]\d*))?(,(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?)(\/([1-9]\d*))?)*$/,
    /^(\*|[0-7](-[0-7])?)(\/([1-9]\d*))?(,(\*|[0-7](-[0-7])?)(\/([1-9]\d*))?)*$/,
  ];
  return parts.every((part, index) => validators[index].test(part));
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getSearchMatchCount(content: string, query: string): number {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return 0;

  return [...content.matchAll(new RegExp(escapeRegExp(trimmedQuery), 'gi'))].length;
}

export function renderHighlightedText(content: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return content;

  const matches = [...content.matchAll(new RegExp(escapeRegExp(trimmedQuery), 'gi'))];
  if (matches.length === 0) return content;

  const nodes: ReactElement[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const value = match[0] ?? '';
    const end = start + value.length;

    if (start > lastIndex) {
      nodes.push(
        React.createElement(
          'span',
          { key: `text-${start}-${index}` },
          content.slice(lastIndex, start),
        ),
      );
    }

    nodes.push(
      React.createElement(
        'mark',
        { key: `match-${start}-${index}`, className: 'bg-accent text-white rounded px-0.5' },
        value,
      ),
    );
    lastIndex = end;
  });

  if (lastIndex < content.length) {
    nodes.push(
      React.createElement('span', { key: `text-tail-${lastIndex}` }, content.slice(lastIndex)),
    );
  }

  return nodes;
}
