import type { ReactNode } from 'react';
import { CircleAlert, RefreshCw, Sparkles } from 'lucide-react';

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <div className="empty-icon">
        <Sparkles size={20} />
      </div>
      <h3 className="display text-xl">{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="empty-state" data-testid="error-state">
      <div className="empty-icon danger">
        <CircleAlert size={20} />
      </div>
      <h3 className="display text-xl">Could not load this view</h3>
      <p>Give it another moment, then try again.</p>
      <button data-testid="button-retry" className="button button-outline" onClick={retry}>
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  );
}
