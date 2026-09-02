-- READY TO RUN CEDES

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: dvine
--

CREATE TYPE public.booking_status AS ENUM (
    'new_request',
    'contacted',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE public.booking_status OWNER TO neondb_owner;

--
-- Name: customer_source; Type: TYPE; Schema: public; Owner: dvine
--

CREATE TYPE public.customer_source AS ENUM (
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


ALTER TYPE public.customer_source OWNER TO neondb_owner;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: dvine
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'staff'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: generate_request_reference(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.generate_request_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INT;
    seq_str VARCHAR(6);
BEGIN
    year_part := TO_CHAR(NEW.created_at, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_reference FROM 9) AS INT)), 0) + 1
    INTO seq_num
    FROM booking_requests
    WHERE request_reference LIKE 'DV-' || year_part || '-%';
    
    seq_str := LPAD(seq_num::TEXT, 6, '0');
    NEW.request_reference := 'DV-' || year_part || '-' || seq_str;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_request_reference() OWNER TO neondb_owner;

--
-- Name: log_booking_status_change(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.log_booking_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.log_booking_status_change() OWNER TO neondb_owner;

--
-- Name: notify_booking_change(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.notify_booking_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.notify_booking_change() OWNER TO neondb_owner;

--
-- Name: notify_booking_status_alert(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.notify_booking_status_alert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.notify_booking_status_alert() OWNER TO neondb_owner;

--
-- Name: notify_new_booking_request(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.notify_new_booking_request() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('dashboard_notifications', json_build_object(
        'type', 'new_booking_request',
        'booking_request_id', NEW.id,
        'request_reference', NEW.request_reference,
        'created_at', NEW.created_at
    )::text);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_new_booking_request() OWNER TO neondb_owner;

--
-- Name: set_booking_timestamps(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.set_booking_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.set_booking_timestamps() OWNER TO neondb_owner;

--
-- Name: set_customer_since(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.set_customer_since() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.customer_since IS NULL THEN
        NEW.customer_since = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_customer_since() OWNER TO neondb_owner;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dvine
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    booking_request_id uuid,
    action character varying(100) NOT NULL,
    old_status public.booking_status,
    new_status public.booking_status,
    notes text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: booking_requests; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.booking_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_reference character varying(20),
    customer_id uuid NOT NULL,
    treatment_id uuid NOT NULL,
    preferred_date date NOT NULL,
    preferred_time time(6) without time zone NOT NULL,
    status public.booking_status DEFAULT 'new_request'::public.booking_status NOT NULL,
    staff_notes text,
    confirmed_date date,
    confirmed_time time(6) without time zone,
    contacted_at timestamp(6) without time zone,
    confirmed_at timestamp(6) without time zone,
    completed_at timestamp(6) without time zone,
    cancelled_at timestamp(6) without time zone,
    cancellation_reason text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    channel public.customer_source DEFAULT 'website'::public.customer_source NOT NULL
);


ALTER TABLE public.booking_requests OWNER TO neondb_owner;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    cover_image_url character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.categories OWNER TO neondb_owner;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(100) NOT NULL,
    phone_number character varying(20) NOT NULL,
    whatsapp_number character varying(20),
    source public.customer_source,
    customer_since timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: treatments; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.treatments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid,
    name character varying(100) NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    image_url character varying(255),
    benefits text[],
    recommended_for text[],
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.treatments OWNER TO neondb_owner;

--
-- Name: booking_request_details; Type: VIEW; Schema: public; Owner: dvine
--

CREATE VIEW public.booking_request_details AS
 SELECT br.id,
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
            WHEN (br.status = ANY (ARRAY['completed'::public.booking_status, 'cancelled'::public.booking_status, 'no_show'::public.booking_status])) THEN true
            ELSE false
        END AS is_resolved
   FROM (((public.booking_requests br
     LEFT JOIN public.customers c ON ((br.customer_id = c.id)))
     LEFT JOIN public.treatments t ON ((br.treatment_id = t.id)))
     LEFT JOIN public.categories cat ON ((t.category_id = cat.id)));


ALTER VIEW public.booking_request_details OWNER TO neondb_owner;

--
-- Name: customer_summary; Type: VIEW; Schema: public; Owner: dvine
--

CREATE VIEW public.customer_summary AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(100) AS full_name,
    NULL::character varying(20) AS phone_number,
    NULL::character varying(20) AS whatsapp_number,
    NULL::public.customer_source AS source,
    NULL::timestamp(6) without time zone AS customer_since,
    NULL::bigint AS total_requests,
    NULL::bigint AS total_visits,
    NULL::date AS last_visit_date,
    NULL::character varying(100) AS most_recent_treatment,
    NULL::bigint AS pending_requests,
    NULL::timestamp without time zone AS last_activity;


ALTER VIEW public.customer_summary OWNER TO neondb_owner;

--
-- Name: daily_requests_summary; Type: VIEW; Schema: public; Owner: dvine
--

CREATE VIEW public.daily_requests_summary AS
 SELECT date(created_at) AS request_date,
    count(*) AS total_requests,
    count(
        CASE
            WHEN (status = 'new_request'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS new_requests,
    count(
        CASE
            WHEN (status = 'contacted'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS contacted,
    count(
        CASE
            WHEN (status = 'confirmed'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS confirmed,
    count(
        CASE
            WHEN (status = 'completed'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS completed,
    count(
        CASE
            WHEN (status = 'cancelled'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS cancelled,
    count(
        CASE
            WHEN (status = 'no_show'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS no_show
   FROM public.booking_requests
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;


ALTER VIEW public.daily_requests_summary OWNER TO neondb_owner;

--
-- Name: request_reference_counters; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.request_reference_counters (
    year_part character varying(4) NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.request_reference_counters OWNER TO neondb_owner;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.staff (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email public.citext NOT NULL,
    password_hash character varying(255),
    full_name character varying(100) NOT NULL,
    role public.user_role DEFAULT 'staff'::public.user_role NOT NULL,
    phone_number character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    clerk_user_id character varying(64)
);


ALTER TABLE public.staff OWNER TO neondb_owner;

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: dvine
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider character varying(30) DEFAULT 'clerk'::character varying NOT NULL,
    event_id character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'received'::character varying NOT NULL,
    error_message text,
    processed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ALTER TABLE public.webhook_events OWNER TO neondb_owner;

-- --
-- -- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: dvine
-- --

-- COPY public.audit_logs (id, user_id, booking_request_id, action, old_status, new_status, notes, ip_address, user_agent, created_at) FROM stdin;
-- -- \.


-- -- --
-- -- -- Data for Name: booking_requests; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.booking_requests (id, request_reference, customer_id, treatment_id, preferred_date, preferred_time, status, staff_notes, confirmed_date, confirmed_time, contacted_at, confirmed_at, completed_at, cancelled_at, cancellation_reason, created_at, updated_at, channel) FROM stdin;
-- b09355f8-4279-4520-89ae-4194f44eedc5	\N	5bd158f2-2ec8-4180-9be5-ab30d30c83da	d4807821-44da-4d7f-bca4-6f7605fd74c6	2026-08-20	10:00:00	contacted	Called customer, waiting for confirmation	\N	\N	\N	\N	\N	\N	\N	2026-08-18 01:59:42.04	2026-08-18 01:59:42.04	website
-- 1ed74391-72df-4182-8d2c-1aa7b5aa9673	\N	d6926494-d6af-4fe0-8c05-7e54251f0084	06222f76-b79a-4f94-8999-460a8993206b	2026-08-23	14:00:00	confirmed	Confirmed via phone.	\N	\N	\N	\N	\N	\N	\N	2026-08-18 01:59:42.042	2026-08-18 01:59:42.042	website
-- b71f0a48-91b1-4a88-b471-290221145c2b	\N	89d3c82c-2e8c-4cfa-8f2c-47a3780941a0	57b47066-4ad6-47e2-b687-3dd5f0280aa4	2026-08-21	15:00:00	new_request	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-18 01:59:42.038	2026-08-18 01:59:42.038	website
-- 38875de4-e0a6-486b-985a-9abbd235fd74	\N	8bf01736-4222-4fec-8854-c2e32ce2f6d7	57b47066-4ad6-47e2-b687-3dd5f0280aa4	2026-09-04	23:11:00	new_request	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-18 02:18:44.202	2026-08-18 02:18:44.202	instagram
-- 135b3fa0-7e17-4f71-9b0a-aac0f74fa17e	DV-2026-000001	8bf01736-4222-4fec-8854-c2e32ce2f6d7	57b47066-4ad6-47e2-b687-3dd5f0280aa4	2026-09-04	23:11:00	new_request	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-18 04:18:01.152	2026-08-18 04:18:01.152	instagram
-- dc5aa3ae-33d5-4091-a67c-a043a1ea8346	DV-2026-000002	8bf01736-4222-4fec-8854-c2e32ce2f6d7	57b47066-4ad6-47e2-b687-3dd5f0280aa4	2026-09-04	23:11:00	new_request	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-18 04:18:11.224	2026-08-18 04:18:11.224	instagram
-- 90a8d2a2-9531-48d1-a729-c8b138e40ac9	\N	8bf01736-4222-4fec-8854-c2e32ce2f6d7	57b47066-4ad6-47e2-b687-3dd5f0280aa4	2026-09-04	23:11:00	new_request	\N	\N	\N	\N	\N	\N	\N	\N	2026-08-18 04:14:09.233	2026-08-18 04:14:09.233	instagram
-- -- \.


-- -- --
-- -- -- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.categories (id, name, description, cover_image_url, is_active, display_order, created_at, updated_at) FROM stdin;
-- 78a3b3f4-9f6c-4d0e-ac0f-242dc1d187ca	Heat Therapy	Sauna and heat-based relaxation therapies	/images/categories/heat.jpg	t	3	2026-08-18 01:59:41.155	2026-08-18 01:59:41.155
-- 6748e6c4-9619-4434-8ae4-2934ff4d047f	Body Treatments	Exfoliation, wrapping, and skin nourishment services	/images/categories/body.jpg	t	2	2026-08-18 01:59:41.155	2026-08-18 01:59:41.155
-- 0260079f-fe30-4136-bd3a-d4377764b15a	Specialty Services	Unique treatments combining multiple techniques	/images/categories/specialty.jpg	t	4	2026-08-18 01:59:41.155	2026-08-18 01:59:41.155
-- b65a00e8-1656-4718-a163-bae88ca93146	Massage Therapy	Professional massage treatments for relaxation and recovery	/images/categories/massage.jpg	t	1	2026-08-18 01:59:41.153	2026-08-18 01:59:41.153
-- 202d99d4-866d-431b-84ca-2b0c9c20f24c	string	string	https://example.com/	f	0	2026-08-18 02:29:44.263	2026-08-18 02:29:44.263
-- -- \.


-- -- --
-- -- -- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.customers (id, full_name, phone_number, whatsapp_number, source, customer_since, notes, created_at, updated_at) FROM stdin;
-- 89d3c82c-2e8c-4cfa-8f2c-47a3780941a0	Sarah Mucyo	+250788999999	+250788999999	instagram	2026-08-18 01:59:41.915	First-time customer, interested in deep tissue	2026-08-18 01:59:41.915	2026-08-18 01:59:41.915
-- d6926494-d6af-4fe0-8c05-7e54251f0084	Claudine Uwimana	+250788777777	+250788777777	website	2026-08-18 01:59:41.923	Found us through Google search	2026-08-18 01:59:41.923	2026-08-18 01:59:41.923
-- 5bd158f2-2ec8-4180-9be5-ab30d30c83da	Jean-Pierre Habimana	+250788888888	\N	referral	2026-08-18 01:59:41.92	Referred by Sarah M. Prefers morning appointments	2026-08-18 01:59:41.92	2026-08-18 01:59:41.92
-- 8bf01736-4222-4fec-8854-c2e32ce2f6d7	NKiko Hertier	2500000000	2500000000	instagram	2026-08-18 02:18:43.403	string	2026-08-18 02:18:43.403	2026-08-18 02:18:43.403
-- -- \.


-- -- --
-- -- -- Data for Name: request_reference_counters; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.request_reference_counters (year_part, last_seq) FROM stdin;
-- -- \.


-- -- --
-- -- -- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.staff (id, email, password_hash, full_name, role, phone_number, is_active, last_login, created_at, updated_at, clerk_user_id) FROM stdin;
-- -- \.


-- -- --
-- -- -- Data for Name: treatments; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.treatments (id, category_id, name, description, duration_minutes, price, image_url, benefits, recommended_for, is_active, display_order, created_at, updated_at) FROM stdin;
-- 57b47066-4ad6-47e2-b687-3dd5f0280aa4	b65a00e8-1656-4718-a163-bae88ca93146	Deep Tissue Massage	A deeper massage experience designed to help relieve muscle tension and support relaxation.	60	30000.00	/images/deep-tissue.jpg	{"Relieves muscle tension","Improves circulation","Reduces stress","Speeds recovery"}	{"Muscle tension","Physical fatigue","Regular exercisers","Deeper pressure seekers"}	t	1	2026-08-18 01:59:41.67	2026-08-18 01:59:41.67
-- d4807821-44da-4d7f-bca4-6f7605fd74c6	b65a00e8-1656-4718-a163-bae88ca93146	Relaxation Massage	Gentle, flowing strokes to calm your nervous system and promote deep relaxation.	50	25000.00	/images/relaxation.jpg	{"Reduces anxiety","Lowers blood pressure","Improves sleep","Relaxes muscles"}	{"Stress relief","First-time clients","Gentle pressure preference"}	t	2	2026-08-18 01:59:41.747	2026-08-18 01:59:41.747
-- 06222f76-b79a-4f94-8999-460a8993206b	b65a00e8-1656-4718-a163-bae88ca93146	Hot Stone Massage	Warm basalt stones combined with massage to melt away tension and promote deep relaxation.	75	40000.00	/images/hot-stone.jpg	{"Deep muscle relaxation","Improves blood flow","Reduces anxiety","Alleviates chronic pain"}	{"Chronic pain",Stress,"Muscle stiffness","Luxury seekers"}	t	3	2026-08-18 01:59:41.788	2026-08-18 01:59:41.788
-- 5c542876-fbca-46e9-ba22-4d4be95b6f9d	6748e6c4-9619-4434-8ae4-2934ff4d047f	Body Scrub & Wrap	Exfoliate and nourish your skin with natural ingredients, leaving you refreshed and glowing.	75	35000.00	/images/body-scrub.jpg	{"Removes dead skin cells","Improves skin texture","Detoxifies body","Hydrates skin"}	{"Dry skin","Dull complexion","Special occasions","Detox seekers"}	t	1	2026-08-18 01:59:41.84	2026-08-18 01:59:41.84
-- 4fcfb903-ed5c-4b31-8b46-b5361a153834	78a3b3f4-9f6c-4d0e-ac0f-242dc1d187ca	Sauna Session	Deep detoxification and relaxation in our traditional Finnish-style sauna.	30	15000.00	/images/sauna.jpg	{"Detoxifies body","Improves circulation","Relieves muscle pain","Boosts immune system"}	{"Post-workout recovery",Detox,"Stress relief"}	t	1	2026-08-18 01:59:41.876	2026-08-18 01:59:41.876
-- -- \.


-- -- --
-- -- -- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: dvine
-- -- --

-- COPY public.webhook_events (id, provider, event_id, event_type, payload, status, error_message, processed_at, created_at) FROM stdin;
-- -- \.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: booking_requests booking_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.booking_requests
    ADD CONSTRAINT booking_requests_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: request_reference_counters request_reference_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.request_reference_counters
    ADD CONSTRAINT request_reference_counters_pkey PRIMARY KEY (year_part);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: booking_requests_request_reference_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX booking_requests_request_reference_key ON public.booking_requests USING btree (request_reference);


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: customers_phone_number_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX customers_phone_number_key ON public.customers USING btree (phone_number);


--
-- Name: idx_audit_booking; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_audit_booking ON public.audit_logs USING btree (booking_request_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_audit_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_booking_requests_channel; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_channel ON public.booking_requests USING btree (channel);


--
-- Name: idx_booking_requests_created; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_created ON public.booking_requests USING btree (created_at);


--
-- Name: idx_booking_requests_customer; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_customer ON public.booking_requests USING btree (customer_id);


--
-- Name: idx_booking_requests_date; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_date ON public.booking_requests USING btree (preferred_date);


--
-- Name: idx_booking_requests_status; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_status ON public.booking_requests USING btree (status);


--
-- Name: idx_booking_requests_status_date; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_status_date ON public.booking_requests USING btree (status, preferred_date);


--
-- Name: idx_booking_requests_treatment; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_booking_requests_treatment ON public.booking_requests USING btree (treatment_id);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_categories_order; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_categories_order ON public.categories USING btree (display_order);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone_number);


--
-- Name: idx_customers_since; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_customers_since ON public.customers USING btree (customer_since);


--
-- Name: idx_customers_source; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_customers_source ON public.customers USING btree (source);


--
-- Name: idx_staff_active; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_staff_active ON public.staff USING btree (is_active);


--
-- Name: idx_staff_clerk_user_id; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_staff_clerk_user_id ON public.staff USING btree (clerk_user_id);


--
-- Name: idx_treatments_active; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_treatments_active ON public.treatments USING btree (is_active);


--
-- Name: idx_treatments_category; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_treatments_category ON public.treatments USING btree (category_id);


--
-- Name: idx_treatments_name; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_treatments_name ON public.treatments USING btree (name);


--
-- Name: idx_treatments_order; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_treatments_order ON public.treatments USING btree (display_order);


--
-- Name: idx_webhook_events_status; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_webhook_events_status ON public.webhook_events USING btree (status);


--
-- Name: idx_webhook_events_type; Type: INDEX; Schema: public; Owner: dvine
--

CREATE INDEX idx_webhook_events_type ON public.webhook_events USING btree (event_type);


--
-- Name: staff_clerk_user_id_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX staff_clerk_user_id_key ON public.staff USING btree (clerk_user_id);


--
-- Name: staff_email_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX staff_email_key ON public.staff USING btree (email);


--
-- Name: treatments_name_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX treatments_name_key ON public.treatments USING btree (name);


--
-- Name: webhook_events_provider_event_id_key; Type: INDEX; Schema: public; Owner: dvine
--

CREATE UNIQUE INDEX webhook_events_provider_event_id_key ON public.webhook_events USING btree (provider, event_id);


--
-- Name: customer_summary _RETURN; Type: RULE; Schema: public; Owner: dvine
--

CREATE OR REPLACE VIEW public.customer_summary AS
 SELECT c.id,
    c.full_name,
    c.phone_number,
    c.whatsapp_number,
    c.source,
    c.customer_since,
    count(br.id) AS total_requests,
    count(
        CASE
            WHEN (br.status = 'completed'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS total_visits,
    max(
        CASE
            WHEN (br.status = 'completed'::public.booking_status) THEN br.preferred_date
            ELSE NULL::date
        END) AS last_visit_date,
    ( SELECT t.name
           FROM (public.booking_requests br2
             JOIN public.treatments t ON ((br2.treatment_id = t.id)))
          WHERE ((br2.customer_id = c.id) AND (br2.status = 'completed'::public.booking_status))
          ORDER BY br2.preferred_date DESC
         LIMIT 1) AS most_recent_treatment,
    count(
        CASE
            WHEN (br.status = 'new_request'::public.booking_status) THEN 1
            ELSE NULL::integer
        END) AS pending_requests,
    max(br.created_at) AS last_activity
   FROM (public.customers c
     LEFT JOIN public.booking_requests br ON ((c.id = br.customer_id)))
  GROUP BY c.id;


--
-- Name: booking_requests log_booking_status_change; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER log_booking_status_change AFTER UPDATE ON public.booking_requests FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.log_booking_status_change();


--
-- Name: booking_requests notify_booking_change; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER notify_booking_change AFTER INSERT OR UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();


--
-- Name: booking_requests notify_booking_status_alert; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER notify_booking_status_alert AFTER UPDATE ON public.booking_requests FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.notify_booking_status_alert();


--
-- Name: booking_requests notify_new_booking_request; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER notify_new_booking_request AFTER INSERT ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking_request();


--
-- Name: booking_requests set_booking_timestamps; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER set_booking_timestamps BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.set_booking_timestamps();


--
-- Name: customers set_customer_since; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER set_customer_since BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_customer_since();


--
-- Name: booking_requests set_request_reference; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER set_request_reference BEFORE INSERT ON public.booking_requests FOR EACH ROW WHEN ((new.request_reference IS NULL)) EXECUTE FUNCTION public.generate_request_reference();


--
-- Name: booking_requests update_booking_requests_updated_at; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_staff_updated_at; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: treatments update_treatments_updated_at; Type: TRIGGER; Schema: public; Owner: dvine
--

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_booking_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_booking_request_id_fkey FOREIGN KEY (booking_request_id) REFERENCES public.booking_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: booking_requests booking_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.booking_requests
    ADD CONSTRAINT booking_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: booking_requests booking_requests_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.booking_requests
    ADD CONSTRAINT booking_requests_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: treatments treatments_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dvine
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

-- \unrestrict a1g7RvzRmTaYfzJfzz0A1wYvHN9FMru2amkLAnrlvadINEWJTSEAhqc2VRFFbMn









