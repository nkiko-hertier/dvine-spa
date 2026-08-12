import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './setup.js';
import './schemas.js';
import './paths.js'; // side-effect: registers all paths on `registry`

registry.registerComponent('securitySchemes', 'clerkSession', {
  type: 'http',
  scheme: 'bearer',
  description:
    'Clerk session token (JWT), obtained client-side via getToken(). See API_DOCUMENTATION.md §2.2-2.3. ' +
    'Requires the "spa-api" JWT template configured with a `role` custom claim from public_metadata.role.',
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: "D'Vine Spa API",
      version: '1.1.0',
      description:
        "Booking-request management API for D'Vine Spa (no payment processing). " +
        'Generated from the same Zod schemas the routes validate against — see docs/API_DOCUMENTATION.md for ' +
        'prose documentation (auth flows, webhook setup, realtime events) not representable in OpenAPI alone.',
    },
    servers: [{ url: '/', description: 'Relative to wherever this API is deployed' }],
  });
}
