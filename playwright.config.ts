import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import 'dotenv/config'
// require('dotenv').config();

// Dashboard/CI drives the container through env vars (passed via `docker run -e`):
//   BASE_URL  target under test           TAGS     space-separated tag filter, e.g. "@app @smoke"
//   WORKERS   parallelism                 RETRIES  retry count
//   INGEST_URL + RUN_TOKEN                enable live reporting back to the dashboard
// All are optional; with none set the suite runs exactly as before.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// TAGS is a space-separated list; match tests carrying ANY of the given tags.
const tags = (process.env.TAGS ?? '').trim();
const grep = tags ? new RegExp(tags.split(/\s+/).map(escapeRegExp).join('|')) : undefined;

const workers = process.env.WORKERS ? Number(process.env.WORKERS) : (process.env.CI ? 2 : undefined);
const retries = process.env.RETRIES ? Number(process.env.RETRIES) : (process.env.CI ? 1 : 0);

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never', outputFile: './results.html' }],
  ['json', { outputFile: './results.json' }],
];
// Stream results back to the dashboard only when it handed us an ingest target.
if (process.env.INGEST_URL && process.env.RUN_TOKEN) {
  reporters.push(['./reporters/dashboard-reporter.ts', {}]);
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries,
  workers,
  grep,
  reporter: reporters,
  use: {
    baseURL: process.env.BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
