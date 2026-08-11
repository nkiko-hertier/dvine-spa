-- ============================================================
-- D'VINE SPA - MIGRATION 002
-- Clerk Auth Integration + Schema Fixes
-- PostgreSQL 14+
-- Run after: deepseek_sql_20260810_c2dcb2.sql (v2.0 base schema)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. CLERK AUTH INTEGRATION (staff table)
-- ------------------------------------------------------------
-- Clerk now owns authentication (passwords, MFA, sessions, social
-- login). The staff table maps a Clerk user to a spa staff record
-- instead of storing credentials directly.

ALTER TABLE staff ADD COLUMN clerk_user_id VARCHAR(64) UNIQUE;
ALTER TABLE staff ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX idx_staff_clerk_user_id ON staff(clerk_user_id);

COMMENT ON COLUMN staff.clerk_user_id IS
  'Clerk user ID (e.g. user_2abc...). Set by the Clerk webhook handler on user.created, never by the client.';
COMMENT ON COLUMN staff.password_hash IS
  'Deprecated since Clerk migration. Nullable, kept only for historical/rollback purposes. The API must never read or write this column.';
COMMENT ON COLUMN staff.last_login IS
  'Updated by the Clerk webhook handler on session.created, not by the API directly.';

-- Case-insensitive email: Clerk treats email as case-insensitive,
-- so staff lookups by email must match (avoids "duplicate-looking"
-- rows like Admin@x.com vs admin@x.com).
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE staff ALTER COLUMN email TYPE CITEXT;

-- ------------------------------------------------------------
-- 2. WEBHOOK EVENTS (idempotency for Clerk, and any future provider)
-- ------------------------------------------------------------
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(30) NOT NULL DEFAULT 'clerk',
    event_id VARCHAR(100) NOT NULL,       -- Clerk's svix message id
    event_type VARCHAR(100) NOT NULL,     -- e.g. user.created
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received', -- received | processed | failed
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, event_id)
);

CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);

COMMENT ON TABLE webhook_events IS
  'Raw log of inbound webhook deliveries. UNIQUE(provider, event_id) makes handlers idempotent against provider retries (Clerk/svix retries on non-2xx).';

-- ------------------------------------------------------------
-- 3. FIX: request_reference GENERATOR WAS BROKEN + NOT CONCURRENCY-SAFE
-- ------------------------------------------------------------
-- Bug in the original function:
--   SUBSTRING(request_reference FROM 4) on 'DV-2026-000006' returns
--   '2026-000006' (it includes the trailing hyphen), and
--   CAST('2026-000006' AS INT) throws a runtime error as soon as a
--   second request exists for the same year. On top of that, the
--   SELECT MAX(...) + INSERT pattern is a classic TOCTOU race: two
--   concurrent bookings can compute the same seq_num and either
--   collide or silently duplicate a reference.
-- Fix: an atomic per-year counter row via INSERT ... ON CONFLICT.

CREATE TABLE request_reference_counters (
    year_part VARCHAR(4) PRIMARY KEY,
    last_seq  INT NOT NULL DEFAULT 0
);

-- Backfill the counter from any existing data so numbering continues
-- correctly after this migration runs.
INSERT INTO request_reference_counters (year_part, last_seq)
SELECT
    SUBSTRING(request_reference FROM 4 FOR 4)              AS year_part,
    MAX(CAST(SUBSTRING(request_reference FROM 9) AS INT))  AS last_seq
FROM booking_requests
GROUP BY SUBSTRING(request_reference FROM 4 FOR 4)
ON CONFLICT (year_part) DO UPDATE SET last_seq = EXCLUDED.last_seq;

CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year_part VARCHAR(4);
    v_seq_num   INT;
BEGIN
    v_year_part := TO_CHAR(NEW.created_at, 'YYYY');

    -- NOTE: the INSERT target column is unqualified `year_part`, which is
    -- fine — the ambiguity Postgres complains about is between a *bare*
    -- identifier used as a value/conflict-target and a same-named PL/pgSQL
    -- variable. Prefixing the variable (v_year_part, v_seq_num) avoids it;
    -- do not rename these back to match the column names.
    INSERT INTO request_reference_counters (year_part, last_seq)
    VALUES (v_year_part, 1)
    ON CONFLICT (year_part)
        DO UPDATE SET last_seq = request_reference_counters.last_seq + 1
    RETURNING last_seq INTO v_seq_num;

    NEW.request_reference := 'DV-' || v_year_part || '-' || LPAD(v_seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger `set_request_reference` already points at this function name,
-- so no trigger changes are needed — CREATE OR REPLACE is enough.

-- ------------------------------------------------------------
-- 4. BOOKING CHANNEL
-- ------------------------------------------------------------
-- How THIS request came in (web form / WhatsApp / phone-in), which
-- is distinct from the customer's original acquisition `source`.
-- Needed for the dashboard ?channel= filter and daily analytics.
ALTER TABLE booking_requests
    ADD COLUMN channel customer_source NOT NULL DEFAULT 'website';

CREATE INDEX idx_booking_requests_channel ON booking_requests(channel);

-- ------------------------------------------------------------
-- 5. SEARCH & FILTER SUPPORT INDEXES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dashboard list endpoint commonly filters status + date range together
CREATE INDEX IF NOT EXISTS idx_booking_requests_status_date
    ON booking_requests(status, preferred_date);

-- ?search= on customers (name) and treatments (name)
CREATE INDEX idx_customers_full_name_trgm
    ON customers USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_treatments_name_trgm
    ON treatments USING gin (name gin_trgm_ops);

COMMIT;

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
