-- ============================================================
-- D'VINE SPA - MIGRATION 003
-- Realtime Notifications (Postgres LISTEN/NOTIFY)
-- PostgreSQL 14+
-- Run after: 002_clerk_integration_and_fixes.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. BOOKING REQUEST CHANGES → 'booking_updates' CHANNEL
-- ------------------------------------------------------------
-- Fires on every INSERT (new request) and UPDATE (status change,
-- reschedule, notes edit) so the dashboard socket server can
-- re-broadcast to connected staff without polling the DB.

CREATE OR REPLACE FUNCTION notify_booking_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload := json_build_object(
        'op', TG_OP,                                   -- INSERT | UPDATE
        'id', NEW.id,
        'request_reference', NEW.request_reference,
        'customer_id', NEW.customer_id,
        'treatment_id', NEW.treatment_id,
        'status', NEW.status,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'preferred_date', NEW.preferred_date,
        'preferred_time', NEW.preferred_time,
        'updated_at', NEW.updated_at
    );

    -- pg_notify payloads are capped at 8000 bytes; this payload is
    -- small and fixed-shape, well within that limit.
    PERFORM pg_notify('booking_updates', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_booking_change
    AFTER INSERT OR UPDATE ON booking_requests
    FOR EACH ROW EXECUTE FUNCTION notify_booking_change();

-- ------------------------------------------------------------
-- 2. NEW BOOKING REQUEST → 'dashboard_notifications' CHANNEL
-- ------------------------------------------------------------
-- A separate, lighter channel specifically for the "toast /
-- notification bell" use case in the dashboard, so the frontend
-- doesn't have to infer "is this a new request?" from op/old_status
-- on the channel above.

CREATE OR REPLACE FUNCTION notify_new_booking_request()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('dashboard_notifications', json_build_object(
        'type', 'new_booking_request',
        'booking_request_id', NEW.id,
        'request_reference', NEW.request_reference,
        'created_at', NEW.created_at
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_new_booking_request
    AFTER INSERT ON booking_requests
    FOR EACH ROW EXECUTE FUNCTION notify_new_booking_request();

-- ------------------------------------------------------------
-- 3. STATUS TRANSITIONS OF INTEREST → SAME CHANNEL
-- ------------------------------------------------------------
-- Also flag cancellations and no-shows on the notification channel
-- (things staff want to be pinged about, vs. every minor field edit).

CREATE OR REPLACE FUNCTION notify_booking_status_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('cancelled', 'no_show') AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM pg_notify('dashboard_notifications', json_build_object(
            'type', 'booking_' || NEW.status,
            'booking_request_id', NEW.id,
            'request_reference', NEW.request_reference,
            'reason', NEW.cancellation_reason
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_booking_status_alert
    AFTER UPDATE ON booking_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_booking_status_alert();

COMMIT;

-- ============================================================
-- END OF MIGRATION 003
-- ============================================================
