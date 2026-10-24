import { Router } from 'express';
import type { RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '../openapi/document.js';

export const docsRouter = Router();

// Generated once, on the first request for it, then reused, the spec only
// changes when the code changes (it's derived from the same Zod schemas the
// routes use). It is NOT generated at import time: walking every schema is
// the single most expensive thing this app does at startup, and on Vercel
// that cost landed on every cold start, including the ones serving the
// booking page's catalog requests, which never look at /docs.
let openApiDocument: ReturnType<typeof generateOpenApiDocument> | undefined;
const getDocument = () => (openApiDocument ??= generateOpenApiDocument());

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(getDocument());
});

const serveDocs: RequestHandler = (req, res, next) => {
  swaggerUi.setup(getDocument(), { customSiteTitle: "D'Vine Spa API Docs" })(req, res, next);
};
docsRouter.use('/docs', swaggerUi.serve, serveDocs);
