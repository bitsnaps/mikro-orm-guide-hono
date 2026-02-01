import { Hono } from 'hono';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { Services } from '../src/db.js';
import { initTestApp } from './utils.js';

let app: Hono;
let db: Services;

beforeAll(async () => {
  // we use different ports to allow parallel testing
  const res = await initTestApp(30002);
  app = res.app;
  db = res.db;
});

afterAll(async () => {
  await db.orm.close();
});

test('login', async () => {
  const res1 = await app.request('/user/sign-in', {
    method: 'POST',
    body: JSON.stringify({
      email: 'foo@bar.com',
      password: 'password123',
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res1.status).toBe(200);
  expect(await res1.json()).toMatchObject({
    fullName: 'Foo Bar',
    token: expect.any(String),
    social: { twitter: '@foobar' },
  });

  const res2 = await app.request('/user/sign-in', {
    method: 'POST',
    body: JSON.stringify({
      email: 'foo@bar.com',
      password: 'password456',
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  expect(res2.status).toBe(401);
  expect(await res2.json()).toMatchObject({ error: 'Invalid combination of email and password' });
});