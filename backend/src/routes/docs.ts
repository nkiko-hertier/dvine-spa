import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '../openapi/document.js';

export const docsRouter = Router();

// Generated once at startup, not per-request — the spec only changes when
// the code changes (it's derived from the same Zod schemas the routes use),
// so there's no reason to regenerate it on every hit to /docs.
const openApiDocument = generateOpenApiDocument();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, { customSiteTitle: "D'Vine Spa API Docs" }),
);
