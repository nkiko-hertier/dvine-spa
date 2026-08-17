import { useState } from 'react';
import { Check, History, Plus, Send, Settings2, Trash2, X } from 'lucide-react';
import {
  getGetAdminStaffQueryKey,
  useCreateAdminStaffInvite,
  useDeleteAdminStaffById,
  useGetAdminAuditLogs,
  useGetAdminStaff,
  useUpdateAdminStaffById,
} from '@/api';
import { fmtDate, initials, titleCase } from '@/lib/format';
import { queryClient } from '@/lib/query-client';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState } from '@/components/EmptyState';

export function TeamPage() {
  const staff = useGetAdminStaff({ is_active: undefined });
  const audit = useGetAdminAuditLogs({ limit: '20' });
  const invite = useCreateAdminStaffInvite();
  const update = useUpdateAdminStaffById();
  const remove = useDeleteAdminStaffById();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'staff' });

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="People behind the care"
        title="Team & audit"
        description="See who is here, and leave a clear trail behind every change."
        action={
          <button data-testid="button-invite-staff" className="button button-primary" onClick={() => setInviteOpen(true)}>
            <Plus size={15} /> Invite teammate
          </button>
        }
      />
      <div className="team-layout">
        <section className="surface staff-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow text-primary">The team</span>
              <h2 className="display">At D’Vine today</h2>
            </div>
            <span className="live-label">
              <i /> Live
            </span>
          </div>
          {staff.isLoading ? (
            <SkeletonRows count={3} />
          ) : staff.data?.data?.length ? (
            staff.data.data.map((person) => (
              <div className="staff-row" key={person.id}>
                <div className="avatar">{initials(person.full_name)}</div>
                <div className="staff-identity">
                  <strong>{person.full_name}</strong>
                  <span>
                    {person.email} · {titleCase(person.role)}
                  </span>
                </div>
                <span className={`active-state ${person.is_active ? '' : 'off'}`}>{person.is_active ? 'Active' : 'Paused'}</span>
                <button
                  data-testid={`button-toggle-staff-${person.id}`}
                  className="icon-button subtle"
                  onClick={() => update.mutate({ id: person.id, data: { is_active: !person.is_active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() }) })}
                  aria-label="Toggle staff status"
                >
                  <Settings2 size={15} />
                </button>
                <button
                  data-testid={`button-remove-staff-${person.id}`}
                  className="icon-button subtle danger-text"
                  onClick={() => {
                    if (window.confirm(`Remove ${person.full_name} from the team?`))
                      remove.mutate({ id: person.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() }) });
                  }}
                  aria-label="Remove staff"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <EmptyState title="Your team is still growing" text="Invite a teammate to share the room." />
          )}
        </section>
        <section className="surface audit-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow text-primary">Audit trail</span>
              <h2 className="display">Recent changes</h2>
            </div>
            <History size={18} className="muted" />
          </div>
          {audit.data?.data?.length ? (
            <div className="audit-list">
              {audit.data.data.map((log) => (
                <div className="audit-row" key={log.id}>
                  <div className="audit-icon">
                    <Check size={14} />
                  </div>
                  <div>
                    <strong>{titleCase(log.action)}</strong>
                    <span>{log.notes ?? `${titleCase(log.old_status)} → ${titleCase(log.new_status)}`}</span>
                  </div>
                  <small>{fmtDate(log.created_at)}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing to review yet" text="Request changes will be recorded here." />
          )}
        </section>
      </div>
      {inviteOpen && (
        <div className="modal-layer">
          <div className="modal-card" role="dialog">
            <div className="modal-heading">
              <div>
                <span className="eyebrow text-primary">Team access</span>
                <h2 className="display">Invite a teammate</h2>
              </div>
              <button data-testid="button-close-invite" className="icon-button" onClick={() => setInviteOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="field-label">
              Full name
              <input data-testid="input-invite-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label className="field-label">
              Work email
              <input data-testid="input-invite-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field-label">
              Role
              <select data-testid="select-invite-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="modal-actions">
              <button data-testid="button-cancel-invite" className="button button-outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </button>
              <button
                data-testid="button-send-invite"
                className="button button-primary"
                disabled={!form.full_name || !form.email || invite.isPending}
                onClick={() =>
                  invite.mutate(
                    { data: { ...form, role: form.role as 'staff' | 'admin' } },
                    {
                      onSuccess: () => {
                        setInviteOpen(false);
                        queryClient.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
                      },
                    },
                  )
                }
              >
                <Send size={15} /> Send invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
