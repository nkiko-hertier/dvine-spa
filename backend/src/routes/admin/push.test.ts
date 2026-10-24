import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Clerk's middleware needs keys present to build; these are the same dev
// placeholders .env.example ships and nothing here talks to Clerk.
process.env.CLERK_PUBLISHABLE_KEY ??= 'pk_test_ZGl2ZXJzZS1wYW5nb2xpbi02NS5jbGVyay5hY2NvdW50cy5kZXYk';
process.env.CLERK_SECRET_KEY ??= 'sk_test_000000000000000000000000000000000000000000';

const { createApp } = await import('../../app.js');

/**
 * The push endpoints without a session, and the cron sweep without its
 * secret. Both are the boundary that matters: a device can only be
 * registered by a signed-in staff member, and the sweep that makes every
 * staff phone buzz cannot be triggered from outside.
 */
describe('push endpoints', () => {
  let app: ReturnType<typeof createApp>;
  beforeAll(() => {
    app = createApp();
  });

  it('refuses to register a device without a session', async () => {
    const res = await request(app)
      .post('/admin/push/subscribe')
      .send({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'k', auth: 'a' } });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refuses to list devices without a session', async () => {
    const res = await request(app).get('/admin/push/devices');
    expect(res.status).toBe(401);
  });

  it('refuses to send a test without a session', async () => {
    const res = await request(app).post('/admin/push/test');
    expect(res.status).toBe(401);
  });
});

describe('scheduled attention sweep', () => {
  // The sweep makes every staff phone buzz, so the only thing that must
  // always hold is this: no call without the secret ever runs it. Whether
  // it answers 404 (no CRON_SECRET configured here) or 401 (configured,
  // wrong token) depends on the environment the suite runs in; both are a
  // refusal, and neither is a 200.
  it('never runs without the secret', async () => {
    const app = createApp();

    const noToken = await request(app).get('/internal/cron/attention');
    const wrongToken = await request(app)
      .get('/internal/cron/attention')
      .set('authorization', 'Bearer definitely-not-the-secret');

    expect([401, 404]).toContain(noToken.status);
    expect([401, 404]).toContain(wrongToken.status);
    expect(noToken.body.success).toBe(false);
    expect(wrongToken.body.success).toBe(false);
  });
});
