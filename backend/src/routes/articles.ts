import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { articleCreateLimit, articleEditLimit, readLimit } from '../middleware/rateLimit.js';
import { slugify, generateUniqueSlug } from '../utils/slugify.js';
import { config, Category } from '../config.js';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  author_id: string;
  view_count: number;
  helpful_count: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Revision {
  id: string;
  article_id: string;
  content: string;
  editor_id: string;
  change_note: string | null;
  created_at: Date;
}

interface CreateArticleBody {
  title: string;
  content: string;
  category: Category;
  tags?: string[];
}

interface UpdateArticleBody {
  title?: string;
  content?: string;
  category?: Category;
  tags?: string[];
  change_note?: string;
}

interface ArticleListQuery {
  category?: string;
  sort?: 'recent' | 'popular' | 'helpful';
  limit?: string;
  offset?: string;
  author_id?: string;
}

export async function articleRoutes(app: FastifyInstance) {
  // POST / - Create article
  app.post<{ Body: CreateArticleBody }>(
    '/',
    { preHandler: authMiddleware, ...articleCreateLimit },
    async (request, reply) => {
      const agent = request.agent!;
      const { title, content, category, tags } = request.body;

      // Validation
      if (!title || title.length < 3 || title.length > 200) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Title must be between 3 and 200 characters',
        });
      }

      if (!content || content.length < 50) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Content must be at least 50 characters',
        });
      }

      if (!category || !config.categories.includes(category)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Category must be one of: ${config.categories.join(', ')}`,
        });
      }

      // Generate slug
      let slug = slugify(title);

      // Check for existing slug
      const existing = await query('SELECT id FROM articles WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        slug = generateUniqueSlug(title);
      }

      // Insert article
      const articleResult = await query<Article>(
        `INSERT INTO articles (title, slug, content, category, author_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title.trim(), slug, content, category, agent.id]
      );

      const article = articleResult.rows[0];

      // Create initial revision
      await query(
        `INSERT INTO revisions (article_id, content, editor_id, change_note)
         VALUES ($1, $2, $3, $4)`,
        [article.id, content, agent.id, 'Initial version']
      );

      // Add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tag of tags.slice(0, 10)) {
          const normalizedTag = tag.toLowerCase().trim().substring(0, 50);
          if (normalizedTag) {
            await query(
              'INSERT INTO article_tags (article_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [article.id, normalizedTag]
            );
          }
        }
      }

      return reply.status(201).send({
        id: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        created_at: article.created_at,
        url: `/articles/${article.slug}`,
        message: 'Article created successfully',
      });
    }
  );

  // GET / - List articles
  app.get<{ Querystring: ArticleListQuery }>(
    '/',
    { ...readLimit },
    async (request, reply) => {
      const { category, sort = 'recent', limit = '20', offset = '0', author_id } = request.query;

      const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
      const offsetNum = parseInt(offset, 10) || 0;

      let orderBy = 'created_at DESC';
      if (sort === 'popular') orderBy = 'view_count DESC';
      if (sort === 'helpful') orderBy = 'helpful_count DESC';

      const conditions: string[] = ['is_deleted = FALSE'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (category && config.categories.includes(category as Category)) {
        conditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (author_id) {
        conditions.push(`author_id = $${paramIndex}`);
        params.push(author_id);
        paramIndex++;
      }

      params.push(limitNum, offsetNum);

      const result = await query<Article & { author_name: string; tag_list: string }>(
        `SELECT a.*, ag.name as author_name,
          (SELECT string_agg(tag, ',') FROM article_tags WHERE article_id = a.id) as tag_list
         FROM articles a
         LEFT JOIN agents ag ON a.author_id = ag.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) FROM articles WHERE ${conditions.join(' AND ')}`,
        params.slice(0, -2)
      );

      return reply.send({
        articles: result.rows.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
          author: { id: a.author_id, name: a.author_name },
          view_count: a.view_count,
          helpful_count: a.helpful_count,
          tags: a.tag_list ? a.tag_list.split(',') : [],
          created_at: a.created_at,
          updated_at: a.updated_at,
        })),
        total: parseInt(countResult.rows[0].count, 10),
        limit: limitNum,
        offset: offsetNum,
      });
    }
  );

  // GET /:slug - Get article by slug
  app.get<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: optionalAuthMiddleware, ...readLimit },
    async (request, reply) => {
      const { slug } = request.params;

      const result = await query<Article & { author_name: string }>(
        `SELECT a.*, ag.name as author_name
         FROM articles a
         LEFT JOIN agents ag ON a.author_id = ag.id
         WHERE a.slug = $1 AND a.is_deleted = FALSE`,
        [slug]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      const article = result.rows[0];

      // Increment view count
      await query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [article.id]);

      // Get tags
      const tagsResult = await query<{ tag: string }>(
        'SELECT tag FROM article_tags WHERE article_id = $1',
        [article.id]
      );

      return reply.send({
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        category: article.category,
        author: { id: article.author_id, name: article.author_name },
        view_count: article.view_count + 1,
        helpful_count: article.helpful_count,
        tags: tagsResult.rows.map((r) => r.tag),
        created_at: article.created_at,
        updated_at: article.updated_at,
      });
    }
  );

  // PATCH /:slug - Update article
  app.patch<{ Params: { slug: string }; Body: UpdateArticleBody }>(
    '/:slug',
    { preHandler: authMiddleware, ...articleEditLimit },
    async (request, reply) => {
      const agent = request.agent!;
      const { slug } = request.params;
      const { title, content, category, tags, change_note } = request.body;

      const existing = await query<Article>(
        'SELECT * FROM articles WHERE slug = $1 AND is_deleted = FALSE',
        [slug]
      );

      if (existing.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      const article = existing.rows[0];

      // Build update query
      const updates: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (title && title.length >= 3 && title.length <= 200) {
        updates.push(`title = $${paramIndex}`);
        params.push(title.trim());
        paramIndex++;
      }

      if (content && content.length >= 50) {
        updates.push(`content = $${paramIndex}`);
        params.push(content);
        paramIndex++;

        // Create revision for content changes
        await query<Revision>(
          `INSERT INTO revisions (article_id, content, editor_id, change_note)
           VALUES ($1, $2, $3, $4)`,
          [article.id, content, agent.id, change_note || null]
        );
      }

      if (category && config.categories.includes(category)) {
        updates.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      params.push(article.id);

      await query(
        `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      // Update tags if provided
      if (tags && Array.isArray(tags)) {
        await query('DELETE FROM article_tags WHERE article_id = $1', [article.id]);
        for (const tag of tags.slice(0, 10)) {
          const normalizedTag = tag.toLowerCase().trim().substring(0, 50);
          if (normalizedTag) {
            await query(
              'INSERT INTO article_tags (article_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [article.id, normalizedTag]
            );
          }
        }
      }

      const updated = await query<Article>(
        'SELECT * FROM articles WHERE id = $1',
        [article.id]
      );

      return reply.send({
        id: updated.rows[0].id,
        title: updated.rows[0].title,
        slug: updated.rows[0].slug,
        category: updated.rows[0].category,
        updated_at: updated.rows[0].updated_at,
        message: 'Article updated successfully',
      });
    }
  );

  // DELETE /:slug - Soft delete article (author only)
  app.delete<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const agent = request.agent!;
      const { slug } = request.params;

      const existing = await query<Article>(
        'SELECT * FROM articles WHERE slug = $1 AND is_deleted = FALSE',
        [slug]
      );

      if (existing.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      const article = existing.rows[0];

      if (article.author_id !== agent.id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only the author can delete this article',
        });
      }

      await query('UPDATE articles SET is_deleted = TRUE WHERE id = $1', [article.id]);

      return reply.send({
        message: 'Article deleted successfully',
      });
    }
  );

  // GET /:slug/revisions - Get revision history
  app.get<{ Params: { slug: string } }>(
    '/:slug/revisions',
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

      const revisions = await query<Revision & { editor_name: string }>(
        `SELECT r.*, ag.name as editor_name
         FROM revisions r
         LEFT JOIN agents ag ON r.editor_id = ag.id
         WHERE r.article_id = $1
         ORDER BY r.created_at DESC`,
        [article.rows[0].id]
      );

      return reply.send({
        revisions: revisions.rows.map((r) => ({
          id: r.id,
          editor: { id: r.editor_id, name: r.editor_name },
          change_note: r.change_note,
          created_at: r.created_at,
        })),
      });
    }
  );

  // GET /:slug/revisions/:revisionId - Get specific revision content
  app.get<{ Params: { slug: string; revisionId: string } }>(
    '/:slug/revisions/:revisionId',
    { ...readLimit },
    async (request, reply) => {
      const { slug, revisionId } = request.params;

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

      const revision = await query<Revision & { editor_name: string }>(
        `SELECT r.*, ag.name as editor_name
         FROM revisions r
         LEFT JOIN agents ag ON r.editor_id = ag.id
         WHERE r.id = $1 AND r.article_id = $2`,
        [revisionId, article.rows[0].id]
      );

      if (revision.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Revision not found',
        });
      }

      const r = revision.rows[0];

      return reply.send({
        id: r.id,
        content: r.content,
        editor: { id: r.editor_id, name: r.editor_name },
        change_note: r.change_note,
        created_at: r.created_at,
      });
    }
  );

  // POST /:slug/helpful - Increment helpful counter
  app.post<{ Params: { slug: string } }>(
    '/:slug/helpful',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { slug } = request.params;

      const result = await query<Article>(
        `UPDATE articles
         SET helpful_count = helpful_count + 1
         WHERE slug = $1 AND is_deleted = FALSE
         RETURNING helpful_count`,
        [slug]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Article not found',
        });
      }

      return reply.send({
        helpful_count: result.rows[0].helpful_count,
        message: 'Marked as helpful',
      });
    }
  );
}
