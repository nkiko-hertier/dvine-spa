-- ============================================================
-- 005 — Booking party size + total, and PX-/DV- reference split
-- ============================================================
-- Adds three columns to booking_requests:
--   * number_of_people — how many guests this one booking covers (>= 1)
--   * total_amount      — treatment price * number_of_people, frozen at
--                         creation time (a payment report reads this, so it
--                         must NOT drift when a treatment's price changes)
--   * source            — the booking's own acquisition source, frozen at
--                         creation. NULL  => entered by staff in the
--                         dashboard ("from us" / D'Vine). NOT NULL => came
--                         through the public booking site ("from PixelSpring").
--
-- Until now "origin" was derived from customers.source, which is sticky to
-- the customer's first-ever contact and so retroactively reclassifies every
-- past booking when it changes. A per-booking column fixes that and is what
-- the reference generator and the payment report both key off now.
--
-- Also rewrites generate_request_reference() so a booking with a source is
-- numbered PX-YYYY-NNNNNN instead of DV-YYYY-NNNNNN. The per-year sequence
-- is shared between the two prefixes (references stay globally unique and
-- chronological); only the prefix differs. Existing references are left
-- exactly as they are — they are printed on PDFs and QR codes already.
--
-- Apply:  psql "$DATABASE_URL" -f backend/sql/005_booking_party_size_px_reference.sql
-- Then:   cd backend && npx prisma db pull && npx prisma generate
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------
ALTER TABLE booking_requests
    ADD COLUMN IF NOT EXISTS number_of_people INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS source           customer_source;

ALTER TABLE booking_requests
    DROP CONSTRAINT IF EXISTS booking_requests_number_of_people_check;
ALTER TABLE booking_requests
    ADD CONSTRAINT booking_requests_number_of_people_check
    CHECK (number_of_people >= 1);

COMMENT ON COLUMN booking_requests.number_of_people IS
    'Guests covered by this booking (>= 1). Party bookings multiply total_amount.';
COMMENT ON COLUMN booking_requests.total_amount IS
    'treatment price * number_of_people, frozen at creation. Source of truth for the payment report.';
COMMENT ON COLUMN booking_requests.source IS
    'Per-booking acquisition source, frozen at creation. NULL = staff-entered in the dashboard (D''Vine); NOT NULL = public booking site (PixelSpring). Drives the PX-/DV- reference prefix and the payment report split.';

CREATE INDEX IF NOT EXISTS idx_booking_requests_source ON booking_requests(source);

-- ------------------------------------------------------------
-- 2. Backfill existing rows
-- ------------------------------------------------------------
-- Party size: every historical booking was for one person.
UPDATE booking_requests SET number_of_people = 1 WHERE number_of_people IS NULL;

-- Origin: seed each booking's own source from the customer it belongs to,
-- so the existing "from us / from PixelSpring" split is preserved for
-- history. New bookings set this column directly and never read the
-- customer again.
UPDATE booking_requests br
   SET source = c.source
  FROM customers c
 WHERE c.id = br.customer_id
   AND br.source IS NULL
   AND c.source IS NOT NULL;

-- Total: price * party size, using the treatment's current price as the
-- best available estimate for past bookings.
UPDATE booking_requests br
   SET total_amount = t.price * br.number_of_people
  FROM treatments t
 WHERE t.id = br.treatment_id
   AND br.total_amount IS NULL;

-- ------------------------------------------------------------
-- 3. Reference generator — PX- for sourced bookings, DV- otherwise
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year_part VARCHAR(4);
    v_seq_num   INT;
    v_prefix    VARCHAR(3);
BEGIN
    v_year_part := TO_CHAR(NEW.created_at, 'YYYY');

    -- A booking that carries an acquisition source came through the public
    -- booking site (PixelSpring); one without was keyed in by staff (D'Vine).
    v_prefix := CASE WHEN NEW.source IS NOT NULL THEN 'PX-' ELSE 'DV-' END;

    -- See migration 002 for why the PL/pgSQL variables are v_-prefixed.
    INSERT INTO request_reference_counters (year_part, last_seq)
    VALUES (v_year_part, 1)
    ON CONFLICT (year_part)
        DO UPDATE SET last_seq = request_reference_counters.last_seq + 1
    RETURNING last_seq INTO v_seq_num;

    NEW.request_reference := v_prefix || v_year_part || '-' || LPAD(v_seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger `set_request_reference` already points at this function name.

-- ------------------------------------------------------------
-- 4. booking_request_details view — expose the new columns
-- ------------------------------------------------------------
-- CREATE OR REPLACE can only append columns, which is all we do here.
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
    br.source AS booking_source
FROM booking_requests br
LEFT JOIN customers c ON br.customer_id = c.id
LEFT JOIN treatments t ON br.treatment_id = t.id
LEFT JOIN categories cat ON t.category_id = cat.id;

COMMIT;
