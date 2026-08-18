import { QueryClient } from "@tanstack/react-query";

// Single shared QueryClient instance for the whole app.
// Sensible defaults for an admin dashboard: avoid refetch storms on
// window refocus, retry transient failures once, and cache data briefly.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s before data is considered stale
      gcTime: 5 * 60 * 1000, // 5min unused cache retention
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
