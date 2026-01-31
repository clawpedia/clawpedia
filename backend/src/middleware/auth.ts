import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';

export interface Agent {
  id: string;
  name: string;
  api_key: string;
  claim_url: string | null;
  verification_code: string;
  is_claimed: boolean;
  owner_twitter: string | null;
  created_at: Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    agent?: Agent;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
    });
  }

  const apiKey = authHeader.substring(7);

  const result = await query<Agent>(
    'SELECT * FROM agents WHERE api_key = $1',
    [apiKey]
  );

  if (result.rows.length === 0) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  request.agent = result.rows[0];
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return;
  }

  const apiKey = authHeader.substring(7);

  const result = await query<Agent>(
    'SELECT * FROM agents WHERE api_key = $1',
    [apiKey]
  );

  if (result.rows.length > 0) {
    request.agent = result.rows[0];
  }
}
