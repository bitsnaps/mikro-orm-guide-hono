import { Hono } from 'hono';
import { wrap } from '@mikro-orm/sqlite';
import { initORM } from '../../db.js';
import { Article } from './article.entity.js';
import { getUserFromToken, verifyArticlePermissions } from '../common/utils.js';

const articleRoutes = new Hono();

// list articles
articleRoutes.get('/', async c => {
  const db = await initORM();
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined;
  const offset = c.req.query('offset') ? Number(c.req.query('offset')) : undefined;

  // start with simple findAndCount
  const { items, total } = await db.article.listArticles({
    limit, offset, cache: 5_000,
  });

  return c.json({ items, total });
});

// article detail
articleRoutes.get('/:slug', async c => {
  const db = await initORM();
  const slug = c.req.param('slug');
  const article = await db.article.findOneOrFail({ slug }, {
    populate: ['author', 'comments.author', 'text'],
  });
  return c.json(article);
});

// create comment
articleRoutes.post('/:slug/comment', async c => {
  const db = await initORM();
  const slug = c.req.param('slug');
  const { text } = await c.req.json() as { text: string };
  const author = getUserFromToken(c);
  const article = await db.article.findOneOrFail({ slug });
  const comment = db.comment.create({ author, article, text });

  // mention this is in fact a no-op, as it will be automatically propagated by setting Comment.author
  article.comments.add(comment);

  // mention we don't need to persist anything explicitly
  await db.em.flush();

  return c.json(comment);
});

// create article
articleRoutes.post('/', async c => {
  const db = await initORM();
  const { title, description, text } = await c.req.json() as { title: string; description: string; text: string };
  const author = getUserFromToken(c);
  const article = db.article.create({
    title, description, text,
    author,
  });

  await db.em.flush();

  return c.json(article);
});

// update article
articleRoutes.patch('/:id', async c => {
  const db = await initORM();
  const user = getUserFromToken(c);
  const id = c.req.param('id');
  const article = await db.article.findOneOrFail(+id);
  verifyArticlePermissions(user, article);
  wrap(article).assign(await c.req.json() as Article);
  await db.em.flush();

  return c.json(article);
});

// delete article
articleRoutes.delete('/:id', async c => {
  const db = await initORM();
  const user = getUserFromToken(c);
  const id = c.req.param('id');
  const article = await db.article.findOne(+id);

  if (!article) {
    return c.json({ notFound: true }, 404);
  }

  verifyArticlePermissions(user, article);
  // mention `nativeDelete` alternative if we don't care about validations much
  await db.em.remove(article).flush();

  return c.json({ success: true });
});

export { articleRoutes };