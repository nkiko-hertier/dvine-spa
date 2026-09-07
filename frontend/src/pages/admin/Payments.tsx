import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { Wallet, Building2, Globe, TrendingUp } from "lucide-react";
import { usePaymentReport } from "../../lib/helpers";
import type { PaymentBucket } from "../../types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();

// The app went into production in 2026, so there is nothing to report before
// then. The list grows on its own as the years pass: 2026 only during 2026,
// [2026, 2027] in 2027, and so on.
const PRODUCTION_YEAR = 2026;
const LATEST_YEAR = Math.max(PRODUCTION_YEAR, CURRENT_YEAR);
const YEAR_OPTIONS = Array.from(
  { length: LATEST_YEAR - PRODUCTION_YEAR + 1 },
  (_, i) => PRODUCTION_YEAR + i,
);

// Optional PixelSpring commission rate (a percentage, e.g. "10" or "12.5"),
// read from VITE_COMMISSION_RATE at build time. When it isn't set — or isn't
// a positive number — the commission row is hidden entirely.
const COMMISSION_RATE: number | null = (() => {
  const raw = import.meta.env.VITE_COMMISSION_RATE as string | undefined;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

function money(amount: string | number): string {
  return `RWF ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface ReportCardProps {
  title: string;
  caption: string;
  refPrefix: string;
  icon: React.ReactNode;
  bucket: PaymentBucket | undefined;
  loading: boolean;
  accent: string;
}

function ReportCard({ title, caption, refPrefix, icon, bucket, loading, accent }: ReportCardProps): React.ReactElement {
  return (
    <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-1">
            {title}
          </span>
          <p className="text-xs text-stone-600 font-light">{caption}</p>
        </div>
        <span className={`inline-flex items-center justify-center w-9 h-9 ${accent}`}>{icon}</span>
      </div>

      <div className="mt-6">
        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">Revenue</span>
        <p className="font-serif text-3xl sm:text-4xl text-[#1C3A27] tracking-tight mt-1">
          {loading ? "…" : money(bucket?.amount ?? 0)}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-stone-300/60 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="block text-stone-500">Completed bookings</span>
          <span className="font-semibold text-[#1C3A27] text-base">{loading ? "…" : bucket?.bookings ?? 0}</span>
        </div>
        <div>
          <span className="block text-stone-500">Guests served</span>
          <span className="font-semibold text-[#1C3A27] text-base">{loading ? "…" : bucket?.people ?? 0}</span>
        </div>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-widest text-stone-400">
        References {refPrefix}
      </p>
    </div>
  );
}

export default function DashboardPayments(): React.ReactElement {
  const [year, setYear] = useState<number>(LATEST_YEAR);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const { data, isLoading, isError } = usePaymentReport({ year, month });

  const pixelspringAmount = Number(data?.from_pixelspring.amount ?? 0);
  const totalAmount = Number(data?.total.amount ?? 0);
  const commissionAmount = COMMISSION_RATE != null ? (pixelspringAmount * COMMISSION_RATE) / 100 : 0;
  const netAmount = totalAmount - commissionAmount;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Payments Report"
          subtitle="Realised revenue by month, split by where the booking came from."
        />

        <main className="p-8 space-y-8">
          {/* PERIOD PICKER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            <div className="flex items-center gap-1.5 text-stone-500">
              <Wallet className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Period</span>
            </div>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-stone-500 font-light sm:ml-auto">
              Counts bookings marked <span className="font-semibold">completed</span> within {MONTHS[month - 1]} {year}.
            </span>
          </div>

          {isError ? (
            <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load the payment report.</p>
          ) : (
            <>
              {/* TOTAL */}
              <div className="bg-[#1C3A27] text-[#F8F6F0] p-6 sm:p-8 shadow-sm">
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-semibold block mb-1">
                  Total realised revenue — {MONTHS[month - 1]} {year}
                </span>
                <p className="font-serif text-4xl sm:text-5xl tracking-tight mt-2">
                  {isLoading ? "…" : money(data?.total.amount ?? 0)}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-xs text-emerald-100/80">
                  <span>
                    <span className="font-semibold text-[#F8F6F0]">{isLoading ? "…" : data?.total.bookings ?? 0}</span>{" "}
                    completed bookings
                  </span>
                  <span>
                    <span className="font-semibold text-[#F8F6F0]">{isLoading ? "…" : data?.total.people ?? 0}</span>{" "}
                    guests served
                  </span>
                </div>
              </div>

              {/* SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportCard
                  title="From D'Vine"
                  caption="Entered by staff in the dashboard."
                  refPrefix="DV-…"
                  icon={<Building2 className="w-4 h-4 text-amber-700" />}
                  accent="bg-amber-100"
                  bucket={data?.from_dvine}
                  loading={isLoading}
                />
                <ReportCard
                  title="From PixelSpring"
                  caption="Came through the public booking site."
                  refPrefix="PX-…"
                  icon={<Globe className="w-4 h-4 text-teal-700" />}
                  accent="bg-teal-100"
                  bucket={data?.from_pixelspring}
                  loading={isLoading}
                />
              </div>

              {/* COMMISSION — only when VITE_COMMISSION_RATE is configured */}
              {COMMISSION_RATE != null && (
                <div className="bg-[#EFECE6] border border-stone-300/85 p-6 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500 block mb-1">
                        PixelSpring commission ({COMMISSION_RATE}%)
                      </span>
                      <p className="text-xs text-stone-600 font-light">
                        {COMMISSION_RATE}% of PixelSpring revenue ({isLoading ? "…" : money(pixelspringAmount)}).
                      </p>
                    </div>
                    <p className="font-serif text-3xl text-[#1C3A27] tracking-tight">
                      {isLoading ? "…" : `− ${money(commissionAmount)}`}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-300/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
                      Net revenue after commission
                    </span>
                    <span className="font-semibold text-[#1C3A27] text-lg">
                      {isLoading ? "…" : money(netAmount)}
                    </span>
                  </div>
                </div>
              )}

              <p className="flex items-center gap-1.5 text-[11px] text-stone-500 font-light">
                <TrendingUp className="w-3.5 h-3.5" />
                Amounts use each booking's total (service price × number of people), frozen when the booking was
                created — repricing a service later won't change past months.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
