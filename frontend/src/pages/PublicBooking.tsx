import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { Sparkles, Clock3, CheckCircle2, RotateCcw, X } from "lucide-react";
import { usePublicCategories, usePublicTreatments, useCreateBookingRequest } from "../lib/helpers";
import { TIME_OPTIONS } from "../lib/bookingStatus";
import type { CustomerSource } from "../types";

/**
 * Stand-in public booking page, linked directly (no nav) while the real
 * marketing site (../../landing) isn't live yet. Deliberately small: one
 * screen, one form, no routing beyond itself. Retire once the real site
 * takes over booking.
 */

const STORAGE_KEY = "dvine_spa_booking_contact_v1";

interface SavedContact {
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
}

function loadSavedContact(): SavedContact | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedContact>;
    if (typeof parsed.full_name !== "string" || !parsed.full_name) return null;
    return {
      full_name: parsed.full_name,
      phone_number: parsed.phone_number ?? "",
      whatsapp_number: parsed.whatsapp_number ?? "",
      email: parsed.email ?? "",
    };
  } catch {
    return null;
  }
}

function saveContact(c: SavedContact) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    // Private browsing / storage disabled — auto-fill just won't work next time.
  }
}

function newIdempotencyKey(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Local "how did you hear about us" options — mirrors the CustomerSource enum. */
const SOURCE_OPTIONS: { value: CustomerSource; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google search" },
  { value: "referral", label: "A friend told me" },
  { value: "hotel", label: "My hotel" },
  { value: "corporate", label: "Corporate partner" },
  { value: "walk_in", label: "Walked by" },
  { value: "other", label: "Other" },
];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function to12h(time: string): string {
  const opt = TIME_OPTIONS.find((o) => o.value === time);
  if (opt) return opt.label;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export default function PublicBooking(): React.ReactElement {
  useEffect(() => {
    AOS.init({ duration: 650, once: true, easing: "ease-out-cubic" });
  }, []);

  const saved = useMemo(loadSavedContact, []);
  const [welcomeBack, setWelcomeBack] = useState<boolean>(!!saved);

  const [fullName, setFullName] = useState(saved?.full_name ?? "");
  const [phone, setPhone] = useState(saved?.phone_number ?? "");
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsapp, setWhatsapp] = useState(saved?.whatsapp_number ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [treatmentId, setTreatmentId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [source, setSource] = useState<CustomerSource | "">("");
  const [notes, setNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: categories = [] } = usePublicCategories();
  const { data: treatmentsData, isLoading: treatmentsLoading } = usePublicTreatments({
    limit: 100,
    category_id: categoryId || undefined,
  });
  const treatments = treatmentsData?.data ?? [];
  const selectedTreatment = treatments.find((t) => t.id === treatmentId) ?? null;

  // Filtering by category can strand a previously-picked treatment outside
  // the new result set — drop it rather than silently submit a mismatch.
  useEffect(() => {
    if (treatmentId && treatmentsData && !treatments.some((t) => t.id === treatmentId)) {
      setTreatmentId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentsData]);

  const createBooking = useCreateBookingRequest();

  const handleClearSaved = () => {
    setFullName("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setWelcomeBack(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clean up */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!fullName.trim() || !phone.trim() || !treatmentId || !date || !time) {
      setFormError("Please fill in your name, phone number, a service, and your preferred date and time.");
      return;
    }

    try {
      await createBooking.mutateAsync({
        body: {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          whatsapp_number: whatsappSame ? undefined : whatsapp.trim() || undefined,
          email: email.trim() || undefined,
          treatment_id: treatmentId,
          preferred_date: date,
          preferred_time: time,
          channel: "website",
          // Always tag a source (defaulting to "website") so this booking is
          // correctly attributed as a public-site request in the dashboard's
          // "from us / from PixelSpring" origin split, rather than reading
          // as staff-entered just because the visitor skipped the question.
          source: source || "website",
          notes: notes.trim() || undefined,
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      saveContact({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        whatsapp_number: whatsappSame ? phone.trim() : whatsapp.trim(),
        email: email.trim(),
      });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } };
      };
      const apiErr = axiosErr.response?.data?.error;
      setFormError(
        apiErr?.details?.length
          ? apiErr.details.map((d) => d.issue).join(", ")
          : apiErr?.message || "Something went wrong sending your request. Please try again.",
      );
    }
  };

  const handleBookAnother = () => {
    createBooking.reset();
    setTreatmentId("");
    setCategoryId("");
    setDate("");
    setTime("");
    setNotes("");
    setFormError("");
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  // -------------------------------------------------------------- success --
  if (createBooking.isSuccess && createBooking.data) {
    const r = createBooking.data;
    return (
      <main className="min-h-screen bg-[#0A2619] flex items-center justify-center px-6 py-16 font-['Work_Sans',sans-serif]">
        <div
          className="max-w-md w-full text-center space-y-5 bg-[#EFECE6] border border-stone-300/80 p-10 shadow-xl"
          data-aos="zoom-in"
        >
          <div className="w-14 h-14 rounded-full bg-[#1C3A27] text-[#F8F6F0] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl text-[#1C3A27]">Request received</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Thank you, {fullName.trim().split(" ")[0]}. We'll confirm your{" "}
            <span className="font-medium text-[#1C3A27]">{r.treatment.name}</span> on{" "}
            {new Date(r.preferred_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} by phone or
            WhatsApp shortly.
          </p>
          {r.request_reference && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
              Reference&nbsp;<span className="font-semibold text-[#1C3A27]">{r.request_reference}</span>
            </p>
          )}
          <button
            onClick={handleBookAnother}
            className="inline-flex items-center gap-2 bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Book another visit
          </button>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------------------- form --
  return (
    <main className="min-h-screen bg-[#0A2619] font-['Work_Sans',sans-serif] text-stone-100">
      {/* Hero */}
      <section className="relative h-[200px] sm:h-[240px] overflow-hidden">
        <img
          src={encodeURI("/ISIMBI PICTURES (117).jpg")}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A2619]/85 via-[#0A2619]/55 to-[#0A2619]" />
        <div className="relative h-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center text-[#F8F6F0]">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-emerald-300">
            <Sparkles className="w-3 h-3" /> d'Vine Spa
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl mt-2">Reserve Your Moment of Calm</h1>
          <p className="text-xs text-stone-200 font-light mt-1 max-w-sm">
            Pick a treatment, tell us when — we'll confirm the rest.
          </p>
        </div>
        <Link
          to="/login"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[9px] uppercase tracking-widest text-stone-200/80 hover:text-white transition-colors"
        >
          Staff Login
        </Link>
      </section>

      {/* Form + live summary */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-10 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          <form
            onSubmit={handleSubmit}
            className="bg-[#EFECE6] border border-stone-300/80 shadow-sm p-6 sm:p-8 space-y-6"
            data-aos="fade-up"
          >
            {welcomeBack && saved && (
              <div className="flex items-start justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-3">
                <span>
                  Welcome back, <span className="font-semibold">{saved.full_name}</span> — we filled in your
                  details from last time.
                </span>
                <button
                  type="button"
                  onClick={handleClearSaved}
                  title="Not you? Clear saved details"
                  className="text-emerald-700 hover:text-emerald-900 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Contact */}
            <div className="space-y-4">
              <h2 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500">Your details</h2>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Full name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diane Uwase"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    Phone number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+250 788 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                    Email <span className="normal-case text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-stone-600">
                <input
                  type="checkbox"
                  checked={whatsappSame}
                  onChange={(e) => setWhatsappSame(e.target.checked)}
                  className="accent-[#1C3A27]"
                />
                WhatsApp is the same as my phone number
              </label>
              {!whatsappSame && (
                <input
                  type="tel"
                  placeholder="WhatsApp number"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              )}
            </div>

            {/* Service */}
            <div className="space-y-3">
              <h2 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-stone-500">Choose a service</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryId("")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold border transition-colors ${
                    categoryId === ""
                      ? "bg-[#1C3A27] text-[#F8F6F0] border-[#1C3A27]"
                      : "bg-[#F8F6F0] text-stone-600 border-stone-300 hover:border-[#1C3A27]"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold border transition-colors ${
                      categoryId === c.id
                        ? "bg-[#1C3A27] text-[#F8F6F0] border-[#1C3A27]"
                        : "bg-[#F8F6F0] text-stone-600 border-stone-300 hover:border-[#1C3A27]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="border border-stone-300 bg-[#F8F6F0] max-h-56 overflow-y-auto divide-y divide-stone-200">
                {treatmentsLoading ? (
                  <p className="p-3 text-xs text-stone-500 italic">Loading services...</p>
                ) : treatments.length === 0 ? (
                  <p className="p-3 text-xs text-stone-500 italic">No services in this category yet — try another.</p>
                ) : (
                  treatments.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTreatmentId(t.id)}
                      className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors ${
                        treatmentId === t.id ? "bg-emerald-50" : "hover:bg-stone-100"
                      }`}
                    >
                      <span>
                        <span className="block text-xs font-medium text-[#1C3A27]">{t.name}</span>
                        <span className="block text-[10px] text-stone-500">
                          {t.duration_minutes} min · RWF {Number(t.price).toLocaleString()}
                        </span>
                      </span>
                      {treatmentId === t.id && <CheckCircle2 className="w-4 h-4 text-[#1C3A27] shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* When */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Preferred date *
                </label>
                <input
                  type="date"
                  required
                  min={todayIso}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs focus:outline-none focus:border-[#1C3A27]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Preferred time *
                </label>
                <select
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs focus:outline-none focus:border-[#1C3A27]"
                >
                  <option value="">Select time</option>
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  How did you hear about us? <span className="normal-case text-stone-400">(optional)</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as CustomerSource)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs focus:outline-none focus:border-[#1C3A27]"
                >
                  <option value="">Prefer not to say</option>
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Notes <span className="normal-case text-stone-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Anything we should know — allergies, preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                />
              </div>
            </div>

            {formError && <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{formError}</p>}

            <button
              type="submit"
              disabled={createBooking.isPending}
              className="w-full bg-[#1C3A27] text-[#F8F6F0] py-3 text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-60"
            >
              {createBooking.isPending ? "Sending request..." : "Request This Appointment"}
            </button>
          </form>

          {/* Live summary */}
          <aside
            className="bg-white text-[#1C3A27] border border-stone-200 shadow-lg p-6 h-fit lg:sticky lg:top-6 space-y-4"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-emerald-700">
              <Sparkles className="w-3 h-3" /> Your reservation
            </span>

            {selectedTreatment ? (
              <div className="space-y-1">
                <p className="font-serif text-xl">{selectedTreatment.name}</p>
                {selectedTreatment.category?.name && (
                  <p className="text-[10px] uppercase tracking-widest text-emerald-700/90">
                    {selectedTreatment.category.name}
                  </p>
                )}
                <p className="text-sm text-stone-600 font-light">
                  RWF {Number(selectedTreatment.price).toLocaleString()} · {selectedTreatment.duration_minutes} min
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-500 font-light">Choose a service to see it summarised here.</p>
            )}

            {(date || time) && (
              <div className="border-t border-stone-200 pt-4 space-y-1 text-xs text-stone-600">
                {date && (
                  <p>
                    {new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                )}
                {time && selectedTreatment && (
                  <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Clock3 className="w-3.5 h-3.5" />
                    {to12h(time)} – {to12h(addMinutes(time, selectedTreatment.duration_minutes))}
                  </p>
                )}
                {time && !selectedTreatment && <p>{to12h(time)}</p>}
              </div>
            )}

            <p className="text-[10px] text-stone-500 font-light border-t border-stone-200 pt-4 leading-relaxed">
              This confirms nothing yet — it's a request. We'll reach out by phone or WhatsApp to lock it in.
            </p>
          </aside>
        </div>
      </section>

      {/* Slim contact footer */}
      <footer className="border-t border-emerald-900/60 bg-[#0A2619] py-5 text-center text-[10px] text-stone-300 space-y-1">
        <p>
          <a href="tel:+250782867790" className="hover:text-white transition-colors">
            +250 782 867 790
          </a>
          {" · "}
          <a href="mailto:dvinespa2@gmail.com" className="hover:text-white transition-colors">
            dvinespa2@gmail.com
          </a>
          {" · "}Kigali-Kiyovu, Rwanda
        </p>
        <p className="text-stone-500">Open daily 08:00 – 20:00</p>
      </footer>
    </main>
  );
}
