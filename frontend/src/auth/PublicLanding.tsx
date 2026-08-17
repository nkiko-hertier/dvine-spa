import { Link } from 'wouter';
import { ArrowUpRight, Flower2, Sparkles } from 'lucide-react';

export function PublicLanding() {
  return (
    <div className="landing-page">
      <div className="landing-mark">
        <Flower2 size={23} />
      </div>
      <span className="eyebrow text-primary">D’Vine Spa Workspace</span>
      <h1 className="display">Make every arrival feel cared for.</h1>
      <p>The quiet operating space for the people who make D’Vine feel like D’Vine.</p>
      <div className="landing-actions">
        <Link href="/sign-in" className="button button-primary">
          Sign in to workspace <ArrowUpRight size={15} />
        </Link>
        <Link href="/sign-up" className="button button-outline">
          Create account
        </Link>
      </div>
      <div className="landing-note">
        <Sparkles size={15} /> Thoughtful care, organized beautifully.
      </div>
    </div>
  );
}
