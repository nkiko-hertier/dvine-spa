import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { UserPlus, X, ShieldCheck, ShieldOff, Mail, Trash2 } from "lucide-react";
import {
  useAdminStaff,
  useInviteStaff,
  useUpdateStaff,
  useHardDeleteStaff,
  useCurrentStaff,
} from "../../lib/helpers";
import type { Staff, UserRole } from "../../types";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Inline role/active controls for one staff row. A separate component
 * so each row's useUpdateStaff mutation (scoped by id) stays isolated. */
function StaffRow({ staff, isSelf }: { staff: Staff; isSelf: boolean }): React.ReactElement {
  const updateStaff = useUpdateStaff(staff.id);
  const hardDeleteStaff = useHardDeleteStaff();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<boolean>(false);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  const handleRoleChange = (role: UserRole) => {
    updateStaff.mutate({ role });
  };

  const handleToggleActive = () => {
    if (staff.is_active && !confirmingDeactivate) {
      setConfirmingDeactivate(true);
      return;
    }
    updateStaff.mutate({ is_active: !staff.is_active });
    setConfirmingDeactivate(false);
  };

  const handleHardDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    hardDeleteStaff.mutate(staff.id, { onSettled: () => setConfirmingDelete(false) });
  };

  return (
    <tr className="hover:bg-[#F8F6F0]/60 transition-colors">
      <td className="py-4 px-4">
        <div className="font-semibold">{staff.full_name}</div>
        <div className="text-stone-500 text-[11px]">{staff.email}</div>
      </td>
      <td className="py-4 px-4">
        <select
          value={staff.role}
          disabled={isSelf || updateStaff.isPending}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="p-2 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27] disabled:opacity-50 disabled:cursor-not-allowed capitalize"
          title={isSelf ? "You can't change your own role here." : undefined}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="py-4 px-4 text-stone-600 font-light">{staff.phone_number || "—"}</td>
      <td className="py-4 px-4 text-stone-600 font-light">{formatDate(staff.last_login)}</td>
      <td className="py-4 px-4">
        <span
          className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${
            staff.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-300 text-stone-700"
          }`}
        >
          {staff.is_active ? "Active" : "Deactivated"}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        {isSelf ? (
          <span className="text-[10px] uppercase tracking-widest text-stone-400">You</span>
        ) : confirmingDelete ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-red-700">
              Delete forever?
            </span>
            <button
              onClick={handleHardDelete}
              disabled={hardDeleteStaff.isPending}
              className="text-[10px] uppercase tracking-widest font-semibold text-red-700 hover:underline disabled:opacity-50"
            >
              {hardDeleteStaff.isPending ? "Deleting…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={hardDeleteStaff.isPending}
              className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 hover:underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : confirmingDeactivate ? (
          <div className="inline-flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              className="text-[10px] uppercase tracking-widest font-semibold text-red-700 hover:underline"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingDeactivate(false)}
              className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={updateStaff.isPending}
              className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300 disabled:opacity-50"
              title={staff.is_active ? "Deactivate account" : "Reactivate account"}
            >
              {staff.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </button>
            <button
              onClick={handleHardDelete}
              disabled={hardDeleteStaff.isPending}
              className="p-1.5 text-stone-600 hover:text-red-700 transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300 disabled:opacity-50"
              title="Permanently delete account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function UserManagement(): React.ReactElement {
  const { data: me } = useCurrentStaff();
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  const { data, isLoading, isError } = useAdminStaff({
    role: (roleFilter || undefined) as UserRole | undefined,
    is_active: activeFilter === "" ? undefined : activeFilter === "true",
    limit: 100,
  });

  const staffList = data?.data ?? [];

  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<UserRole>("staff");
  const [inviteError, setInviteError] = useState<string>("");
  const [inviteSuccess, setInviteSuccess] = useState<string>("");
  const inviteStaff = useInviteStaff();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    if (!inviteEmail || !inviteName) {
      setInviteError("Please fill in all required fields.");
      return;
    }
    try {
      const result = await inviteStaff.mutateAsync({
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
      });
      setInviteSuccess(
        result.reinvited
          ? `A pending invitation already existed — it was revoked and a fresh one sent to ${result.email}.`
          : `Invitation sent to ${result.email}.`
      );
      setInviteEmail("");
      setInviteName("");
      setInviteRole("staff");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } };
      };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setInviteError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setInviteError(apiErr?.message || "Failed to send invitation. Please try again.");
      }
    }
  };

  const closeInviteModal = () => {
    setIsInviteOpen(false);
    setInviteError("");
    setInviteSuccess("");
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader title="User Management" subtitle="Staff accounts, roles, and access control." />

        <main className="p-8 space-y-6">
          {/* ACTIONS & FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            <div className="flex items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </select>
            </div>

            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-[#1C3A27] text-[#F8F6F0] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff Member</span>
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">Staff Accounts</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Roles determine access — only admins can manage other accounts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading staff...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load staff accounts.</p>
              ) : staffList.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">No staff accounts found.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">Name & Email</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Last Login</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {staffList.map((staff) => (
                      <StaffRow key={staff.id} staff={staff} isSelf={staff.id === me?.id} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* INVITE MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-md shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Sanctuary Administration
                </span>
                <h3 className="font-serif text-xl">Invite Staff Member</h3>
              </div>
              <button onClick={closeInviteModal} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-8 text-center space-y-4">
                <Mail className="w-8 h-8 text-emerald-700 mx-auto" />
                <p className="font-serif text-xl text-[#1C3A27]">Invitation sent.</p>
                <p className="text-xs text-stone-600">{inviteSuccess}</p>
                <button
                  onClick={closeInviteModal}
                  className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div className="p-6 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aline Mukamana"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@dvinespa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-[10px] text-stone-500">
                      Admins can manage staff accounts and roles. Staff can manage bookings and clients.
                    </p>
                  </div>

                  {inviteError && (
                    <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{inviteError}</p>
                  )}
                </div>

                <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="bg-stone-300 text-stone-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteStaff.isPending}
                    className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-60"
                  >
                    {inviteStaff.isPending ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
