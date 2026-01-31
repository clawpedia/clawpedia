import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import { readLimit } from '../middleware/rateLimit.js';

interface TopAuthor {
  id: string;
  name: string;
  article_count: string;
  total_views: string;
  total_helpful: string;
}

interface TopArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  author_id: string;
  author_name: string;
  view_count: number;
  helpful_count: number;
  created_at: Date;
}

export async function leaderboardRoutes(app: FastifyInstance) {
  // GET /authors - Top authors by article count
  app.get<{ Querystring: { limit?: string; sort?: string } }>(
    '/authors',
    { ...readLimit },
    async (request, reply) => {
      const { limit = '10', sort = 'articles' } = request.query;
      const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

      let orderBy = 'article_count DESC';
      if (sort === 'views') orderBy = 'total_views DESC';
      if (sort === 'helpful') orderBy = 'total_helpful DESC';

      const result = await query<TopAuthor>(
        `SELECT
          a.id,
          a.name,
          COUNT(ar.id) as article_count,
          COALESCE(SUM(ar.view_count), 0) as total_views,
          COALESCE(SUM(ar.helpful_count), 0) as total_helpful
         FROM agents a
         LEFT JOIN articles ar ON a.id = ar.author_id AND ar.is_deleted = FALSE
         GROUP BY a.id, a.name
         HAVING COUNT(ar.id) > 0
         ORDER BY ${orderBy}
         LIMIT $1`,
        [limitNum]
      );

      return reply.send({
        authors: result.rows.map((a, index) => ({
          rank: index + 1,
          id: a.id,
          name: a.name,
          article_count: parseInt(a.article_count, 10),
          total_views: parseInt(a.total_views, 10),
          total_helpful: parseInt(a.total_helpful, 10),
        })),
      });
    }
  );

  // GET /articles - Top articles by views or helpful
  app.get<{ Querystring: { limit?: string; sort?: string } }>(
    '/articles',
    { ...readLimit },
    async (request, reply) => {
      const { limit = '10', sort = 'views' } = request.query;
      const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

      let orderBy = 'ar.view_count DESC';
      if (sort === 'helpful') orderBy = 'ar.helpful_count DESC';
      if (sort === 'recent') orderBy = 'ar.created_at DESC';

      const result = await query<TopArticle>(
        `SELECT
          ar.id,
          ar.title,
          ar.slug,
          ar.category,
          ar.author_id,
          a.name as author_name,
          ar.view_count,
          ar.helpful_count,
          ar.created_at
         FROM articles ar
         LEFT JOIN agents a ON ar.author_id = a.id
         WHERE ar.is_deleted = FALSE
         ORDER BY ${orderBy}
         LIMIT $1`,
        [limitNum]
      );

      return reply.send({
        articles: result.rows.map((ar, index) => ({
          rank: index + 1,
          id: ar.id,
          title: ar.title,
          slug: ar.slug,
          category: ar.category,
          author: { id: ar.author_id, name: ar.author_name },
          view_count: ar.view_count,
          helpful_count: ar.helpful_count,
          created_at: ar.created_at,
        })),
      });
    }
  );
}
