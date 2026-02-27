import { test as base } from '@playwright/test';

// Mock JWT token (valid structure, dummy payload)
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.mock-signature';
const MOCK_REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsInR5cGUiOiJyZWZyZXNoIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-refresh';

const BACKEND_URL = 'http://127.0.0.1:8001';

// Mock data
const mockStats = {
  total_visitors: 142,
  unique_countries: 18,
  top_countries: [
    { country: 'Switzerland', count: 45 },
    { country: 'Germany', count: 28 },
    { country: 'Spain', count: 19 },
  ],
  visits_today: 7,
  visits_this_week: 34,
  visits_this_month: 89,
};

const mockMapData = [
  { lat: 47.37, lon: 8.54, city: 'Zurich', country: 'Switzerland', count: 12 },
  { lat: 52.52, lon: 13.41, city: 'Berlin', country: 'Germany', count: 8 },
];

const mockChatAnalytics = {
  total_conversations: 56,
  total_messages: 234,
  avg_messages_per_conversation: 4.2,
  top_topics: [
    { topic: 'experience', count: 23 },
    { topic: 'skills', count: 18 },
  ],
  daily_counts: [],
  language_distribution: { en: 30, es: 15, de: 11 },
};

const emptyJobResponse = { jobs: [], total: 0, source: 'mock', cached_at: new Date().toISOString() };

/**
 * Set up API route mocking for all backend endpoints.
 * Intercepts requests to BACKEND_URL so no real backend is needed.
 */
async function mockBackendAPI(page) {
  // Catch-all FIRST (lowest priority in Playwright's LIFO matching)
  await page.route(`${BACKEND_URL}/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Auth: login
  await page.route(`${BACKEND_URL}/api/v1/auth/token`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = await request.postData();
      const params = new URLSearchParams(body);
      const username = params.get('username');
      const password = params.get('password');

      if (username === 'admin@example.com' && password === 'secret123') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: MOCK_ACCESS_TOKEN,
            refresh_token: MOCK_REFRESH_TOKEN,
            token_type: 'bearer',
          }),
        });
      }
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      });
    }
    return route.continue();
  });

  // Auth: refresh
  await page.route(`${BACKEND_URL}/api/v1/auth/refresh`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
        token_type: 'bearer',
      }),
    });
  });

  // Analytics: stats
  await page.route(`${BACKEND_URL}/api/v1/analytics/stats`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStats),
    });
  });

  // Analytics: map data
  await page.route(`${BACKEND_URL}/api/v1/analytics/map-data`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMapData),
    });
  });

  // Analytics: recent visitors
  await page.route(`${BACKEND_URL}/api/v1/analytics/recent*`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Chat analytics
  await page.route(`${BACKEND_URL}/api/v1/analytics/chat*`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockChatAnalytics),
    });
  });

  // Visitor tracking (fire-and-forget POST)
  await page.route(`${BACKEND_URL}/api/v1/analytics/visit`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  // Job endpoints — all return empty lists
  const jobPrefixes = [
    'jobicy', 'remotive', 'arbeitnow', 'jsearch', 'remoteok',
    'himalayas', 'adzuna', 'weworkremotely', 'ostjob', 'zentraljob',
    'swisstechjobs', 'ictjobs',
  ];
  for (const source of jobPrefixes) {
    await page.route(`${BACKEND_URL}/api/v1/${source}-jobs/**`, async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyJobResponse),
      });
    });
  }

  // Unified jobs endpoint
  await page.route(`${BACKEND_URL}/api/v1/jobs/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyJobResponse),
    });
  });

  // Applications, saved searches, AI match
  await page.route(`${BACKEND_URL}/api/v1/applications/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`${BACKEND_URL}/api/v1/saved-searches/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`${BACKEND_URL}/api/v1/ai-match/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: [] }),
    });
  });

  // Notifications SSE — return empty and close
  await page.route(`${BACKEND_URL}/api/v1/notifications/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"connected"}\n\n',
    });
  });

  // Chat endpoint
  await page.route(`${BACKEND_URL}/api/v1/chat/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'Hello! I am Vicente\'s chatbot.' }),
    });
  });

  // CV export
  await page.route(`${BACKEND_URL}/api/v1/cv/**`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

}

/**
 * Pre-authenticate by injecting tokens into sessionStorage.
 * Call this before navigating to /dashboard.
 */
async function injectAuth(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.mock-signature');
    sessionStorage.setItem('refreshToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsInR5cGUiOiJyZWZyZXNoIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-refresh');
  });
}

// Extended test fixture with API mocking pre-applied
export const test = base.extend({
  // Auto-mock all backend API calls for every test
  page: async ({ page }, use) => {
    await mockBackendAPI(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { mockBackendAPI, injectAuth, MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN };
