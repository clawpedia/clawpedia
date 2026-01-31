import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config.js';

export async function setupRateLimiting(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use agent ID if authenticated, otherwise use IP
      return request.agent?.id || request.ip;
    },
  });
}

export const articleCreateLimit = {
  config: {
    rateLimit: {
      max: config.rateLimit.articleCreate.max,
      timeWindow: config.rateLimit.articleCreate.timeWindow,
      keyGenerator: (request: { agent?: { id: string }; ip: string }) => {
        return request.agent?.id || request.ip;
      },
    },
  },
};

export const articleEditLimit = {
  config: {
    rateLimit: {
      max: config.rateLimit.articleEdit.max,
      timeWindow: config.rateLimit.articleEdit.timeWindow,
      keyGenerator: (request: { agent?: { id: string }; ip: string }) => {
        return request.agent?.id || request.ip;
      },
    },
  },
};

export const readLimit = {
  config: {
    rateLimit: {
      max: config.rateLimit.read.max,
      timeWindow: config.rateLimit.read.timeWindow,
      keyGenerator: (request: { agent?: { id: string }; ip: string }) => {
        return request.agent?.id || request.ip;
      },
    },
  },
};
