import { parseAndValidateAiListingReportPayload } from './listing-ai-report-validate';

const baseReport = {
  modelContext: [
    'Model line is common in this segment.',
    'Typical pros and cons apply to the generation.',
    'Buyers often check service items.',
  ],
  summary:
    'First sentence here. Second sentence follows. Third provides context. Fourth closes the thought.',
  listingAnalysis: {
    priceComment: 'Price looks aligned with segment norms.',
    mileageComment: 'Mileage is typical for the year.',
    descriptionComment: 'Text is short but not contradictory.',
  },
  strengths: ['a', 'b', 'c'],
  weaknesses: ['a', 'b', 'c'],
  buyingChecks: ['a', 'b', 'c'],
  questionsForSeller: ['a', 'b', 'c'],
  redFlags: ['only one flag'],
  confidence: 0.5,
};

describe('parseAndValidateAiListingReportPayload', () => {
  it('accepts object listingAnalysis and empty redFlags', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      redFlags: [],
    });
    expect(v).not.toBeNull();
    expect(v?.listingAnalysis.priceComment).toBe(baseReport.listingAnalysis.priceComment);
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

  it('rejects array listingAnalysis', () => {
    const v = parseAndValidateAiListingReportPayload({
      ...baseReport,
      listingAnalysis: ['a', 'b', 'c'],
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
});
