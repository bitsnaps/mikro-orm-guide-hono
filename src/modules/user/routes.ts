import { wrap } from '@mikro-orm/sqlite';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { z } from 'zod';
import { initORM } from '../../db.js';
import { User } from './user.entity.js';
import { getUserFromToken } from '../common/utils.js';

const socialSchema = z.object({
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
});

const userSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  password: z.string(),
  bio: z.string().optional(),
  social: socialSchema.optional(),
});

const userRoutes = new Hono();
const JWT_SECRET = process.env.JWT_SECRET ?? '12345678';

// register new user
userRoutes.post('/sign-up', async c => {
  const db = await initORM();
  const body = await c.req.json();
  const dto = userSchema.parse(body);

  if (await db.user.exists(dto.email)) {
    throw new Error('This email is already registered, maybe you want to sign in?');
  }

  // thanks to zod, our `dto` is fully typed and passes the `em.create()` checks
  const user = db.user.create(dto);
  await db.em.flush(); // no need for explicit `em.persist()` when we use `em.create()`

  // after flush, we have the `user.id` set
  user.token = await sign({ id: user.id }, JWT_SECRET, 'HS256');

  return c.json(user);
});

// login existing user
userRoutes.post('/sign-in', async c => {
  const db = await initORM();
  const { email, password } = await c.req.json() as { email: string; password: string };
  const user = await db.user.login(email, password);
  user.token = await sign({ id: user.id }, JWT_SECRET, 'HS256');

  return c.json(user);
});

userRoutes.get('/profile', async c => {
  const user = getUserFromToken(c);
  return c.json(user);
});

userRoutes.patch('/profile', async c => {
  const db = await initORM();
  const user = getUserFromToken(c);
  wrap(user).assign(await c.req.json() as User);
  await db.em.flush();
  return c.json(user);
});

export { userRoutes };
