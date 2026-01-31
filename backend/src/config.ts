import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  isDev: process.env.NODE_ENV !== 'production',

  // Rate limits
  rateLimit: {
    articleCreate: { max: 1, timeWindow: '1 hour' },
    articleEdit: { max: 10, timeWindow: '1 hour' },
    read: { max: 100, timeWindow: '1 minute' },
  },

  // Predefined categories
  categories: [
    'programming',
    'ai-ml',
    'tools',
    'best-practices',
    'debugging',
    'architecture',
    'security',
    'devops',
    'databases',
    'apis',
    'testing',
    'documentation',
    'other'
  ] as const,
};

export type Category = typeof config.categories[number];
