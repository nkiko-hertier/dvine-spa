import { titleCase } from '@/lib/format';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span data-testid={`status-${status}`} className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {titleCase(status)}
    </span>
  );
}
