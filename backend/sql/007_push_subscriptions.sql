-- ============================================================
-- 007: Push subscriptions (notifications on a staff member's phone)
-- ============================================================
-- One row per device a staff member has turned notifications on for.
-- The browser hands us an endpoint URL at its own push service (Google,
-- Mozilla, Apple) plus two keys the message is encrypted with; that triple
-- IS the address. It cannot be guessed from the staff id, and it stops
-- working the moment the person turns notifications off or uninstalls the
-- app, which the push service reports back as 404/410 so the row can go.
--
-- Nothing here is a secret of ours: the private VAPID key that signs the
-- messages lives in the environment, never in the database.
--
-- Apply:  psql "$DATABASE_URL" -f backend/sql/007_push_subscriptions.sql
-- Then:   cd backend && npx prisma db pull && npx prisma generate
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    -- The push service URL. Unique: one row per device, and re-subscribing
    -- the same device updates the row instead of piling up duplicates.
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    -- For the "this device" list in Settings, so a person can tell which
    -- phone they are looking at.
    user_agent  VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Touched on every successful send; a device silent for months can be
    -- pruned without guessing.
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_staff ON push_subscriptions(staff_id);

COMMENT ON TABLE push_subscriptions IS
  'Web Push endpoints, one per staff device. Written when a staff member turns notifications on in the dashboard; deleted when the push service reports the endpoint is gone (404/410).';

COMMIT;
