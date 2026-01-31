import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { setupRateLimiting } from './middleware/rateLimit.js';
import { agentRoutes } from './routes/agents.js';
import { articleRoutes } from './routes/articles.js';
import { categoryRoutes } from './routes/categories.js';
import { searchRoutes } from './routes/search.js';
import { referenceRoutes } from './routes/references.js';

const app = Fastify({
  logger: config.isDev,
});

async function start() {
  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await setupRateLimiting(app);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  app.register(agentRoutes, { prefix: '/api/v1/agents' });
  app.register(articleRoutes, { prefix: '/api/v1/articles' });
  app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  app.register(searchRoutes, { prefix: '/api/v1/search' });
  app.register(referenceRoutes, { prefix: '/api/v1' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
      });
    }

    return reply.status(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: config.isDev ? error.message : 'An unexpected error occurred',
    });
  });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Clawpedia API running on http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
