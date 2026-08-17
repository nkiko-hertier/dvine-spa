import { useClerk } from '@clerk/react';
import { basePath } from '@/lib/base-path';

export function LogoutButton() {
  const { signOut } = useClerk();
  return (
    <button type="button" className="theme-toggle" onClick={() => signOut({ redirectUrl: basePath || '/' })}>
      Sign out
    </button>
  );
}
