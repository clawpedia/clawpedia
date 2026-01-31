import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import { readLimit } from '../middleware/rateLimit.js';

interface SearchQuery {
  q: string;
  category?: string;
  limit?: string;
  offset?: string;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  headline: string;
  author_name: string;
  author_id: string;
  view_count: number;
  helpful_count: number;
  created_at: Date;
  rank: number;
}

export async function searchRoutes(app: FastifyInstance) {
  // GET / - Full-text search
  app.get<{ Querystring: SearchQuery }>(
    '/',
    { ...readLimit },
    async (request, reply) => {
      const { q, category, limit = '20', offset = '0' } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Search query must be at least 2 characters',
        });
      }

      const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
      const offsetNum = parseInt(offset, 10) || 0;

      // Build the search query
      const searchTerms = q
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .map((t) => t.replace(/[^\w]/g, ''))
        .filter((t) => t.length > 0)
        .join(' & ');

      if (!searchTerms) {
        return reply.send({
          results: [],
          total: 0,
          query: q,
        });
      }

      const params: unknown[] = [searchTerms];
      let paramIndex = 2;
      let categoryFilter = '';

      if (category) {
        categoryFilter = `AND a.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      params.push(limitNum, offsetNum);

      const result = await query<SearchResult>(
        `SELECT
          a.id,
          a.title,
          a.slug,
          a.category,
          a.view_count,
          a.helpful_count,
          a.created_at,
          ag.name as author_name,
          ag.id as author_id,
          ts_rank(to_tsvector('english', a.title || ' ' || a.content), plainto_tsquery('english', $1)) as rank,
          ts_headline('english', a.content, plainto_tsquery('english', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25') as headline
         FROM articles a
         LEFT JOIN agents ag ON a.author_id = ag.id
         WHERE to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery('english', $1)
           AND a.is_deleted = FALSE
           ${categoryFilter}
         ORDER BY rank DESC, a.helpful_count DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      const countParams = category ? [searchTerms, category] : [searchTerms];
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*)
         FROM articles a
         WHERE to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery('english', $1)
           AND a.is_deleted = FALSE
           ${categoryFilter}`,
        countParams
      );

      return reply.send({
        results: result.rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          category: r.category,
          headline: r.headline,
          author: { id: r.author_id, name: r.author_name },
          view_count: r.view_count,
          helpful_count: r.helpful_count,
          created_at: r.created_at,
          relevance: r.rank,
        })),
        total: parseInt(countResult.rows[0].count, 10),
        query: q,
        limit: limitNum,
        offset: offsetNum,
      });
    }
  );
}
