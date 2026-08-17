import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow text-primary">{eyebrow}</div>
        <h1 className="display">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Metric({ label, value, accent, note }: { label: string; value: string | number; accent?: string; note?: string }) {
  return (
    <div className="metric-card surface">
      <div className={`metric-icon ${accent ?? 'teal'}`}>
        <Sparkles size={16} />
      </div>
      <div>
        <span>{label}</span>
        <strong data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}
