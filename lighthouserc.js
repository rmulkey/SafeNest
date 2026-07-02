/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      // Audit the live production site. No local server/build is started, so
      // no Sanity/Clerk build-time secrets are required in CI.
      url: [
        'https://safenesttoys.com',
        'https://safenesttoys.com/reviews',
        'https://safenesttoys.com/best-toys',
      ],
      numberOfRuns: 3,
      settings: {
        // Simulated 3G throttling to verify FCP < 3s
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
        },
        // Only run relevant categories
        onlyCategories: ['performance', 'accessibility'],
        // Use mobile preset (default Lighthouse behavior)
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
        },
      },
    },
    assert: {
      assertions: {
        // Accessibility score >= 90 (0.9)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // Performance score >= 80 (0.8)
        'categories:performance': ['error', { minScore: 0.8 }],
        // First Contentful Paint < 3000ms on simulated 3G
        'first-contentful-paint': ['error', { maxNumericValue: 3000 }],
      },
    },
    upload: {
      // Use temporary public storage (free, links expire after 7 days)
      target: 'temporary-public-storage',
    },
  },
};
