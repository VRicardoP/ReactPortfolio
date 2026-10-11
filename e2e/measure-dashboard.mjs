/**
 * Reproducible dashboard measurement used by the optimization audit.
 *
 * Start the built frontend with `npm run preview`, then run:
 *   HEADLESS=true OUTPUT=/tmp/dashboard.json npm run measure:dashboard
 *
 * TARGET_URL defaults to http://127.0.0.1:4173. The deterministic fixtures
 * keep before/after measurements comparable and prevent external API traffic.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { injectAuth, mockBackendAPI } from './fixtures/base.js';

const targetUrl = (process.env.TARGET_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = process.env.OUTPUT || '/tmp/reactportfolio-dashboard-measurement.json';
const progress = `${output}.progress`;

const fixtureJob = {
  id: 'fixture-job',
  title: 'Software Engineer',
  job_title: 'Software Engineer',
  company: 'Example Company',
  company_name: 'Example Company',
  employer_name: 'Example Company',
  url: 'https://example.com/job',
  job_apply_link: 'https://example.com/job',
  location: 'Switzerland',
  remote: true,
  tags: ['Python', 'React'],
  published_at: '2026-10-10T10:00:00Z',
  score: 85,
  match_score: 85,
  semantic_score: 85,
  fit: 'good',
  skills_matched: ['Python'],
  skills_missing: [],
};

function record(message) {
  fs.appendFileSync(progress, `${message}\n`);
}

async function installContentFixtures(page) {
  await mockBackendAPI(page);
  await injectAuth(page);
  await page.route('**/api/v1/cv-generation/**', (route) => route.fulfill({ json: [] }));
  await page.route(/\/api\/v1\/[^/]+-jobs\//, (route) =>
    route.fulfill({ json: { jobs: [fixtureJob], total: 1 } }),
  );
  await page.route('**/api/v1/schools/', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          name: 'Example School',
          monitoring_mode: 'manual_only',
          contact_email: 'office@example.com',
          portal_url: 'https://example.com',
          manual_reminder_interval_days: 30,
        },
      ],
    }),
  );
  await page.route('**/api/v1/schools/jobs/all', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          school_id: 1,
          school_name: 'Example School',
          title: 'Primary Teacher',
          url: 'https://example.com/teacher',
          detected_at: '2026-10-10T10:00:00Z',
          status: 'active',
          urgency_score: 1,
          role_score: 1,
        },
      ],
    }),
  );
  await page.route('**/api/v1/ai-match/analyze/result', (route) =>
    route.fulfill({
      json: {
        available: true,
        source: 'core',
        data: { results: [fixtureJob], metadata: { total_jobs_analyzed: 1, total_time_ms: 20 } },
      },
    }),
  );
  await page.route('**/api/v1/analytics/heatmap-data?*', (route) =>
    route.fulfill({ json: [{ x: 0.4, y: 0.5, count: 3 }] }),
  );
  await page.route('**/api/v1/analytics/stats?*', (route) =>
    route.fulfill({
      json: {
        total_visitors: 142,
        unique_countries: 18,
        visits_today: 7,
        recent_visitors: [
          {
            timestamp: '2026-10-10T10:00:00Z',
            country: 'Switzerland',
            city: 'Zurich',
            ip_address: '192.0.2.1',
          },
        ],
      },
    }),
  );
  await page.route('**/api/v1/analytics/map-data', (route) =>
    route.fulfill({
      json: [
        {
          latitude: 47.37,
          longitude: 8.54,
          city: 'Zurich',
          country: 'Switzerland',
          ip_address: '192.0.2.1',
        },
      ],
    }),
  );
  await page.route('**/api/v1/analytics/chat/full-stats', (route) =>
    route.fulfill({
      json: {
        general: {
          total_conversations: 56,
          total_questions: 234,
          success_rate: 98,
          avg_response_time_ms: 150,
        },
        top_questions: [],
        timeline_daily: [],
        by_country: [],
      },
    }),
  );
}

async function inspectWindows(page) {
  await page.waitForFunction(() => document.querySelectorAll('.floating-window').length === 12, {}, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => document.querySelectorAll('.floating-window.window-collapsed').length === 12,
    {},
    { timeout: 20_000 },
  );

  const ids = await page
    .locator('.floating-window')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-labelledby')));
  const windows = [];
  for (const id of ids) {
    record(`open ${id}`);
    const window = page.locator(`[aria-labelledby="${id}"]`);
    await window.getByRole('button', { name: 'Minimize', exact: true }).click();
    await window.locator('.window-content').waitFor({ state: 'visible', timeout: 10_000 });
    const content = await window.locator('.window-content').innerText();
    if (content.trim().length < 10) throw new Error(`Empty window: ${id}`);
    windows.push({ id, characters: content.length, hasContent: true });
    await window.getByRole('button', { name: 'Minimize', exact: true }).click();
    record(`closed ${id} ${content.length}`);
  }
  return windows;
}

async function withTimeout(operation, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function measureDrag(page) {
  const window = page.locator('[aria-labelledby="stats-window-title"]');
  await window.getByRole('button', { name: 'Minimize', exact: true }).click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const measurements = [];

  for (let repetition = 0; repetition < 3; repetition += 1) {
    const box = await window.locator('.window-header').boundingBox();
    if (!box) throw new Error('Stats window header has no bounding box');
    const x = box.x + Math.min(180, box.width - 20);
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.evaluate(() => {
      window.__measurementFrames = [];
      window.__measurementRunning = true;
      let previous = performance.now();
      function frame(now) {
        if (!window.__measurementRunning) return;
        window.__measurementFrames.push(now - previous);
        previous = now;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const before = Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]),
    );
    const started = Date.now();
    for (let step = 1; step <= 120; step += 1) {
      await page.mouse.move(
        x + Math.sin((step * Math.PI) / 60) * 120,
        y + Math.sin((step * Math.PI) / 120) * 70,
      );
    }
    await page.mouse.up();
    const frames = await page.evaluate(() => {
      window.__measurementRunning = false;
      return window.__measurementFrames.slice(1);
    });
    const after = Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]),
    );
    if (frames.length === 0) throw new Error('Drag measurement captured no animation frames');
    frames.sort((a, b) => a - b);
    measurements.push({
      durationMs: Date.now() - started,
      frames: frames.length,
      meanFrameMs: frames.reduce((sum, value) => sum + value, 0) / frames.length,
      p95FrameMs: frames[Math.ceil(frames.length * 0.95) - 1],
      layouts: after.LayoutCount - before.LayoutCount,
      taskMs: (after.TaskDuration - before.TaskDuration) * 1000,
    });
  }
  return measurements;
}

async function main() {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(progress, `start ${new Date().toISOString()}\n`);
  const browser = await chromium.launch({ headless: process.env.HEADLESS === 'true' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
    const errors = [];
    page.on('pageerror', (error) => errors.push({ message: error.message, stack: error.stack }));
    await installContentFixtures(page);

    const started = Date.now();
    await page.goto(`${targetUrl}/dashboard`);
    await page.waitForFunction(() => document.querySelectorAll('.floating-window').length === 12, {}, {
      timeout: 30_000,
    });
    const loadMs = Date.now() - started;
    record(`loaded ${loadMs}`);
    const windows = await inspectWindows(page);
    const drag = await withTimeout(
      measureDrag(page),
      60_000,
      'Drag measurement exceeded 60 seconds',
    );
    const screenshot = output.endsWith('.json') ? output.slice(0, -5) + '.png' : `${output}.png`;
    await page.screenshot({ path: screenshot });

    const result = {
      url: targetUrl,
      at: new Date().toISOString(),
      viewport: [1440, 1000],
      backend: 'deterministic fixtures',
      loadMs,
      windows,
      errors,
      drag,
    };
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) throw new Error(`Page errors: ${errors.map((error) => error.message).join('; ')}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  record(`error ${error.stack || error}`);
  console.error(error);
  process.exitCode = 1;
});
