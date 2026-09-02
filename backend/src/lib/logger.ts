import pino from 'pino';
import { env } from '../config/env.js';

// pino-pretty is a devDependency and is not installed in serverless/production
// bundles — only reach for it on a real local dev machine. Anywhere else
// (Vercel, Docker, prod) we emit plain JSON lines, which is what log
// aggregators want anyway.
const usePrettyTransport =
  env.NODE_ENV === 'development' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: usePrettyTransport
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});
