import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import type { CustomerSummary } from '@/api';
import { fmtDate, initials } from '@/lib/format';

export function CustomerRow({ customer }: { customer: CustomerSummary }) {
  return (
    <Link data-testid={`link-customer-row-${customer.id}`} href={`/workspace/customers/${customer.id}`} className="customer-row">
      <div className="avatar">{initials(customer.full_name)}</div>
      <div className="customer-identity">
        <strong>{customer.full_name}</strong>
        <span>
          {customer.phone_number} · Since {fmtDate(customer.customer_since, { month: 'short', year: 'numeric' })}
        </span>
      </div>
      <div className="customer-last">
        <span>{customer.most_recent_treatment ?? 'No visits yet'}</span>
        <small>{customer.last_activity ? `Active ${fmtDate(customer.last_activity)}` : 'New to D’Vine'}</small>
      </div>
      <div className="customer-count">
        <strong>{customer.total_visits}</strong>
        <span>visits</span>
      </div>
      {customer.pending_requests > 0 && <span className="pending-pill">{customer.pending_requests} pending</span>}
      <ChevronRight size={17} className="muted" />
    </Link>
  );
}
