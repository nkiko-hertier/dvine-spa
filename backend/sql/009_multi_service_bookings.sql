-- ============================================================
-- 009, Multi-service bookings: make the live DB match the app
-- ============================================================
-- Why: the booking page lets a customer pick several services. The app now
-- stores every selected service in booking_request_treatments and shows them
-- all in the dashboard. This script brings the live database up to that.
--
-- SAFE TO RE-RUN. Every step is idempotent, nothing is dropped or rewritten
-- in booking_requests, customers or treatments, and the whole script runs in
-- ONE transaction: if any step (or the final self-check) fails, everything
-- rolls back and the database is exactly as it was.
--
-- What it does
--   1. Creates booking_request_treatments if migration 006 never ran.
--      (If 006 already ran, this is a no-op.)
--   2. Backfills one junction row (display_order 0) for every EXISTING
--      booking that has none, from its current treatment_id. Existing
--      bookings keep their treatment_id, total_amount, number_of_people,
--      status and reference untouched.
--   3. Refreshes two read-only views so they show every service:
--        - booking_request_details  (adds treatment_names, treatment_count;
--                                    all existing columns unchanged)
--        - customer_summary         (most_recent_treatment now lists every
--                                    service of the latest completed booking)
--   4. Self-check: aborts (rolls back) if any booking is left without a
--      service row.
--
-- Order of deployment (important)
--   a. Run this script on the live DB          (old backend keeps working,
--                                               it ignores the new table)
--   b. Deploy the new backend
--   c. Run this script ONE MORE TIME            (picks up any booking the old
--                                               backend created between a and b)
--   d. Deploy the new frontend
--
-- Apply:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/sql/009_multi_service_bookings.sql
-- Then:   cd backend && npx prisma generate     (schema.prisma already updated)
--
-- Optional pre-flight (read-only, run first if you like):
--   SELECT COUNT(*) AS bookings FROM booking_requests;
--   SELECT to_regclass('public.booking_request_treatments') AS junction_table;
--
-- Rollback (only if ever needed; the old backend does not use any of this):
--   BEGIN;
--   DROP VIEW IF EXISTS customer_summary;  -- then recreate it from 001_base_schema.sql section 4.2
--   -- booking_request_details: re-run its definition from 005 (extra columns are harmless to leave)
--   DROP TABLE IF EXISTS booking_request_treatments;
--   COMMIT;
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Junction table (same shape as migration 006)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_request_treatments (
    booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
    treatment_id       UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
    display_order      INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (booking_request_id, treatment_id)
);

CREATE INDEX IF NOT EXISTS idx_brt_treatment ON booking_request_treatments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_brt_booking   ON booking_request_treatments(booking_request_id);

COMMENT ON TABLE booking_request_treatments IS
  'Services attached to a booking request. display_order 0 matches '
  'booking_requests.treatment_id (the primary/first selected service).';

-- ------------------------------------------------------------
-- 2. Backfill existing bookings (only those with no rows yet)
-- ------------------------------------------------------------
INSERT INTO booking_request_treatments (booking_request_id, treatment_id, display_order)
SELECT br.id, br.treatment_id, 0
  FROM booking_requests br
 WHERE NOT EXISTS (
         SELECT 1
           FROM booking_request_treatments brt
          WHERE brt.booking_request_id = br.id
       )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3a. booking_request_details, append columns only
--     (CREATE OR REPLACE VIEW may only add columns at the end; every
--      existing column below is identical to migration 005.)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW booking_request_details AS
SELECT
    br.id,
    br.request_reference,
    c.full_name AS customer_name,
    c.phone_number AS customer_phone,
    c.whatsapp_number AS customer_whatsapp,
    c.source AS customer_source,
    t.name AS treatment_name,
    t.price AS treatment_price,
    t.duration_minutes,
    cat.name AS category_name,
    br.preferred_date,
    br.preferred_time,
    br.status,
    br.staff_notes,
    br.confirmed_date,
    br.confirmed_time,
    br.contacted_at,
    br.confirmed_at,
    br.created_at,
    CASE
        WHEN br.status IN ('completed', 'cancelled', 'no_show') THEN true
        ELSE false
    END AS is_resolved,
    br.number_of_people,
    br.total_amount,
    br.source AS booking_source,
    -- new: every selected service, in the order the customer picked them
    COALESCE(
        (SELECT string_agg(t2.name, ', ' ORDER BY brt.display_order)
           FROM booking_request_treatments brt
           JOIN treatments t2 ON t2.id = brt.treatment_id
          WHERE brt.booking_request_id = br.id),
        t.name
    ) AS treatment_names,
    GREATEST(
        (SELECT COUNT(*)::int
           FROM booking_request_treatments brt
          WHERE brt.booking_request_id = br.id),
        1
    ) AS treatment_count
FROM booking_requests br
LEFT JOIN customers c ON br.customer_id = c.id
LEFT JOIN treatments t ON br.treatment_id = t.id
LEFT JOIN categories cat ON t.category_id = cat.id;

-- ------------------------------------------------------------
-- 3b. customer_summary
--     most_recent_treatment changes type (varchar -> text) because it now
--     joins several names, and Postgres cannot change a view column's type
--     in place, so the view is dropped and recreated. It holds no data and
--     no other object depends on it (if one did, DROP would fail and this
--     whole script would roll back untouched).
-- ------------------------------------------------------------
DROP VIEW IF EXISTS customer_summary;

CREATE VIEW customer_summary AS
SELECT
    c.id,
    c.full_name,
    c.phone_number,
    c.whatsapp_number,
    c.source,
    c.customer_since,
    COUNT(br.id) AS total_requests,
    COUNT(CASE WHEN br.status = 'completed' THEN 1 END) AS total_visits,
    MAX(CASE WHEN br.status = 'completed' THEN br.preferred_date END) AS last_visit_date,
    (
        SELECT COALESCE(
                   (SELECT string_agg(t2.name, ', ' ORDER BY brt.display_order)
                      FROM booking_request_treatments brt
                      JOIN treatments t2 ON t2.id = brt.treatment_id
                     WHERE brt.booking_request_id = last_br.id),
                   t.name
               )
          FROM (
                SELECT br2.id, br2.treatment_id
                  FROM booking_requests br2
                 WHERE br2.customer_id = c.id AND br2.status = 'completed'
                 ORDER BY br2.preferred_date DESC, br2.created_at DESC
                 LIMIT 1
               ) last_br
          JOIN treatments t ON t.id = last_br.treatment_id
    ) AS most_recent_treatment,
    COUNT(CASE WHEN br.status = 'new_request' THEN 1 END) AS pending_requests,
    MAX(br.created_at) AS last_activity
FROM customers c
LEFT JOIN booking_requests br ON c.id = br.customer_id
GROUP BY c.id;

COMMENT ON VIEW customer_summary IS 'Aggregated customer data including visits and last treatment(s)';

-- ------------------------------------------------------------
-- 4. Self-check: no booking may be left without a service row
-- ------------------------------------------------------------
DO $$
DECLARE
    v_missing BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_missing
      FROM booking_requests br
     WHERE NOT EXISTS (
             SELECT 1 FROM booking_request_treatments brt
              WHERE brt.booking_request_id = br.id
           );
    IF v_missing > 0 THEN
        RAISE EXCEPTION '009 aborted: % booking(s) still have no service row', v_missing;
    END IF;
END $$;

COMMIT;

-- Post-check (read-only), both numbers should match:
--   SELECT (SELECT COUNT(*) FROM booking_requests)                              AS bookings,
--          (SELECT COUNT(DISTINCT booking_request_id) FROM booking_request_treatments) AS bookings_with_services;
