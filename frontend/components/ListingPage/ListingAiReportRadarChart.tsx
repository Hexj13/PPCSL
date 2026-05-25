'use client';

import type {
  ListingAiQualityScoreCriterionKey,
  ListingAiScoreItem,
  ListingAiVehicleScoreCriterionKey,
} from '@/lib/api';
export const QUALITY_CRITERION_ORDER: ListingAiQualityScoreCriterionKey[] = [
  'dataCompleteness',
  'mediaQuality',
  'descriptionQuality',
  'priceAdequacy',
  'safeChoice',
];

export const VEHICLE_CRITERION_ORDER: ListingAiVehicleScoreCriterionKey[] = [
  'mileage',
  'equipment',
  'reliability',
  'liquidity',
  'popularity',
];

const PLOT_RADIUS = 82;
const LABEL_OFFSET = 20;
const LABEL_RADIUS = PLOT_RADIUS + LABEL_OFFSET;
const VIEWBOX_MARGIN = 10;
const LINE_HEIGHT = 11;
const CHAR_WIDTH = 5.1;

function polarPoint(
  cx: number,
  cy: number,
  angleRad: number,
  radius: number,
): { x: number; y: number } {
  return {
    x: cx + radius * Math.sin(angleRad),
    y: cy - radius * Math.cos(angleRad),
  };
}

function scoreRadius(score: number): number {
  return (Math.max(0, Math.min(100, score)) / 100) * PLOT_RADIUS;
}

function polygonPoints(cx: number, cy: number, scores: number[]): string {
  const step = (Math.PI * 2) / scores.length;
  return scores
    .map((score, index) => {
      const { x, y } = polarPoint(cx, cy, index * step, scoreRadius(score));
      return `${x},${y}`;
    })
    .join(' ');
}

function labelLines(label: string): string[] {
  const trimmed = label.trim();
  if (trimmed.length <= 14) {
    return [trimmed];
  }
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
  const mid = Math.ceil(trimmed.length / 2);
  return [trimmed.slice(0, mid), trimmed.slice(mid)];
}

function estimateLabelBounds(
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end',
  lines: string[],
): { minX: number; maxX: number; minY: number; maxY: number } {
  const width = Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH;
  const height = lines.length * LINE_HEIGHT;

  let minX = x;
  let maxX = x;
  if (anchor === 'middle') {
    minX = x - width / 2;
    maxX = x + width / 2;
  } else if (anchor === 'start') {
    maxX = x + width;
  } else {
    minX = x - width;
  }

  return {
    minX,
    maxX,
    minY: y - height / 2,
    maxY: y + height / 2,
  };
}

export interface ListingAiReportRadarChartProps {
  items: Record<string, ListingAiScoreItem>;
  criterionOrder: string[];
  chartLabel: string;
  labelForCriterion: (key: string, fallbackLabel: string) => string;
}

export function ListingAiReportRadarChart({
  items,
  criterionOrder,
  chartLabel,
  labelForCriterion,
}: ListingAiReportRadarChartProps) {
  const criteria = criterionOrder
    .map((key) => ({
      key,
      item: items[key],
    }))
    .filter((entry) => typeof entry.item?.score === 'number' && !Number.isNaN(entry.item.score));

  if (criteria.length < 3) {
    return null;
  }

  const scores = criteria.map((entry) => entry.item.score);
  const step = (Math.PI * 2) / criteria.length;
  const gridLevels = [25, 50, 75, 100];
  const center = PLOT_RADIUS + LABEL_OFFSET + VIEWBOX_MARGIN + 8;

  let minX = center - PLOT_RADIUS;
  let maxX = center + PLOT_RADIUS;
  let minY = center - PLOT_RADIUS;
  let maxY = center + PLOT_RADIUS;

  const labelLayouts = criteria.map((entry, index) => {
    const labelPoint = polarPoint(center, center, index * step, LABEL_RADIUS);
    const anchor: 'start' | 'middle' | 'end' =
      labelPoint.x < center - 8 ? 'end' : labelPoint.x > center + 8 ? 'start' : 'middle';
    const lines = labelLines(labelForCriterion(entry.key, entry.item.label));
    const bounds = estimateLabelBounds(labelPoint.x, labelPoint.y, anchor, lines);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minY = Math.min(minY, bounds.minY);
    maxY = Math.max(maxY, bounds.maxY);
    return { entry, index, labelPoint, anchor, lines };
  });

  minX -= VIEWBOX_MARGIN;
  maxX += VIEWBOX_MARGIN;
  minY -= VIEWBOX_MARGIN;
  maxY += VIEWBOX_MARGIN;

  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;

  return (
    <div className="mx-auto w-full max-w-[340px] overflow-visible sm:max-w-[400px] md:max-w-[460px]">
      <svg
        viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={chartLabel}
      >
        {gridLevels.map((level) => (
          <polygon
            key={`grid-${level}`}
            points={polygonPoints(
              center,
              center,
              Array.from({ length: criteria.length }, () => level),
            )}
            fill="none"
            className="stroke-primary-500/15"
            strokeWidth={1}
          />
        ))}

        {criteria.map((entry, index) => {
          const outer = polarPoint(center, center, index * step, PLOT_RADIUS);
          return (
            <line
              key={`axis-${entry.key}`}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              className="stroke-primary-500/20"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygonPoints(center, center, scores)}
          className="fill-primary-500/20 stroke-primary-600"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {criteria.map((entry, index) => {
          const point = polarPoint(center, center, index * step, scoreRadius(entry.item.score));
          return (
            <circle
              key={`point-${entry.key}`}
              cx={point.x}
              cy={point.y}
              r={3.5}
              className="fill-primary-700"
            />
          );
        })}

        {labelLayouts.map(({ entry, labelPoint, anchor, lines }) => (
          <text
            key={`label-${entry.key}`}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-current text-text-secondary text-[10px]"
          >
            {lines.map((line, lineIndex) => (
              <tspan
                key={`${entry.key}-line-${lineIndex}`}
                x={labelPoint.x}
                dy={lineIndex === 0 ? -((lines.length - 1) * LINE_HEIGHT) / 2 : LINE_HEIGHT}
              >
                {line}
              </tspan>
            ))}
          </text>
        ))}
      </svg>
    </div>
  );
}
