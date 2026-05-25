import {
  applyQualityScorePresentation,
  hasRawQualityScore,
  parseAndValidateAiListingReportPayload,
} from './listing-ai-report-validate';

const qualityScoreItem = (score: number) => ({
  label: 'Criterion label',
  score,
  summary: 'Short criterion summary for validation.',
});

const baseQualityScore = {
  overallScore: 72,
  summary: 'Overall quality looks balanced with a few gaps in listing completeness.',
  items: {
    dataCompleteness: qualityScoreItem(80),
    mediaQuality: qualityScoreItem(70),
    descriptionQuality: qualityScoreItem(65),
    priceAdequacy: qualityScoreItem(75),
    safeChoice: { ...qualityScoreItem(72), label: 'Safe choice' },
  },
};

const baseReport = {
  modelContext: [
    'Model line is common in this segment.',
    'Typical pros and cons apply to the generation.',
    'Buyers often check service items.',
  ],
  summary:
    'First sentence here. Second sentence follows. Third provides context. Fourth closes the thought.',
  strengths: ['a', 'b', 'c'],
  weaknesses: ['a', 'b', 'c'],
  buyingChecks: ['a', 'b', 'c'],
  questionsForSeller: ['a', 'b', 'c'],
  redFlags: ['only one flag'],
  confidence: 0.5,
  qualityScore: baseQualityScore,
};

describe('parseAndValidateAiListingReportPayload', () => {
  it('accepts valid payload and empty redFlags', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      redFlags: [],
    });
    expect(v).not.toBeNull();
    expect(v?.redFlags).toEqual([]);
  });

  it('accepts 1–6 redFlags', () => {
    const v = parseAndValidateAiListingReportPayload(baseReport);
    expect(v?.redFlags).toEqual(['only one flag']);
  });

  it('rejects more than 6 redFlags', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      redFlags: ['1', '2', '3', '4', '5', '6', '7'],
    });
    expect(v).toBeNull();
  });

  it('rejects summary with wrong sentence count', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      summary: 'Only one.',
    });
    expect(v).toBeNull();
  });

  it('rejects modelContext with wrong length', () => {
    expect(
      parseAndValidateAiListingReportPayload({ ...baseReport, modelContext: ['only'] }),
    ).toBeNull();
    expect(
      parseAndValidateAiListingReportPayload({
        ...baseReport,
        modelContext: ['1', '2', '3', '4', '5', '6'],
      }),
    ).toBeNull();
  });

  it('ignores any model disclaimer and returns empty', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      disclaimer: 'Duplicated long AI disclaimer text that must not surface.',
    });
    expect(v?.disclaimer).toBe('');
  });

  it('accepts valid qualityScore with all five criteria', () => {
    const v = parseAndValidateAiListingReportPayload(baseReport);
    expect(v?.qualityScore).toBeDefined();
    expect(v?.qualityScore?.overallScore).toBe(72);
    expect(v?.qualityScore?.items.safeChoice.label).toBe('Safe choice');
    expect(v?.qualityScore?.items.dataCompleteness.score).toBe(80);
  });

  it('clamps qualityScore item scores to 0–100', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      qualityScore: {
        ...baseQualityScore,
        items: {
          ...baseQualityScore.items,
          dataCompleteness: qualityScoreItem(150),
        },
      },
    });
    expect(v?.qualityScore?.items.dataCompleteness.score).toBe(100);
  });

  it('returns report without qualityScore when qualityScore is missing', () => {
    const { qualityScore: _removed, ...withoutQuality } = baseReport;
    const v = parseAndValidateAiListingReportPayload(withoutQuality);
    expect(v).not.toBeNull();
    expect(v?.qualityScore).toBeUndefined();
  });

  it('returns report without qualityScore when qualityScore is invalid', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      qualityScore: {
        ...baseQualityScore,
        items: {
          ...baseQualityScore.items,
          mediaQuality: { label: 'Media', score: 50 },
        },
      },
    });
    expect(v).not.toBeNull();
    expect(v?.qualityScore).toBeUndefined();
  });

  it('accepts valid vehicleScore with all five criteria', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      vehicleScore: {
        overallScore: 80,
        summary: 'Good vehicle summary that is long enough to pass validation.',
        items: {
          mileage: qualityScoreItem(80),
          equipment: qualityScoreItem(70),
          reliability: qualityScoreItem(90),
          liquidity: qualityScoreItem(85),
          popularity: qualityScoreItem(75),
        },
      },
    });
    expect(v?.vehicleScore).toBeDefined();
    expect(v?.vehicleScore?.overallScore).toBe(80);
    expect(v?.vehicleScore?.items.mileage.score).toBe(80);
  });

  it('recalculates overallScore when it diverges from mean', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      qualityScore: {
        ...baseQualityScore,
        overallScore: 10,
      },
    });
    expect(v?.qualityScore?.overallScore).toBe(72);
  });
});

describe('hasRawQualityScore', () => {
  it('detects qualityScore key in raw payload', () => {
    expect(hasRawQualityScore({ qualityScore: {} })).toBe(true);
    expect(hasRawQualityScore({ summary: 'x' })).toBe(false);
  });
});

describe('applyQualityScorePresentation', () => {
  it('normalizes criterion labels and softens risk wording for ru', () => {
    const v = parseAndValidateAiListingReportPayload(baseReport);
    expect(v?.qualityScore).toBeDefined();
    const adjusted = applyQualityScorePresentation(v!.qualityScore!, 'ru');
    expect(adjusted.items.dataCompleteness.label).toBe('Полнота данных');
    expect(adjusted.items.safeChoice.label).toBe('Безопасный выбор');
  });

  it('softens risk wording in safeChoice text', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      qualityScore: {
        ...baseQualityScore,
        items: {
          ...baseQualityScore.items,
          safeChoice: {
            ...qualityScoreItem(80),
            label: 'Low risk',
            summary: 'No high risk indicators were found in the listing data.',
          },
        },
      },
    });
    const adjusted = applyQualityScorePresentation(v!.qualityScore!, 'ru');
    expect(adjusted.items.safeChoice.summary).not.toMatch(/high risk/i);
  });
});
