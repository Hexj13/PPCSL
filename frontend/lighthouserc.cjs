/* global process */
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LIGHTHOUSE_URL || 'http://localhost:3000/',
        process.env.LIGHTHOUSE_LISTING_URL || 'http://localhost:3000/listings',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.75 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
