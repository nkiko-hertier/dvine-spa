import { useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { setAuthTokenGetter } from '@/api';

// Standard standalone setup: the API server runs on its own origin/port, so
// requests carry a Clerk bearer token (from the "default" JWT template)
// instead of relying on same-origin session cookies.
export function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isSignedIn) {
      setAuthTokenGetter(null);
      return;
    }
    setAuthTokenGetter(() => getToken({ template: 'default' }));
  }, [isSignedIn, getToken]);
  return null;
}
