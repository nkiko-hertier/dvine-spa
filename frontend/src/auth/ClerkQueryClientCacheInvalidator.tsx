import { useEffect, useMemo } from 'react';
import { useClerk } from '@clerk/react';
import { queryClient } from '@/lib/query-client';

// Clears the React Query cache whenever the signed-in user changes, so one
// account never sees another account's cached data.
export function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserId = useMemo(() => ({ value: undefined as string | null | undefined }), []);
  useEffect(
    () =>
      addListener(({ user }) => {
        const userId = user?.id ?? null;
        if (prevUserId.value !== undefined && prevUserId.value !== userId) queryClient.clear();
        prevUserId.value = userId;
      }),
    [addListener, prevUserId],
  );
  return null;
}
