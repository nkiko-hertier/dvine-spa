import { SignIn } from '@clerk/react';
import { Flower2 } from 'lucide-react';
import { basePath } from '@/lib/base-path';

export function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-atmosphere">
        <Flower2 size={44} />
      </div>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}
