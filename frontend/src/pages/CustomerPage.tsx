import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Check, Edit3 } from 'lucide-react';
import { getGetAdminCustomersByIdQueryKey, useGetAdminCustomersById, useUpdateAdminCustomersById } from '@/api';
import { fmtDate, initials } from '@/lib/format';
import { queryClient } from '@/lib/query-client';
import { Metric } from '@/components/PageHeader';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';

export function CustomerPage() {
  const { id = '' } = useParams<{ id: string }>();
  const customer = useGetAdminCustomersById(id, { query: { enabled: !!id, queryKey: getGetAdminCustomersByIdQueryKey(id) } });
  const update = useUpdateAdminCustomersById();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (customer.data?.data) setNotes(customer.data.data.notes ?? '');
  }, [customer.data]);
  const data = customer.data?.data;

  if (customer.isLoading)
    return (
      <div className="page-wrap">
        <SkeletonRows count={3} />
      </div>
    );

  if (!data)
    return (
      <div className="page-wrap">
        <EmptyState
          title="Customer not found"
          text="This profile may have moved."
          action={
            <Link href="/workspace/customers" data-testid="link-back-customers" className="button button-outline">
              <ArrowLeft size={15} /> Customers
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="page-wrap">
      <Link data-testid="link-back-customer-list" href="/workspace/customers" className="back-link">
        <ArrowLeft size={15} /> All customers
      </Link>
      <div className="profile-hero">
        <div className="profile-avatar">{initials(data.full_name)}</div>
        <div>
          <span className="eyebrow text-primary">Customer profile</span>
          <h1 className="display">{data.full_name}</h1>
          <p>
            {data.phone_number}
            {data.whatsapp_number ? ` · WhatsApp ${data.whatsapp_number}` : ''}
          </p>
        </div>
        <button data-testid="button-edit-customer" className="button button-outline ml-auto" onClick={() => setEditing(!editing)}>
          <Edit3 size={15} /> {editing ? 'Close editor' : 'Edit profile'}
        </button>
      </div>
      {editing && (
        <section className="surface editor-card">
          <label className="field-label">
            WhatsApp number
            <input data-testid="input-customer-whatsapp" defaultValue={data.whatsapp_number ?? ''} id="customer-whatsapp" />
          </label>
          <label className="field-label">
            Notes
            <textarea data-testid="input-customer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button
            data-testid="button-save-customer"
            className="button button-primary"
            onClick={() => {
              const whatsapp = (document.getElementById('customer-whatsapp') as HTMLInputElement)?.value;
              update.mutate(
                { id, data: { whatsapp_number: whatsapp, notes } },
                {
                  onSuccess: () => {
                    setEditing(false);
                    queryClient.invalidateQueries({ queryKey: getGetAdminCustomersByIdQueryKey(id) });
                  },
                },
              );
            }}
          >
            <Check size={15} /> Save changes
          </button>
        </section>
      )}
      <div className="profile-stat-grid">
        <Metric label="Total visits" value={data.total_visits} accent="teal" />
        <Metric label="Total requests" value={data.total_requests} accent="gold" />
        <Metric label="Pending requests" value={data.pending_requests} accent="coral" />
        <div className="surface profile-fact">
          <span className="eyebrow">Favorite lately</span>
          <strong>{data.most_recent_treatment ?? 'Not enough visits yet'}</strong>
          <span>Last visit {fmtDate(data.last_visit_date)}</span>
        </div>
      </div>
      <section className="surface booking-history">
        <div className="section-heading">
          <div>
            <span className="eyebrow text-primary">Their D’Vine story</span>
            <h2 className="display">Booking history</h2>
          </div>
          <span className="history-since">Since {fmtDate(data.customer_since, { month: 'long', year: 'numeric' })}</span>
        </div>
        {data.recent_bookings?.length ? (
          <div className="history-list">
            {data.recent_bookings.map((booking, i) => (
              <div className="history-row" key={i}>
                <div className="history-date">
                  <strong>{String(booking['preferred_date'] ?? booking['date'] ?? '—')}</strong>
                  <span>{String(booking['preferred_time'] ?? '')}</span>
                </div>
                <div>
                  <strong>{String(booking['treatment_name'] ?? booking['treatment'] ?? 'Treatment')}</strong>
                  <span>{String(booking['request_reference'] ?? '')}</span>
                </div>
                <StatusBadge status={String(booking['status'] ?? 'confirmed')} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="The first visit is still ahead" text="Booking history will gather here after their next appointment." />
        )}
      </section>
    </div>
  );
}
