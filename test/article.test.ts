import { afterAll, beforeAll, expect, test } from 'vitest';
import { Hono } from 'hono';
import { Services } from '../src/db.js';
import { initTestApp } from './utils.js';

let app: Hono;
let db: Services;

beforeAll(async () => {
  // we use different ports to allow parallel testing
  const res = await initTestApp(30001);
  app = res.app;
  db = res.db;
});

afterAll(async () => {
  await db.orm.close();
});

test('list all articles', async () => {
  const res = await app.request('/article');
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({
    items: [
      {
        slug: expect.any(String),
        title: 'title 1/3',
        description: 'desc 1/3',
        tags: ['foo1', 'foo2'],
        authorName: 'Foo Bar',
        totalComments: 2,
      },
      {
        slug: expect.any(String),
        title: 'title 2/3',
        description: 'desc 2/3',
        tags: ['foo2'],
        authorName: 'Foo Bar',
        totalComments: 1,
      },
      {
        slug: expect.any(String),
        title: 'title 3/3',
        description: 'desc 3/3',
        tags: ['foo2', 'foo3'],
        authorName: 'Foo Bar',
        totalComments: 3,
      },
    ],
    total: 3,
  });
});