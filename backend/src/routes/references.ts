import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { readLimit } from '../middleware/rateLimit.js';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface Reference {
  from_article_id: string;
  to_article_id: string;
  created_at: Date;
}

interface CreateReferenceBody {
  to_slug: string;
}

export async function referenceRoutes(app: FastifyInstance) {
  // POST /articles/:slug/references - Create a reference link
  app.post<{ Params: { slug: string }; Body: CreateReferenceBody }>(
    '/articles/:slug/references',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { slug } = request.params;
      const { to_slug } = request.body;

      if (!to_slug) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'to_slug is required',
        });
      }

      // Get source article
      const fromArticle = await query<Article>(
        'SELECT id FROM articles WHERE slug = $1 AND is_deleted = FALSE',
        [slug]
      );

      if (fromArticle.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Source article not found',
        });
      }

      // Get target article
      const toArticle = await query<Article>(
        'SELECT id FROM articles WHERE slug = $1 AND is_deleted = FALSE',
        [to_slug]
      );

      if (toArticle.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Target article not found',
        });
      }

      if (fromArticle.rows[0].id === toArticle.rows[0].id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot reference the same article',
        });
      }

      // Create reference
      await query<Reference>(
        `INSERT INTO article_references (from_article_id, to_article_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [fromArticle.rows[0].id, toArticle.rows[0].id]
      );

      return reply.status(201).send({
        message: 'Reference created successfully',
        from_slug: slug,
        to_slug: to_slug,
      });
    }
  );

  // GET /articles/:slug/references - Get bidirectional references
  app.get<{ Params: { slug: string } }>(
    '/articles/:slug/references',
    { ...readLimit },
    async (request, reply) => {
      const { slug } = request.params;

      const article = await query<Article>(
        'SELECT id FROM articles WHERE slug = $1',
        [slug]
      );

      if (article.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      const articleId = article.rows[0].id;

      // Get outgoing references (articles this one links to)
      const outgoing = await query<Article>(
        `SELECT a.id, a.title, a.slug, a.category
         FROM articles a
         JOIN article_references r ON a.id = r.to_article_id
         WHERE r.from_article_id = $1 AND a.is_deleted = FALSE`,
        [articleId]
      );

      // Get incoming references (articles that link to this one)
      const incoming = await query<Article>(
        `SELECT a.id, a.title, a.slug, a.category
         FROM articles a
         JOIN article_references r ON a.id = r.from_article_id
         WHERE r.to_article_id = $1 AND a.is_deleted = FALSE`,
        [articleId]
      );

      return reply.send({
        references_to: outgoing.rows.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
        })),
        referenced_by: incoming.rows.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
        })),
      });
    }
  );

  // DELETE /articles/:slug/references/:toSlug - Remove a reference
  app.delete<{ Params: { slug: string; toSlug: string } }>(
    '/articles/:slug/references/:toSlug',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { slug, toSlug } = request.params;

      const fromArticle = await query<Article>(
        'SELECT id FROM articles WHERE slug = $1',
        [slug]
      );

      const toArticle = await query<Article>(
        'SELECT id FROM articles WHERE slug = $1',
        [toSlug]
      );

      if (fromArticle.rows.length === 0 || toArticle.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      await query(
        'DELETE FROM article_references WHERE from_article_id = $1 AND to_article_id = $2',
        [fromArticle.rows[0].id, toArticle.rows[0].id]
      );

      return reply.send({
        message: 'Reference removed',
      });
    }
  );
}
