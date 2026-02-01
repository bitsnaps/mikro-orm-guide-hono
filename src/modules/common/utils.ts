import { Context } from 'hono';
import { User } from '../user/user.entity.js';
import { Article } from '../article/article.entity.js';

export function getUserFromToken(c: Context): User {
  const user = c.get('user') as User;

  if (!user) {
    throw new Error('Please provide your token via Authorization header');
  }

  return user;
}

export function verifyArticlePermissions(user: User, article: Article): void {
  if (article.author.id !== user.id) {
    throw new Error('You are not the author of this article!');
  }
}

export class AuthError extends Error {}
