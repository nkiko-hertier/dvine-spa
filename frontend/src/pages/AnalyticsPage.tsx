import { RefreshCw } from 'lucide-react';
import { useGetAdminDashboardStats, useGetAdminDashboardSummary } from '@/api';
import { PageHeader, Metric } from '@/components/PageHeader';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState } from '@/components/EmptyState';
import { fmtDate } from '@/lib/format';

export function AnalyticsPage() {
  const stats = useGetAdminDashboardStats();
  const summary = useGetAdminDashboardSummary({
    date_from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    date_to: new Date().toISOString().slice(0, 10),
  });
  const rows = summary.data?.data ?? [];
  const max = Math.max(...rows.map((r) => r.total_requests), 1);

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="Look back, learn forward"
        title="A softer kind of dashboard."
        description="Patterns from the last seven days, kept close to the work."
        action={
          <button
            data-testid="button-refresh-analytics"
            className="icon-button"
            onClick={() => {
              stats.refetch();
              summary.refetch();
            }}
          >
            <RefreshCw size={17} />
          </button>
        }
      />
      {stats.isLoading ? (
        <SkeletonRows count={2} />
      ) : (
        <div className="metrics-grid">
          <Metric label="Pending requests" value={stats.data?.data?.pending_requests ?? 0} accent="coral" note="Need a reply" />
          <Metric label="Today's bookings" value={stats.data?.data?.todays_bookings ?? 0} accent="gold" note="On the calendar" />
          <Metric label="Confirmed this week" value={stats.data?.data?.this_week_confirmed ?? 0} accent="teal" note="A steady rhythm" />
          <Metric label="Completed this month" value={stats.data?.data?.this_month_completed ?? 0} accent="blue" note="Care delivered" />
        </div>
      )}
      <div className="analytics-layout">
        <section className="surface chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow text-primary">Daily rhythm</span>
              <h2 className="display">Requests by day</h2>
            </div>
            <span className="chart-legend">
              <i /> Total requests
            </span>
          </div>
          {summary.isLoading ? (
            <SkeletonRows count={1} />
          ) : rows.length ? (
            <div className="bar-chart">
              {rows.map((row) => (
                <div className="bar-col" key={row.request_date}>
                  <span>{row.total_requests}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${Math.max((row.total_requests / max) * 100, 8)}%` }} />
                  </div>
                  <small>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(row.request_date))}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Your first week is waiting" text="Daily summaries will appear as requests arrive." />
          )}
        </section>
        <section className="surface insight-card">
          <span className="eyebrow text-primary">A small signal</span>
          <h2 className="display">{stats.data?.data?.top_treatment_30d?.name ?? 'Your next favorite treatment'}</h2>
          <p>Most requested in the last 30 days.</p>
          <div className="insight-number">
            {stats.data?.data?.top_treatment_30d?.bookings ?? 0}
            <span> bookings</span>
          </div>
          <div className="insight-divider" />
          <div className="insight-row">
            <span>New customers, 30 days</span>
            <strong>{stats.data?.data?.new_customers_30d ?? 0}</strong>
          </div>
          <div className="insight-row">
            <span>Completed this month</span>
            <strong>{stats.data?.data?.this_month_completed ?? 0}</strong>
          </div>
        </section>
      </div>
      <section className="surface daily-table">
        <div className="section-heading">
          <div>
            <span className="eyebrow text-primary">Daily summaries</span>
            <h2 className="display">The week at a glance</h2>
          </div>
        </div>
        {rows.length ? (
          <div className="summary-list">
            {rows.map((row) => (
              <div className="summary-row" key={row.request_date}>
                <strong>{fmtDate(row.request_date, { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
                <span>
                  <b>{row.new_requests}</b> new
                </span>
                <span>
                  <b>{row.contacted}</b> contacted
                </span>
                <span className="confirmed-text">
                  <b>{row.confirmed}</b> confirmed
                </span>
                <span className="muted">
                  <b>{row.no_show}</b> no-show
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No summaries yet" text="There will be something lovely to look at soon." />
        )}
      </section>
    </div>
  );
}
