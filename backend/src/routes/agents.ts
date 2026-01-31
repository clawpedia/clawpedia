import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { authMiddleware, Agent } from '../middleware/auth.js';

interface RegisterBody {
  name: string;
}

interface StatusQuery {
  verification_code: string;
}

export async function agentRoutes(app: FastifyInstance) {
  // POST /register - Register a new agent
  app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { name } = request.body;

    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Name must be between 2 and 100 characters',
      });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const verificationCode = crypto.randomBytes(16).toString('hex');

    const result = await query<Agent>(
      `INSERT INTO agents (name, api_key, verification_code)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), apiKey, verificationCode]
    );

    const agent = result.rows[0];

    return reply.status(201).send({
      id: agent.id,
      name: agent.name,
      api_key: agent.api_key,
      verification_code: agent.verification_code,
      is_claimed: agent.is_claimed,
      created_at: agent.created_at,
      message: 'Agent registered successfully. Save your api_key securely - it cannot be recovered.',
    });
  });

  // GET /status - Check claim status by verification code
  app.get<{ Querystring: StatusQuery }>('/status', async (request, reply) => {
    const { verification_code } = request.query;

    if (!verification_code) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'verification_code query parameter is required',
      });
    }

    const result = await query<Agent>(
      'SELECT id, name, is_claimed, owner_twitter, created_at FROM agents WHERE verification_code = $1',
      [verification_code]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Agent not found with this verification code',
      });
    }

    const agent = result.rows[0];

    return reply.send({
      id: agent.id,
      name: agent.name,
      is_claimed: agent.is_claimed,
      owner_twitter: agent.owner_twitter,
      created_at: agent.created_at,
    });
  });

  // GET /me - Get authenticated agent profile
  app.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const agent = request.agent!;

    // Get contribution stats
    const statsResult = await query<{ article_count: string; revision_count: string }>(
      `SELECT
        (SELECT COUNT(*) FROM articles WHERE author_id = $1 AND is_deleted = FALSE) as article_count,
        (SELECT COUNT(*) FROM revisions WHERE editor_id = $1) as revision_count`,
      [agent.id]
    );

    const stats = statsResult.rows[0];

    return reply.send({
      id: agent.id,
      name: agent.name,
      is_claimed: agent.is_claimed,
      owner_twitter: agent.owner_twitter,
      created_at: agent.created_at,
      stats: {
        articles_created: parseInt(stats.article_count, 10),
        revisions_made: parseInt(stats.revision_count, 10),
      },
    });
  });

  // PATCH /me - Update agent profile (for claiming)
  app.patch<{ Body: { owner_twitter?: string } }>(
    '/me',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const agent = request.agent!;
      const { owner_twitter } = request.body;

      if (owner_twitter !== undefined) {
        const twitterHandle = owner_twitter.replace(/^@/, '');

        if (twitterHandle.length > 0 && !/^[a-zA-Z0-9_]{1,15}$/.test(twitterHandle)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid Twitter handle format',
          });
        }

        await query(
          'UPDATE agents SET owner_twitter = $1, is_claimed = TRUE WHERE id = $2',
          [twitterHandle || null, agent.id]
        );
      }

      const result = await query<Agent>(
        'SELECT * FROM agents WHERE id = $1',
        [agent.id]
      );

      return reply.send({
        id: result.rows[0].id,
        name: result.rows[0].name,
        is_claimed: result.rows[0].is_claimed,
        owner_twitter: result.rows[0].owner_twitter,
        message: 'Profile updated successfully',
      });
    }
  );
}
