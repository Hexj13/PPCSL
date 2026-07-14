'use client';

import { useMemo } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import type { PopularStatBucket } from '@/lib/api';

type PopularStatisticsProps = {
  brands: PopularStatBucket;
  bodyTypes: PopularStatBucket;
  fuels: PopularStatBucket;
};

type ChartSegment = {
  key: string;
  label: string;
  count: number;
  color: string;
};

const CHART_COLORS = [
  'var(--color-primary-500)',
  'var(--color-primary-700)',
  'var(--color-accent)',
  'var(--color-primary-300)',
  'var(--color-primary-400)',
  'var(--color-dark-400)',
] as const;

function buildSegments(
  bucket: PopularStatBucket,
  otherLabel: string,
  resolveLabel: (item: { key: string; label: string }) => string,
): ChartSegment[] {
  const named = bucket.items.filter((item) => item.count > 0).slice(0, 4);
  const overflowCount = bucket.items
    .filter((item) => item.count > 0)
    .slice(4)
    .reduce((sum, item) => sum + item.count, 0);
  const otherCount = (bucket.otherCount > 0 ? bucket.otherCount : 0) + overflowCount;

  const segments: ChartSegment[] = named.map((item, index) => ({
    key: item.key,
    label: resolveLabel(item),
    count: item.count,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  if (otherCount > 0) {
    segments.push({
      key: 'other',
      label: otherLabel,
      count: otherCount,
      color: CHART_COLORS[CHART_COLORS.length - 1],
    });
  }

  return segments;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const angle = endAngle - startAngle;
  if (angle <= 0) {
    return '';
  }

  if (angle >= 359.999) {
    return [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy - outerRadius}`,
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
      'Z',
    ].join(' ');
  }

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = angle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({
  title,
  segments,
  total,
  ariaLabel,
}: {
  title: string;
  segments: ChartSegment[];
  total: number;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const cx = 50;
  const cy = 50;
  const outerRadius = 46;
  const innerRadius = 32;

  let angleCursor = 0;
  const slices =
    total > 0
      ? segments.map((segment) => {
          const startAngle = angleCursor;
          const sweep = (segment.count / total) * 360;
          angleCursor += sweep;
          return {
            ...segment,
            path: describeDonutSlice(
              cx,
              cy,
              outerRadius,
              innerRadius,
              startAngle,
              startAngle + sweep,
            ),
          };
        })
      : [];

  return (
    <div className="rounded-xl search-control-border bg-bg-card p-4 flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-primary-900">{title}</h4>
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 shrink-0" role="img" aria-label={ariaLabel}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {slices.length === 0 ? (
              <path
                d={describeDonutSlice(cx, cy, outerRadius, innerRadius, 0, 360)}
                fill="var(--color-divider)"
              />
            ) : (
              slices.map((slice) =>
                slice.path ? (
                  <path key={slice.key} d={slice.path} fill={slice.color} stroke="none" />
                ) : null,
              )
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-primary-900">{total}</span>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 min-w-0 flex-1">
          {segments.map((segment) => {
            const percent = total > 0 ? Math.round((segment.count / total) * 100) : 0;
            return (
              <li key={segment.key} className="flex items-center gap-2 text-xs text-text-secondary">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                <span className="truncate flex-1">{segment.label}</span>
                <span className="shrink-0 tabular-nums">
                  {t('searchFilters.popularStatsCountPercent', {
                    count: String(segment.count),
                    percent: String(percent),
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PopularStatistics({ brands, bodyTypes, fuels }: PopularStatisticsProps) {
  const { t } = useTranslation();
  const otherLabel = t('searchFilters.popularStatsOther');

  const brandSegments = useMemo(
    () => buildSegments(brands, otherLabel, (item) => item.label),
    [brands, otherLabel],
  );
  const bodyTypeSegments = useMemo(
    () => buildSegments(bodyTypes, otherLabel, (item) => t(`vehicleOptions.bodyType.${item.key}`)),
    [bodyTypes, otherLabel, t],
  );
  const fuelSegments = useMemo(
    () =>
      buildSegments(fuels, otherLabel, (item) =>
        item.key === 'unknown'
          ? t('searchFilters.popularStatsUnknown')
          : t(`vehicleOptions.fuel.${item.key}`),
      ),
    [fuels, otherLabel, t],
  );

  return (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-primary-900 mb-3">
        {t('searchFilters.popularStatistics')}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart
          title={t('searchFilters.popularStatsByBrand')}
          segments={brandSegments}
          total={brands.total}
          ariaLabel={t('searchFilters.popularStatsByBrandAria')}
        />
        <DonutChart
          title={t('searchFilters.popularStatsByBodyType')}
          segments={bodyTypeSegments}
          total={bodyTypes.total}
          ariaLabel={t('searchFilters.popularStatsByBodyTypeAria')}
        />
        <DonutChart
          title={t('searchFilters.popularStatsByFuel')}
          segments={fuelSegments}
          total={fuels.total}
          ariaLabel={t('searchFilters.popularStatsByFuelAria')}
        />
      </div>
    </div>
  );
}
