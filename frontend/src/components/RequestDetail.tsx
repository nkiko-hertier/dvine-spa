import { ArrowUpRight, Check, FileText, Phone, X, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { getGetAdminBookingRequestsByIdQueryKey, useGetAdminBookingRequestsById } from '@/api';
import type { BookingStatus } from '@/api';
import { fmtDate, initials, titleCase } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState } from '@/components/EmptyState';

export function RequestDetail({
  id,
  onClose,
  onUpdate,
  onReject,
}: {
  id: string;
  onClose: () => void;
  onUpdate: (status: BookingStatus) => void;
  onReject: () => void;
}) {
  const query = useGetAdminBookingRequestsById(id, { query: { queryKey: getGetAdminBookingRequestsByIdQueryKey(id), enabled: !!id } });
  const request = query.data?.data;
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label="Close details" data-testid="button-close-detail-scrim" />
      <aside className="detail-drawer" data-testid="drawer-request-detail">
        {query.isLoading ? (
          <SkeletonRows count={2} />
        ) : request ? (
          <>
            <div className="drawer-head">
              <div>
                <span className="eyebrow text-primary">Request detail</span>
                <h2 className="display">{request.customer.full_name}</h2>
                <p>
                  {request.request_reference} · {fmtDate(request.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button data-testid="button-close-detail" className="icon-button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="detail-status">
              <StatusBadge status={request.status} />
              <span>Requested {fmtDate(request.created_at)}</span>
            </div>
            <div className="detail-block">
              <span className="eyebrow">Their visit</span>
              <div className="detail-grid">
                <div>
                  <small>Treatment</small>
                  <strong>{request.treatment.name}</strong>
                </div>
                <div>
                  <small>Preferred</small>
                  <strong>
                    {fmtDate(request.preferred_date)} · {request.preferred_time}
                  </strong>
                </div>
                <div>
                  <small>Channel</small>
                  <strong>{titleCase(request.channel ?? 'website')}</strong>
                </div>
                <div>
                  <small>Duration</small>
                  <strong>{request.treatment.duration_minutes} minutes</strong>
                </div>
              </div>
            </div>
            <div className="detail-block">
              <span className="eyebrow">Contact</span>
              <div className="contact-line">
                <div className="avatar avatar-small">{initials(request.customer.full_name)}</div>
                <div>
                  <strong>{request.customer.full_name}</strong>
                  <span>
                    {request.customer.phone_number}
                    {request.customer.whatsapp_number ? ` · ${request.customer.whatsapp_number}` : ''}
                  </span>
                </div>
                <Link data-testid={`link-customer-${request.customer.id}`} href={`/workspace/customers/${request.customer.id}`} className="button button-outline ml-auto">
                  Profile <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
            {request.staff_notes && (
              <div className="note-box">
                <FileText size={15} />
                <span>{request.staff_notes}</span>
              </div>
            )}
            <div className="detail-block">
              <span className="eyebrow">Activity</span>
              <div className="timeline">
                {request.audit_trail?.length ? (
                  request.audit_trail.map((log) => (
                    <div className="timeline-row" key={log.id}>
                      <span className="timeline-dot" />
                      <div>
                        <strong>{titleCase(log.action)}</strong>
                        <p>
                          {fmtDate(log.created_at)}
                          {log.notes ? ` · ${log.notes}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No activity recorded yet.</p>
                )}
              </div>
            </div>
            <div className="drawer-actions">
              {(request.status === 'new_request' || request.status === 'contacted') && (
                <button data-testid="button-detail-confirm" className="button button-primary" onClick={() => onUpdate('confirmed')}>
                  <Check size={15} /> Confirm booking
                </button>
              )}
              {request.status === 'new_request' && (
                <button data-testid="button-detail-contact" className="button button-outline" onClick={() => window.open(`tel:${request.customer.phone_number}`)}>
                  <Phone size={15} /> Call {request.customer.full_name.split(' ')[0]}
                </button>
              )}
              <button data-testid="button-detail-reject" className="button button-quiet danger-text" onClick={onReject}>
                <XCircle size={15} /> Reject request
              </button>
            </div>
          </>
        ) : (
          <EmptyState title="Request unavailable" text="This request may have moved or been removed." />
        )}
      </aside>
    </div>
  );
}
