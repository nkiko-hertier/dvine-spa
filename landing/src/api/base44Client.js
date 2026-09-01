import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

export const db = globalThis.__B44_DB__ || (appParams.appId ? createClient({
  appId: appParams.appId,
  token: appParams.token,
  functionsVersion: appParams.functionsVersion,
  appBaseUrl: appParams.appBaseUrl,
  requiresAuth: false,
}) : {
  auth: {
    isAuthenticated: async () => false,
    me: async () => null,
    loginViaEmailPassword: async () => ({}),
    loginWithProvider: () => {},
    logout: () => {},
    redirectToLogin: () => {},
  },
  entities: new Proxy({}, {
    get: () => ({
      filter: async () => [],
      get: async () => null,
      create: async (data) => ({ id: 'mock-id', ...data }),
      update: async () => ({}),
      delete: async () => ({})
    })
  }),
  integrations: {
    Core: { UploadFile: async () => ({ file_url: '' }) }
  },
  functions: {
    invoke: async (name, payload) => {
      try {
        const res = await fetch(`/api/functions/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          return { data, status: res.status };
        }
      } catch {}
      return { data: { success: false }, status: 500 };
    }
  }
});

export const base44 = db;
export default db;