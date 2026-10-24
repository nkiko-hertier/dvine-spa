import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// The version is a digest over both tables; the lists are what the booking
// page reads. Prisma is mocked so this runs without a database.
const CATEGORIES_DIGEST = '0123456789abcdef0123456789abcdef';
const TREATMENTS_DIGEST = 'fedcba9876543210fedcba9876543210';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: async (strings: TemplateStringsArray) =>
      strings.join('').includes('string_agg')
        ? [{ categories: CATEGORIES_DIGEST, treatments: TREATMENTS_DIGEST }]
        : [{ '?column?': 1 }],
    category: {
      findMany: async () => [
        {
          id: 'c1',
          name: 'Massage',
          description: null,
          coverImageUrl: null,
          displayOrder: 1,
          _count: { treatments: 2 },
        },
      ],
    },
    treatment: {
      findMany: async () => [],
      count: async () => 0,
    },
  },
  disconnectPrisma: async () => undefined,
}));

// clerkMiddleware() rejects every request without a publishable key; the
// public routes under test sit behind it. Throwaway dev-instance keys, the
// same ones .env.example ships, nothing here talks to Clerk.
process.env.CLERK_PUBLISHABLE_KEY ??= 'pk_test_ZGl2ZXJzZS1wYW5nb2xpbi02NS5jbGVyay5hY2NvdW50cy5kZXYk';
process.env.CLERK_SECRET_KEY ??= 'sk_test_000000000000000000000000000000000000000000';

const { createApp } = await import('../app.js');
const expectedVersion = `${CATEGORIES_DIGEST.slice(0, 16)}.${TREATMENTS_DIGEST.slice(0, 16)}`;

describe('GET /catalog/version', () => {
  it('reports a digest of both tables and is only briefly edge-cacheable', async () => {
    const res = await request(createApp()).get('/catalog/version');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { version: expectedVersion } });
    expect(res.headers['cache-control']).toBe('public, max-age=0, s-maxage=5, must-revalidate');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('catalog lists carry their version', () => {
  it('stamps X-Catalog-Version on GET /categories and exposes it to browsers', async () => {
    const res = await request(createApp()).get('/categories').set('Origin', 'https://booking.example');

    expect(res.status).toBe(200);
    expect(res.headers['x-catalog-version']).toBe(expectedVersion);
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Catalog-Version/i);
    expect(res.body.data[0]).toMatchObject({ id: 'c1', name: 'Massage', treatment_count: 2 });
  });

  it('stamps X-Catalog-Version on GET /treatments', async () => {
    const res = await request(createApp()).get('/treatments');

    expect(res.status).toBe(200);
    expect(res.headers['x-catalog-version']).toBe(expectedVersion);
  });
});
