-- 006_booking_request_treatments.sql
-- Junction table so one booking request can include multiple treatments.
-- booking_requests.treatment_id remains the primary (first) treatment for
-- backward compatibility with admin list, emails, and realtime payloads.
-- Run this against the live DB before deploying the corresponding backend changes.

CREATE TABLE booking_request_treatments (
    booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
    treatment_id       UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
    display_order      INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (booking_request_id, treatment_id)
);

CREATE INDEX idx_brt_treatment ON booking_request_treatments(treatment_id);
CREATE INDEX idx_brt_booking ON booking_request_treatments(booking_request_id);

-- Backfill: every existing booking already has a primary treatment_id.
INSERT INTO booking_request_treatments (booking_request_id, treatment_id, display_order)
SELECT id, treatment_id, 0
FROM booking_requests
ON CONFLICT DO NOTHING;

COMMENT ON TABLE booking_request_treatments IS
  'Services attached to a booking request. display_order 0 matches '
  'booking_requests.treatment_id (the primary/first selected service).';
