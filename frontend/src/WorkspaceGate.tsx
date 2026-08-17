import { Sparkles } from 'lucide-react';
import { useUser } from '@clerk/react';
import { Router } from '@/Router';
import { PublicLanding } from '@/auth/PublicLanding';

export function WorkspaceGate() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded)
    return (
      <div className="auth-loading">
        <Sparkles size={18} /> Opening your workspace…
      </div>
    );
  return isSignedIn ? <Router /> : <PublicLanding />;
}
