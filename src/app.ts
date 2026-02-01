import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { verify } from 'hono/jwt';
import { RequestContext, NotFoundError } from '@mikro-orm/sqlite';
import { initORM } from './db.js';
import { userRoutes } from './modules/user/routes.js';
import { articleRoutes } from './modules/article/routes.js';
import { AuthError } from './modules/common/utils.js';
import { User } from './modules/user/user.entity.js';

type Variables = {
  user: User;
};

export async function bootstrap(port = 3001, migrate = true) {
  const db = await initORM();

  if (migrate) {
    // sync the schema
    await db.orm.migrator.up();
  }

  const app = new Hono<{ Variables: Variables }>();
  app.use(logger());

  // register request context hook
  app.use(async (c, next) => {
    return RequestContext.create(db.em, next);
  });

  const JWT_SECRET = process.env.JWT_SECRET ?? '12345678';

  // register auth hook after the ORM one to use the context
  app.use(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = await verify(token, JWT_SECRET, 'HS256');
        const user = await db.user.findOneOrFail(payload.id as number);
        c.set('user', user);
      } catch (e) {
        // ignore token errors, we validate the request.user exists only where needed
      }
    }
    await next();
  });

  // register global error handler
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json({ error: err.message }, 401);
    }

    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }

    console.error(err);
    return c.json({ error: err.message }, 500);
  });

  app.route('/user', userRoutes);
  app.route('/article', articleRoutes);

  return { app, port, db };
}