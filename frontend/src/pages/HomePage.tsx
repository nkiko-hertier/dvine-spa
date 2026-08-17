import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Bell, CheckCircle2, Plus, RefreshCw, Search } from 'lucide-react';
import { Link } from 'wouter';
import { getGetAdminBookingRequestsQueryKey, useGetAdminBookingRequests, useGetAdminDashboardStats, useUpdateAdminBookingRequestsById } from '@/api';
import type { BookingStatus } from '@/api';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { RequestCard } from '@/components/RequestCard';
import { RequestDetail } from '@/components/RequestDetail';
import { RejectDialog } from '@/components/RejectDialog';
import { NewRequestDialog } from '@/components/NewRequestDialog';
import { LookupStrip } from '@/components/LookupStrip';

export function HomePage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const requests = useGetAdminBookingRequests({ status: ['new_request', 'contacted'], sort: 'created_at_asc', limit: '50' });
  const stats = useGetAdminDashboardStats();
  const update = useUpdateAdminBookingRequestsById();
  const visible = useMemo(
    () => (requests.data?.data ?? []).filter((r) => `${r.customer.full_name} ${r.request_reference} ${r.treatment.name}`.toLowerCase().includes(search.toLowerCase())),
    [requests.data, search],
  );
  const refresh = () => requests.refetch();
  const updateStatus = (id: string, status: BookingStatus, extra?: { cancellation_reason?: string }) =>
    update.mutate(
      { id, data: { status, ...(status === 'confirmed' ? { confirmed_date: undefined, confirmed_time: undefined } : {}), ...extra } },
      {
        onSuccess: () => {
          setFeedback(status === 'confirmed' ? 'Booking confirmed and moved out of the queue.' : 'Request updated.');
          setSelected(null);
          setRejectId(null);
          queryClient.invalidateQueries({ queryKey: getGetAdminBookingRequestsQueryKey() });
          setTimeout(() => setFeedback(''), 2800);
        },
      },
    );
  const rejectRequest = (reason: string) => rejectId && updateStatus(rejectId, 'cancelled', { cancellation_reason: reason });
  const pending = stats.data?.data?.pending_requests ?? visible.length;

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="Good morning, Ana"
        title="The room starts here."
        description="A quiet view of what needs your attention today."
        action={
          <div className="header-actions">
            <button data-testid="button-refresh-requests" className="icon-button" onClick={refresh}>
              <RefreshCw size={17} />
            </button>
            <button data-testid="button-new-request" className="button button-primary" onClick={() => setNewOpen(true)}>
              <Plus size={16} /> New request
            </button>
          </div>
        }
      />
      <section className="queue-hero">
        <div className="queue-intro">
          <div className="queue-orbit">
            <div className="queue-orbit-inner">
              <Bell size={24} />
            </div>
          </div>
          <div>
            <span className="eyebrow">Live queue</span>
            <h2>
              {pending} <span>requests to tend</span>
            </h2>
            <p>New conversations are placed first. Take the next kind action.</p>
          </div>
        </div>
        <div className="mini-metrics">
          <span>
            <strong>{stats.data?.data?.todays_bookings ?? 0}</strong> today
          </span>
          <span>
            <strong>{stats.data?.data?.this_week_confirmed ?? 0}</strong> confirmed this week
          </span>
        </div>
      </section>
      {feedback && (
        <div className="feedback" data-testid="status-feedback">
          <CheckCircle2 size={16} /> {feedback}
        </div>
      )}
      <div className="queue-toolbar">
        <div>
          <span className="eyebrow text-primary">Needs attention</span>
          <h2>Active requests</h2>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input data-testid="input-search-requests" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or reference" />
        </label>
      </div>
      {requests.isLoading ? (
        <SkeletonRows />
      ) : requests.isError ? (
        <ErrorState retry={refresh} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="The queue is clear"
          text="No new conversations are waiting. A good moment to breathe or look back at the day."
          action={
            <Link data-testid="link-empty-analytics" href="/workspace/analytics" className="button button-outline">
              View analytics <ArrowUpRight size={15} />
            </Link>
          }
        />
      ) : (
        <div className="request-grid">
          {visible.map((request, i) => (
            <div className="animate-rise" style={{ animationDelay: `${i * 55}ms` }} key={request.id}>
              <RequestCard request={request} onOpen={() => setSelected(request.id)} onUpdate={(status) => updateStatus(request.id, status)} onReject={() => setRejectId(request.id)} />
            </div>
          ))}
        </div>
      )}
      <LookupStrip />
      {selected && <RequestDetail id={selected} onClose={() => setSelected(null)} onUpdate={(status) => updateStatus(selected, status)} onReject={() => setRejectId(selected)} />}
      {rejectId && <RejectDialog pending={update.isPending} onCancel={() => setRejectId(null)} onConfirm={rejectRequest} />}
      {newOpen && (
        <NewRequestDialog
          onClose={() => {
            setNewOpen(false);
            queryClient.invalidateQueries({ queryKey: getGetAdminBookingRequestsQueryKey() });
          }}
        />
      )}
    </div>
  );
}
