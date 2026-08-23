import React, { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Filter } from "lucide-react";
import { useAdminCustomers } from "../../lib/helpers";
import type { CustomerSource } from "../../types";

type ClientFilter = "all" | "new" | "repeating";

const SOURCE_OPTIONS: { value: CustomerSource; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "hotel", label: "Hotel" },
  { value: "corporate", label: "Corporate" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

// Values must match backend/src/routes/admin/customers.ts's SORT_FIELDS
// exactly (it validates against an allow-list of camelCase Prisma field
// names, not the snake_case the rest of the API uses on the wire) —
// anything else silently falls back to the default sort.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "-customerSince", label: "Newest Clients First" },
  { value: "customerSince", label: "Oldest Clients First" },
  { value: "fullName", label: "Name (A–Z)" },
  { value: "-fullName", label: "Name (Z–A)" },
  { value: "-lastActivity", label: "Most Recently Active" },
  { value: "lastActivity", label: "Least Recently Active" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Customers(): React.ReactElement {
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [hasPending, setHasPending] = useState<boolean>(false);
  const [clientFilter, setClientFilter] = useState<ClientFilter>("all");
  const [sort, setSort] = useState<string>("-customerSince");
  const itemsPerPage = 15;

  const { data, isLoading, isError } = useAdminCustomers({
    page,
    limit: itemsPerPage,
    search: search || undefined,
    source: (source || undefined) as CustomerSource | undefined,
    has_pending: hasPending || undefined,
    client_type: clientFilter === "all" ? undefined : clientFilter,
    sort,
  });

  const customers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.total_pages ?? 1;

  const resetToFirstPage = () => setPage(1);

  const clearFilters = () => {
    setSearch("");
    setSource("");
    setHasPending(false);
    setClientFilter("all");
    setSort("-customerSince");
    setPage(1);
  };

  const hasActiveFilters = !!search || !!source || hasPending || clientFilter !== "all" || sort !== "-customerSince";

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Clients"
          subtitle="Every guest who has ever reached out to the sanctuary."
        />

        <main className="p-8 space-y-6">
          {/* FILTER BAR */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search by name or phone number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetToFirstPage();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-stone-500">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Filters</span>
              </div>

              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  resetToFirstPage();
                }}
                className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
              >
                <option value="">All Sources</option>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-3 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasPending}
                  onChange={(e) => {
                    setHasPending(e.target.checked);
                    resetToFirstPage();
                  }}
                  className="accent-[#1C3A27]"
                />
                <span>Has Pending Requests</span>
              </label>

              <select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value as ClientFilter);
                  resetToFirstPage();
                }}
                className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
              >
                <option value="all">All Clients</option>
                <option value="new">New Clients</option>
                <option value="repeating">Repeating Clients</option>
              </select>

              <div className="flex items-center gap-1.5 lg:ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    resetToFirstPage();
                  }}
                  className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-stone-500">
                <span>
                  {total} client{total === 1 ? "" : "s"} match{total === 1 ? "es" : ""} your filters
                </span>
                <button onClick={clearFilters} className="font-semibold text-[#1C3A27] hover:underline">
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* TABLE */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">All Clients</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(page * itemsPerPage, total)} of {total} total
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading clients...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load clients.</p>
              ) : customers.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">
                  {clientFilter === "new"
                    ? "No new clients found matching your filters."
                    : clientFilter === "repeating"
                    ? "No repeating clients found matching your filters."
                    : "No clients found matching your filters."}
                </p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">Client Name</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Client Type</th>
                      <th className="py-3 px-4 font-semibold">Source</th>
                      <th className="py-3 px-4 font-semibold">Client Since</th>
                      <th className="py-3 px-4 font-semibold">Visits</th>
                      <th className="py-3 px-4 font-semibold">Last Treatment</th>
                      <th className="py-3 px-4 font-semibold">Pending</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-semibold">{c.full_name}</td>
                        <td className="py-4 px-4 text-stone-700">{c.phone_number}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${
                              (c.total_requests ?? 0) > 1
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {(c.total_requests ?? 0) > 1 ? "Repeating" : "New"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-stone-600 capitalize">
                          {c.source ? c.source.replace("_", " ") : "—"}
                        </td>
                        <td className="py-4 px-4 text-stone-600 font-light">{formatDate(c.customer_since)}</td>
                        <td className="py-4 px-4 text-stone-700">{c.total_visits ?? 0}</td>
                        <td className="py-4 px-4 text-stone-700">{c.most_recent_treatment ?? "—"}</td>
                        <td className="py-4 px-4">
                          {(c.pending_requests ?? 0) > 0 ? (
                            <span className="inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold bg-amber-100 text-amber-800">
                              {c.pending_requests} pending
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            to={`/dashboard/customers/${c.id}`}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="View Client Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-300/60 text-xs">
                <span className="text-stone-600 font-light">
                  Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
