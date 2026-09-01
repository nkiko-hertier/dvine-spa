// Server-side proxy for the D'Vine Spa public booking API.
// The spa API is HTTP-only, so the browser (HTTPS) cannot call it directly
// (mixed content). This bounded proxy forwards only the public operations the
// website needs, validates each one, and returns the upstream envelope as-is.

// Base44 backend-function egress blocks raw-IP fetches (Cloudflare 1003).
// 5.189.175.8.nip.io resolves to the spa server's IP, so the egress sees a
// hostname while the connection lands on the right box.
const API_BASE_URL =
  (typeof process !== "undefined" && process.env && process.env.DVINE_API_BASE_URL) ||
  "http://5.189.175.8.nip.io:4000";

const VALID_OPS = new Set([
  "categories",
  "category",
  "categoryTreatments",
  "treatments",
  "treatment",
  "createBooking",
  "lookup",
]);

const SOURCES = [
  "instagram",
  "facebook",
  "tiktok",
  "google",
  "website",
  "referral",
  "hotel",
  "corporate",
  "walk_in",
  "other",
];

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function errResponse(status, code, message, details) {
  return Response.json(
    { success: false, error: { code, message, details: details || undefined } },
    { status }
  );
}

async function upstream(path, opts) {
  const res = await fetch(API_BASE_URL + path, {
    ...opts,
    signal: AbortSignal.timeout(25000),
    headers: { "Content-Type": "application/json", ...(opts && opts.headers) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { success: false, error: { code: "INTERNAL_ERROR", message: "Malformed upstream response" } };
  }
  return { status: res.status, body };
}

export default async function (req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const op = payload.op;
    if (!VALID_OPS.has(op)) return errResponse(400, "VALIDATION_ERROR", "Invalid or missing op");

    let result;

    if (op === "categories") {
      result = await upstream("/categories");
    } else if (op === "category") {
      if (!isUuid(payload.id)) return errResponse(400, "VALIDATION_ERROR", "Invalid category id");
      result = await upstream("/categories/" + encodeURIComponent(payload.id));
    } else if (op === "categoryTreatments") {
      if (!isUuid(payload.id)) return errResponse(400, "VALIDATION_ERROR", "Invalid category id");
      result = await upstream("/categories/" + encodeURIComponent(payload.id) + "/treatments");
    } else if (op === "treatments") {
      const params = new URLSearchParams();
      if (isUuid(payload.categoryId)) params.set("category_id", payload.categoryId);
      if (typeof payload.search === "string" && payload.search.trim()) {
        params.set("search", payload.search.trim().slice(0, 100));
      }
      if (payload.page) params.set("page", String(parseInt(payload.page, 10) || 1));
      if (payload.limit) params.set("limit", String(Math.min(parseInt(payload.limit, 10) || 20, 100)));
      result = await upstream("/treatments" + (params.toString() ? "?" + params : ""));
    } else if (op === "treatment") {
      if (!isUuid(payload.id)) return errResponse(400, "VALIDATION_ERROR", "Invalid treatment id");
      result = await upstream("/treatments/" + encodeURIComponent(payload.id));
    } else if (op === "createBooking") {
      const b = payload.data || {};
      const errs = [];
      if (typeof b.full_name !== "string" || !b.full_name.trim() || b.full_name.length > 100) {
        errs.push({ field: "full_name", issue: "Required (max 100 chars)" });
      }
      if (typeof b.phone_number !== "string" || b.phone_number.trim().length < 6 || b.phone_number.length > 20) {
        errs.push({ field: "phone_number", issue: "Required (6-20 chars)" });
      }
      if (!isUuid(b.treatment_id)) errs.push({ field: "treatment_id", issue: "Required" });
      if (typeof b.preferred_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.preferred_date)) {
        errs.push({ field: "preferred_date", issue: "Required (YYYY-MM-DD)" });
      }
      if (typeof b.preferred_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.preferred_time)) {
        errs.push({ field: "preferred_time", issue: "Required (HH:MM)" });
      }
      if (b.whatsapp_number != null && b.whatsapp_number !== "") {
        if (typeof b.whatsapp_number !== "string" || b.whatsapp_number.trim().length < 6 || b.whatsapp_number.length > 20) {
          errs.push({ field: "whatsapp_number", issue: "6-20 chars" });
        }
      }
      if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
        errs.push({ field: "email", issue: "Invalid email" });
      }
      if (b.source && !SOURCES.includes(b.source)) errs.push({ field: "source", issue: "Invalid value" });
      if (b.channel && !SOURCES.includes(b.channel)) errs.push({ field: "channel", issue: "Invalid value" });
      if (errs.length) return errResponse(400, "VALIDATION_ERROR", "Please check the highlighted fields", errs);

      const body = {
        full_name: b.full_name.trim(),
        phone_number: b.phone_number.trim(),
        treatment_id: b.treatment_id,
        preferred_date: b.preferred_date,
        preferred_time: b.preferred_time,
        channel: b.channel || "website",
        ...(b.whatsapp_number ? { whatsapp_number: b.whatsapp_number.trim() } : {}),
        ...(b.email ? { email: b.email.trim() } : {}),
        ...(b.source ? { source: b.source } : {}),
        ...(b.notes ? { notes: String(b.notes).slice(0, 2000) } : {}),
      };
      result = await upstream("/booking-requests", { method: "POST", body: JSON.stringify(body) });
    } else if (op === "lookup") {
      const ref = payload.reference;
      const phone = payload.phone_number;
      if (typeof ref !== "string" || !ref.trim()) {
        return errResponse(400, "VALIDATION_ERROR", "Reference required", [{ field: "reference", issue: "Required" }]);
      }
      if (typeof phone !== "string" || phone.trim().length < 6) {
        return errResponse(400, "VALIDATION_ERROR", "Phone number required", [{ field: "phone_number", issue: "Required" }]);
      }
      const params = new URLSearchParams({ reference: ref.trim(), phone_number: phone.trim() });
      result = await upstream("/booking-requests/lookup?" + params);
    }

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    return errResponse(502, "INTERNAL_ERROR", "Unable to reach the spa service. Please try again.");
  }
}