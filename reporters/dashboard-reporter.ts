import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

// Dashboard reporter — posts run/test events to the QA dashboard's ingest
// endpoint as the suite runs, so a triggered run streams live under Runs.
//
// Active only when INGEST_URL and RUN_TOKEN are set (the dashboard/CI passes
// them via `docker run -e`). Without them the reporter is a no-op, so the same
// image still runs standalone (`docker run sd-e2e:local`).
//
// Contract (dashboard src/lib/domain/events.ts):
//   POST $INGEST_URL   Authorization: Bearer $RUN_TOKEN
//   body: { type, testCaseId?, title?, durationMs?, attempts?, error?, totals?, seq, ts }
//   types: run.started | test.passed | test.failed | test.skipped | run.finished
// testCaseId comes from each test's `@id` annotation (e.g. AUTH-001).

type EventType =
  | 'run.started'
  | 'test.passed'
  | 'test.failed'
  | 'test.skipped'
  | 'run.finished';

type Status = 'passed' | 'failed' | 'skipped' | 'flaky';

interface ReporterEvent {
  type: EventType;
  testCaseId?: string;
  title?: string;
  durationMs?: number;
  attempts?: number;
  error?: string;
  totals?: Record<Status, number>;
  seq?: number;
  ts?: number;
}

const INGEST_URL = process.env.INGEST_URL;
const RUN_TOKEN = process.env.RUN_TOKEN;

export default class DashboardReporter implements Reporter {
  private seq = 0;
  private inflight: Promise<unknown>[] = [];
  private everFailed = new Set<string>();
  private finalByTest = new Map<string, Status>();

  private enabled(): boolean {
    return Boolean(INGEST_URL && RUN_TOKEN);
  }

  private post(event: ReporterEvent): void {
    if (!this.enabled()) return;
    event.seq = this.seq++;
    event.ts = Date.now();
    const p = fetch(INGEST_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUN_TOKEN}`,
      },
      body: JSON.stringify(event),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.error(`[dashboard-reporter] ${event.type} -> ${res.status} ${body}`);
        }
      })
      .catch((err) => {
        console.error(`[dashboard-reporter] ${event.type} failed:`, err?.message ?? err);
      });
    this.inflight.push(p);
  }

  private testCaseId(test: TestCase): string | undefined {
    return test.annotations.find((a) => a.type === 'id')?.description ?? undefined;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    if (!this.enabled()) {
      console.log('[dashboard-reporter] INGEST_URL/RUN_TOKEN not set — dashboard reporting disabled.');
      return;
    }
    console.log(`[dashboard-reporter] reporting to ${INGEST_URL}`);
    this.post({ type: 'run.started' });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.enabled()) return;
    const testCaseId = this.testCaseId(test);
    // Key on the stable testCaseId when present, else the title, so retries of
    // the same test collapse to one final status.
    const key = testCaseId ?? test.title;

    let type: EventType;
    let status: Status;
    if (result.status === 'skipped') {
      type = 'test.skipped';
      status = 'skipped';
    } else if (result.status === 'passed') {
      type = 'test.passed';
      status = this.everFailed.has(key) ? 'flaky' : 'passed';
    } else {
      // failed | timedOut | interrupted
      this.everFailed.add(key);
      type = 'test.failed';
      status = 'failed';
    }
    this.finalByTest.set(key, status);

    const error =
      result.errors
        ?.map((e) => e.message ?? String(e))
        .join('\n')
        .slice(0, 4000) || undefined;

    this.post({
      type,
      testCaseId,
      title: test.title,
      durationMs: result.duration,
      attempts: result.retry + 1,
      error,
    });
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (!this.enabled()) return;
    const totals: Record<Status, number> = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
    for (const status of this.finalByTest.values()) totals[status] += 1;
    this.post({ type: 'run.finished', totals });
    // Flush every in-flight POST before the process exits.
    await Promise.allSettled(this.inflight);
    console.log(`[dashboard-reporter] flushed ${this.inflight.length} events; totals`, totals);
  }
}
