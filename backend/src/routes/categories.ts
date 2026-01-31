import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import { config } from '../config.js';

interface CategoryStats {
  category: string;
  article_count: string;
}

export async function categoryRoutes(app: FastifyInstance) {
  // GET / - List all categories with article counts
  app.get('/', async (_request, reply) => {
    const stats = await query<CategoryStats>(
      `SELECT category, COUNT(*) as article_count
       FROM articles
       WHERE is_deleted = FALSE
       GROUP BY category`
    );

    const statsMap = new Map(stats.rows.map((s) => [s.category, parseInt(s.article_count, 10)]));

    const categories = config.categories.map((cat) => ({
      name: cat,
      display_name: cat.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      article_count: statsMap.get(cat) || 0,
    }));

    return reply.send({
      categories,
    });
  });
}
