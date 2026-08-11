-- ============================================================
-- D'VINE SPA - BOOKING REQUEST & CUSTOMER DATABASE
-- PostgreSQL 14+
-- VERSION 2.0 (No Payment, Request-Only Flow)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. ENUMS
-- ============================================================
CREATE TYPE booking_status AS ENUM (
    'new_request',
    'contacted',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE customer_source AS ENUM (
    'instagram',
    'facebook',
    'tiktok',
    'google',
    'website',
    'referral',
    'hotel',
    'corporate',
    'walk_in',
    'other'
);

CREATE TYPE user_role AS ENUM (
    'admin',
    'staff'
);

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 CATEGORIES (NEW)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cover_image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_order ON categories(display_order);

-- 3.2 TREATMENTS (with category)
CREATE TABLE treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    benefits TEXT[],
    recommended_for TEXT[],
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_treatments_category ON treatments(category_id);
CREATE INDEX idx_treatments_active ON treatments(is_active);
CREATE INDEX idx_treatments_order ON treatments(display_order);
CREATE INDEX idx_treatments_name ON treatments(name);

-- 3.3 CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    source customer_source,
    customer_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_source ON customers(source);
CREATE INDEX idx_customers_since ON customers(customer_since);

-- 3.4 BOOKING REQUESTS
CREATE TABLE booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_reference VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    status booking_status DEFAULT 'new_request',
    staff_notes TEXT,
    confirmed_date DATE,
    confirmed_time TIME,
    contacted_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_requests_reference ON booking_requests(request_reference);
CREATE INDEX idx_booking_requests_customer ON booking_requests(customer_id);
CREATE INDEX idx_booking_requests_treatment ON booking_requests(treatment_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_booking_requests_date ON booking_requests(preferred_date);
CREATE INDEX idx_booking_requests_created ON booking_requests(created_at);

-- 3.5 STAFF / USERS (for admin access)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'staff',
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_active ON staff(is_active);

-- 3.6 AUDIT LOG (track status changes)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    booking_request_id UUID REFERENCES booking_requests(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    old_status booking_status,
    new_status booking_status,
    notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_booking ON audit_logs(booking_request_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- 4. VIEWS
-- ============================================================

-- 4.1 Booking request details view
CREATE VIEW booking_request_details AS
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
    END AS is_resolved
FROM booking_requests br
LEFT JOIN customers c ON br.customer_id = c.id
LEFT JOIN treatments t ON br.treatment_id = t.id
LEFT JOIN categories cat ON t.category_id = cat.id;

-- 4.2 Customer summary view
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
        SELECT t.name 
        FROM booking_requests br2 
        JOIN treatments t ON br2.treatment_id = t.id 
        WHERE br2.customer_id = c.id AND br2.status = 'completed' 
        ORDER BY br2.preferred_date DESC 
        LIMIT 1
    ) AS most_recent_treatment,
    COUNT(CASE WHEN br.status = 'new_request' THEN 1 END) AS pending_requests,
    MAX(br.created_at) AS last_activity
FROM customers c
LEFT JOIN booking_requests br ON c.id = br.customer_id
GROUP BY c.id;

-- 4.3 Daily requests summary
CREATE VIEW daily_requests_summary AS
SELECT 
    DATE(created_at) AS request_date,
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN status = 'new_request' THEN 1 END) AS new_requests,
    COUNT(CASE WHEN status = 'contacted' THEN 1 END) AS contacted,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
    COUNT(CASE WHEN status = 'no_show' THEN 1 END) AS no_show
FROM booking_requests
GROUP BY DATE(created_at)
ORDER BY request_date DESC;

-- ============================================================
-- 5. TRIGGERS & FUNCTIONS
-- ============================================================

-- 5.1 Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON treatments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON booking_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.2 Generate request reference
CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INT;
    seq_str VARCHAR(6);
BEGIN
    year_part := TO_CHAR(NEW.created_at, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_reference FROM 4) AS INT)), 0) + 1
    INTO seq_num
    FROM booking_requests
    WHERE request_reference LIKE 'DV-' || year_part || '-%';
    
    seq_str := LPAD(seq_num::TEXT, 6, '0');
    NEW.request_reference := 'DV-' || year_part || '-' || seq_str;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_request_reference BEFORE INSERT ON booking_requests
    FOR EACH ROW
    WHEN (NEW.request_reference IS NULL)
    EXECUTE FUNCTION generate_request_reference();

-- 5.3 Auto-set customer_since if null
CREATE OR REPLACE FUNCTION set_customer_since()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_since IS NULL THEN
        NEW.customer_since = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_since BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_since();

-- 5.4 Log status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (
            booking_request_id,
            action,
            old_status,
            new_status,
            notes
        ) VALUES (
            NEW.id,
            'status_change',
            OLD.status,
            NEW.status,
            'Status updated from ' || OLD.status::text || ' to ' || NEW.status::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_booking_status_change AFTER UPDATE ON booking_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_booking_status_change();

-- 5.5 Auto-set timestamps based on status
CREATE OR REPLACE FUNCTION set_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to contacted
    IF NEW.status = 'contacted' AND OLD.status != 'contacted' THEN
        NEW.contacted_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- When status changes to confirmed
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        NEW.confirmed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- When status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- When status changes to cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_timestamps BEFORE UPDATE ON booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_timestamps();

-- ============================================================
-- 6. SAMPLE DATA
-- ============================================================

-- 6.1 Categories
INSERT INTO categories (name, description, cover_image_url, display_order) VALUES
('Massage Therapy', 'Professional massage treatments for relaxation and recovery', '/images/categories/massage.jpg', 1),
('Body Treatments', 'Exfoliation, wrapping, and skin nourishment services', '/images/categories/body.jpg', 2),
('Heat Therapy', 'Sauna and heat-based relaxation therapies', '/images/categories/heat.jpg', 3),
('Specialty Services', 'Unique treatments combining multiple techniques', '/images/categories/specialty.jpg', 4);

-- 6.2 Treatments
INSERT INTO treatments (category_id, name, description, duration_minutes, price, image_url, benefits, recommended_for, display_order) VALUES
-- Massage Therapy
((SELECT id FROM categories WHERE name = 'Massage Therapy'), 
 'Deep Tissue Massage', 
 'A deeper massage experience designed to help relieve muscle tension and support relaxation.', 
 60, 30000, '/images/deep-tissue.jpg', 
 ARRAY['Relieves muscle tension', 'Improves circulation', 'Reduces stress', 'Speeds recovery'], 
 ARRAY['Muscle tension', 'Physical fatigue', 'Regular exercisers', 'Deeper pressure seekers'], 1),

((SELECT id FROM categories WHERE name = 'Massage Therapy'), 
 'Relaxation Massage', 
 'Gentle, flowing strokes to calm your nervous system and promote deep relaxation.', 
 50, 25000, '/images/relaxation.jpg', 
 ARRAY['Reduces anxiety', 'Lowers blood pressure', 'Improves sleep', 'Relaxes muscles'], 
 ARRAY['Stress relief', 'First-time clients', 'Gentle pressure preference'], 2),

((SELECT id FROM categories WHERE name = 'Massage Therapy'), 
 'Hot Stone Massage', 
 'Warm basalt stones combined with massage to melt away tension and promote deep relaxation.', 
 75, 40000, '/images/hot-stone.jpg', 
 ARRAY['Deep muscle relaxation', 'Improves blood flow', 'Reduces anxiety', 'Alleviates chronic pain'], 
 ARRAY['Chronic pain', 'Stress', 'Muscle stiffness', 'Luxury seekers'], 3),

((SELECT id FROM categories WHERE name = 'Massage Therapy'), 
 'Aromatherapy Massage', 
 'Essential oils tailored to your mood combined with gentle massage for holistic wellness.', 
 60, 32000, '/images/aromatherapy.jpg', 
 ARRAY['Balances emotions', 'Boosts mood', 'Reduces stress', 'Improves sleep'], 
 ARRAY['Emotional wellbeing', 'Stress management', 'Sensitive skin', 'Holistic therapy'], 4),

-- Body Treatments
((SELECT id FROM categories WHERE name = 'Body Treatments'), 
 'Body Scrub & Wrap', 
 'Exfoliate and nourish your skin with natural ingredients, leaving you refreshed and glowing.', 
 75, 35000, '/images/body-scrub.jpg', 
 ARRAY['Removes dead skin cells', 'Improves skin texture', 'Detoxifies body', 'Hydrates skin'], 
 ARRAY['Dry skin', 'Dull complexion', 'Special occasions', 'Detox seekers'], 1),

((SELECT id FROM categories WHERE name = 'Body Treatments'), 
 'Detox Body Wrap', 
 'A purifying body wrap using natural clay and seaweed to draw out toxins and revitalize your skin.', 
 60, 38000, '/images/detox-wrap.jpg', 
 ARRAY['Detoxifies body', 'Improves skin elasticity', 'Reduces bloating', 'Promotes circulation'], 
 ARRAY['Detox seekers', 'Water retention', 'Skin rejuvenation'], 2),

-- Heat Therapy
((SELECT id FROM categories WHERE name = 'Heat Therapy'), 
 'Sauna Session', 
 'Deep detoxification and relaxation in our traditional Finnish-style sauna.', 
 30, 15000, '/images/sauna.jpg', 
 ARRAY['Detoxifies body', 'Improves circulation', 'Relieves muscle pain', 'Boosts immune system'], 
 ARRAY['Post-workout recovery', 'Detox', 'Stress relief', 'Cold therapy enthusiasts'], 1),

((SELECT id FROM categories WHERE name = 'Heat Therapy'), 
 'Steam Room Session', 
 'A soothing steam session to open pores, relax muscles, and clear your mind.', 
 30, 12000, '/images/steam.jpg', 
 ARRAY['Opens pores', 'Respiratory relief', 'Muscle relaxation', 'Stress reduction'], 
 ARRAY['Respiratory issues', 'Skin purification', 'Relaxation seekers'], 2),

-- Specialty Services
((SELECT id FROM categories WHERE name = 'Specialty Services'), 
 'Couples Massage', 
 'A romantic spa experience for two, with synchronized massage techniques in a private suite.', 
 60, 55000, '/images/couples.jpg', 
 ARRAY['Shared experience', 'Bonding', 'Dual relaxation', 'Special occasions'], 
 ARRAY['Couples', 'Anniversaries', 'Valentine''s Day'], 1),

((SELECT id FROM categories WHERE name = 'Specialty Services'), 
 'Prenatal Massage', 
 'A gentle, safe massage tailored for expectant mothers to relieve pregnancy-related discomfort.', 
 50, 32000, '/images/prenatal.jpg', 
 ARRAY['Reduces back pain', 'Decreases swelling', 'Improves sleep', 'Reduces anxiety'], 
 ARRAY['Pregnant women (2nd-3rd trimester)', 'Pregnancy discomfort'], 2);

-- 6.3 Staff (default admin)
-- Password: Admin@123 (change this!)
INSERT INTO staff (email, password_hash, full_name, role, phone_number) VALUES
('admin@dvinespa.com', '$2a$10$XwP1nKpQr5WcZvNkLx8P0uYpVfG3jQp7LmNkI9JkLmNkI9JkLmNkI9', 'D''Vine Admin', 'admin', '+250788000000'),
('staff@dvinespa.com', '$2a$10$XwP1nKpQr5WcZvNkLx8P0uYpVfG3jQp7LmNkI9JkLmNkI9JkLmNkI9', 'D''Vine Staff', 'staff', '+250788000001');

-- 6.4 Sample Customers
INSERT INTO customers (full_name, phone_number, whatsapp_number, source, notes) VALUES
('Sarah Mucyo', '+250788999999', '+250788999999', 'instagram', 'First-time customer, interested in deep tissue'),
('Jean-Pierre Habimana', '+250788888888', NULL, 'referral', 'Referred by Sarah M. Prefers morning appointments'),
('Claudine Uwimana', '+250788777777', '+250788777777', 'website', 'Found us through Google search'),
('David Niyonzima', '+250788666666', NULL, 'hotel', 'Staying at Kigali Marriott'),
('Marie-Claire Mugabo', '+250788555555', '+250788555555', 'facebook', 'Saw our Facebook ad');

-- 6.5 Sample Booking Requests
INSERT INTO booking_requests (
    customer_id, 
    treatment_id, 
    preferred_date, 
    preferred_time, 
    status,
    staff_notes,
    confirmed_date,
    confirmed_time,
    contacted_at,
    confirmed_at,
    completed_at
) VALUES
-- New request
(
    (SELECT id FROM customers WHERE phone_number = '+250788999999'),
    (SELECT id FROM treatments WHERE name = 'Deep Tissue Massage'),
    CURRENT_DATE + INTERVAL '3 days',
    '15:00',
    'new_request',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
),
-- Contacted request
(
    (SELECT id FROM customers WHERE phone_number = '+250788888888'),
    (SELECT id FROM treatments WHERE name = 'Relaxation Massage'),
    CURRENT_DATE + INTERVAL '2 days',
    '10:00',
    'contacted',
    'Called customer, waiting for confirmation',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    NULL,
    NULL
),
-- Confirmed booking
(
    (SELECT id FROM customers WHERE phone_number = '+250788777777'),
    (SELECT id FROM treatments WHERE name = 'Hot Stone Massage'),
    CURRENT_DATE + INTERVAL '5 days',
    '14:00',
    'confirmed',
    'Confirmed via phone. Customer excited about hot stone.',
    CURRENT_DATE + INTERVAL '5 days',
    '14:00',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    NULL
),
-- Completed visit
(
    (SELECT id FROM customers WHERE phone_number = '+250788666666'),
    (SELECT id FROM treatments WHERE name = 'Body Scrub & Wrap'),
    CURRENT_DATE - INTERVAL '7 days',
    '11:00',
    'completed',
    'Excellent feedback. Customer booked next session.',
    CURRENT_DATE - INTERVAL '7 days',
    '11:00',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '9 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
),
-- Cancelled
(
    (SELECT id FROM customers WHERE phone_number = '+250788555555'),
    (SELECT id FROM treatments WHERE name = 'Sauna Session'),
    CURRENT_DATE + INTERVAL '1 day',
    '16:00',
    'cancelled',
    'Customer called to cancel due to emergency',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    NULL,
    NULL
),
-- Another new request (same customer as Sarah)
(
    (SELECT id FROM customers WHERE phone_number = '+250788999999'),
    (SELECT id FROM treatments WHERE name = 'Relaxation Massage'),
    CURRENT_DATE + INTERVAL '7 days',
    '09:00',
    'new_request',
    'Returning customer, trying relaxation this time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
);

-- 6.6 Audit Logs (some sample entries)
INSERT INTO audit_logs (booking_request_id, action, old_status, new_status, notes)
SELECT 
    br.id,
    'status_change',
    'new_request',
    'contacted',
    'Staff contacted customer'
FROM booking_requests br
WHERE br.status IN ('contacted', 'confirmed', 'completed')
LIMIT 1;

INSERT INTO audit_logs (booking_request_id, action, old_status, new_status, notes)
SELECT 
    br.id,
    'status_change',
    'contacted',
    'confirmed',
    'Appointment confirmed with customer'
FROM booking_requests br
WHERE br.status IN ('confirmed', 'completed')
LIMIT 1;

-- ============================================================
-- 7. ADDITIONAL INDEXES
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_requests_date_status ON booking_requests(preferred_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone_partial ON customers(phone_number) WHERE phone_number IS NOT NULL;

-- ============================================================
-- 8. CONSTRAINTS
-- ============================================================

-- Ensure price is positive
ALTER TABLE treatments ADD CONSTRAINT check_price_positive 
    CHECK (price > 0);

-- Ensure duration is positive
ALTER TABLE treatments ADD CONSTRAINT check_duration_positive 
    CHECK (duration_minutes > 0);

-- Ensure preferred date is not in the past (except for completed/cancelled)
-- (Handled by application logic, but we add a soft constraint)

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE categories IS 'Treatment categories (Massage, Body, Heat, Specialty) with optional cover images';
COMMENT ON TABLE treatments IS 'Spa treatments with pricing, duration, benefits, and recommended for fields';
COMMENT ON TABLE customers IS 'Customer profiles with contact info and source tracking';
COMMENT ON TABLE booking_requests IS 'Booking requests made by customers. Status tracks the call flow';
COMMENT ON TABLE staff IS 'Staff users who can access the admin dashboard';
COMMENT ON TABLE audit_logs IS 'Tracks status changes and actions on booking requests';
COMMENT ON VIEW customer_summary IS 'Aggregated customer data including visits and last treatment';
COMMENT ON VIEW daily_requests_summary IS 'Daily request statistics for admin overview';

-- ============================================================
-- 10. MAINTENANCE
-- ============================================================

VACUUM ANALYZE;

-- ============================================================
-- END OF SCHEMA
-- ============================================================-- ============================================================
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
