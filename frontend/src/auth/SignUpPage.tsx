import { SignUp } from '@clerk/react';
import { Flower2 } from 'lucide-react';
import { basePath } from '@/lib/base-path';

export function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-atmosphere">
        <Flower2 size={44} />
      </div>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}
