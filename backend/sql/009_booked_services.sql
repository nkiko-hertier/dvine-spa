-- ============================================================
-- D'VINE SPA - MIGRATION 009
-- booked_services: one row per service on a booking, each with its
-- own status (pending / done / cancelled)
-- PostgreSQL 14+
-- Run after: 008_activity_version_indexes.sql
-- ============================================================
--
-- WHY
--   A booking can carry several services (sql/006). Staff need to serve
--   them one by one and mark each as done or cancelled, and the booking
--   itself can only be completed once nothing is left pending.
--
-- SAFETY (live database)
--   * booking_requests is NOT altered: no column, index, trigger or
--     constraint is added, changed or dropped on it.
--   * booking_request_treatments (006) is left untouched; it keeps
--     serving the existing lookup / confirmation / email code.
--   * Everything runs in one transaction: it fully applies or not at all.
--   * Re-runnable: every statement is IF NOT EXISTS / ON CONFLICT DO NOTHING
--     (the enum is guarded), so a second run changes nothing.
--   * Existing bookings are backfilled so none is left without services:
--       completed            -> every service 'done'
--       cancelled / no_show  -> every service 'cancelled'
--       anything else        -> every service 'pending'
--     Services come from booking_request_treatments; a booking with no
--     junction rows falls back to booking_requests.treatment_id.
--
-- DEPLOY ORDER
--   1) Run this file.   2) Deploy the backend.   3) Deploy the dashboard.
--   The new backend writes to booked_services on every public booking, so
--   deploying it before this file would make new bookings fail.
--
-- Apply:  psql "$DATABASE_URL" -f backend/sql/009_booked_services.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. STATUS ENUM
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booked_service_status') THEN
        CREATE TYPE booked_service_status AS ENUM ('pending', 'done', 'cancelled');
    END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booked_services (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id    UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
    treatment_id  UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
    -- Frozen at booking time so history survives a rename in the menu.
    service_name  VARCHAR(150) NOT NULL,
    -- Frozen unit price (per guest), same reasoning as total_amount.
    price         NUMERIC(10,2) NOT NULL DEFAULT 0,
    display_order INT NOT NULL DEFAULT 0,
    status        booked_service_status NOT NULL DEFAULT 'pending',
    -- Set when the service leaves 'pending' (done or cancelled), cleared on undo.
    resolved_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booked_services_booking_treatment UNIQUE (booking_id, treatment_id)
);

CREATE INDEX IF NOT EXISTS idx_booked_services_booking   ON booked_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booked_services_treatment ON booked_services(treatment_id);
CREATE INDEX IF NOT EXISTS idx_booked_services_status    ON booked_services(booking_id, status);
-- Serves max(updated_at) for the dashboard change-version poll.
CREATE INDEX IF NOT EXISTS idx_booked_services_updated   ON booked_services(updated_at);

-- Reuses the function created in 001_base_schema.sql.
DROP TRIGGER IF EXISTS update_booked_services_updated_at ON booked_services;
CREATE TRIGGER update_booked_services_updated_at BEFORE UPDATE ON booked_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 3. BACKFILL EXISTING BOOKINGS
-- ------------------------------------------------------------
-- 3a. Bookings that have junction rows (every booking since 006, which
--     itself backfilled all older ones).
INSERT INTO booked_services
    (booking_id, treatment_id, service_name, price, display_order, status, resolved_at)
SELECT
    br.id,
    brt.treatment_id,
    t.name,
    t.price,
    brt.display_order,
    CASE br.status
        WHEN 'completed' THEN 'done'::booked_service_status
        WHEN 'cancelled' THEN 'cancelled'::booked_service_status
        WHEN 'no_show'   THEN 'cancelled'::booked_service_status
        ELSE 'pending'::booked_service_status
    END,
    CASE
        WHEN br.status = 'completed' THEN COALESCE(br.completed_at, br.updated_at)
        WHEN br.status IN ('cancelled', 'no_show') THEN COALESCE(br.cancelled_at, br.updated_at)
        ELSE NULL
    END
FROM booking_requests br
JOIN booking_request_treatments brt ON brt.booking_request_id = br.id
JOIN treatments t ON t.id = brt.treatment_id
ON CONFLICT (booking_id, treatment_id) DO NOTHING;

-- 3b. Safety net: a booking with no services yet (no junction rows) gets
--     its primary treatment_id.
INSERT INTO booked_services
    (booking_id, treatment_id, service_name, price, display_order, status, resolved_at)
SELECT
    br.id,
    br.treatment_id,
    t.name,
    t.price,
    0,
    CASE br.status
        WHEN 'completed' THEN 'done'::booked_service_status
        WHEN 'cancelled' THEN 'cancelled'::booked_service_status
        WHEN 'no_show'   THEN 'cancelled'::booked_service_status
        ELSE 'pending'::booked_service_status
    END,
    CASE
        WHEN br.status = 'completed' THEN COALESCE(br.completed_at, br.updated_at)
        WHEN br.status IN ('cancelled', 'no_show') THEN COALESCE(br.cancelled_at, br.updated_at)
        ELSE NULL
    END
FROM booking_requests br
JOIN treatments t ON t.id = br.treatment_id
WHERE NOT EXISTS (SELECT 1 FROM booked_services bs WHERE bs.booking_id = br.id)
ON CONFLICT (booking_id, treatment_id) DO NOTHING;

COMMENT ON TABLE booked_services IS
    'One row per service on a booking, each with its own status. '
    'A booking can be completed only when none of its services is pending.';
COMMENT ON COLUMN booked_services.service_name IS 'Treatment name frozen at booking time.';
COMMENT ON COLUMN booked_services.price IS 'Treatment unit price (per guest) frozen at booking time.';

COMMIT;

-- ------------------------------------------------------------
-- VERIFY (read-only; run by hand after applying)
-- ------------------------------------------------------------
--   -- Bookings without services: expect 0 rows
--   SELECT br.id FROM booking_requests br
--   WHERE NOT EXISTS (SELECT 1 FROM booked_services bs WHERE bs.booking_id = br.id);
--
--   -- Completed bookings that still have a non-done service: expect 0 rows
--   SELECT br.id FROM booking_requests br JOIN booked_services bs ON bs.booking_id = br.id
--   WHERE br.status = 'completed' AND bs.status <> 'done';
--
-- ROLLBACK (only if you must undo; nothing else depends on it until the
-- new backend is deployed):
--   DROP TABLE IF EXISTS booked_services;
--   DROP TYPE  IF EXISTS booked_service_status;
-- ============================================================
-- END OF MIGRATION 009
-- ============================================================
