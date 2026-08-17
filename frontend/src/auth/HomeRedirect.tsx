import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Show } from '@clerk/react';
import { PublicLanding } from '@/auth/PublicLanding';

function WorkspaceRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/workspace');
  }, [setLocation]);
  return null;
}

export function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Link href="/workspace" className="sr-only">
          Open workspace
        </Link>
        <WorkspaceRedirect />
      </Show>
      <Show when="signed-out">
        <PublicLanding />
      </Show>
    </>
  );
}
