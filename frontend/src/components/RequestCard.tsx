import { ArrowUpRight, CalendarDays, Check, Clock3, Phone, Send, XCircle } from 'lucide-react';
import type { BookingRequest, BookingStatus } from '@/api';
import { fmtDate, initials, titleCase } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export function RequestCard({
  request,
  onOpen,
  onUpdate,
  onReject,
}: {
  request: BookingRequest;
  onOpen: () => void;
  onUpdate: (status: BookingStatus) => void;
  onReject: () => void;
}) {
  const primary = request.status === 'new_request' || request.status === 'contacted' ? 'confirmed' : request.status;
  return (
    <article data-testid={`card-request-${request.id}`} className="request-card surface">
      <div className="request-card-top">
        <StatusBadge status={request.status} />
        <span className="request-ref">{request.request_reference}</span>
        <button data-testid={`button-details-${request.id}`} className="icon-button subtle" onClick={onOpen} aria-label="Open request details">
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="request-main">
        <div className="avatar">{initials(request.customer?.full_name)}</div>
        <div className="request-person">
          <h3>{request.customer?.full_name}</h3>
          <p>
            {request.treatment?.name} <span>·</span> {request.treatment?.duration_minutes} min
          </p>
        </div>
      </div>
      <div className="request-meta">
        <span>
          <CalendarDays size={15} />
          {fmtDate(request.preferred_date, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span>
          <Clock3 size={15} />
          {request.preferred_time}
        </span>
        <span>
          <Send size={14} />
          {titleCase(request.channel ?? 'website')}
        </span>
      </div>
      <div className="request-actions">
        <button data-testid={`button-contact-${request.id}`} className="button button-outline" onClick={() => window.open(`tel:${request.customer?.phone_number}`)}>
          <Phone size={15} /> Contact
        </button>
        <button data-testid={`button-primary-${request.id}`} className="button button-primary" onClick={() => onUpdate(primary)}>
          <Check size={15} /> {primary === 'confirmed' ? 'Confirm booking' : titleCase(primary)}
        </button>
        <button data-testid={`button-reject-${request.id}`} className="button button-quiet danger-text" onClick={onReject}>
          <XCircle size={15} /> Reject
        </button>
      </div>
    </article>
  );
}
