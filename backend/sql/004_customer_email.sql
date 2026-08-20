-- 004_customer_email.sql
-- Adds optional email address to the customers table.
-- Run this against the live DB before deploying the corresponding backend changes.
-- This project's schema is owned by hand-written SQL files (not prisma migrate dev).

ALTER TABLE customers ADD COLUMN email VARCHAR(255);

-- Loose format check. SendGrid will validate more strictly on send;
-- this just stops obvious garbage entering from the public booking form.
ALTER TABLE customers ADD CONSTRAINT customers_email_format_chk
  CHECK (
    email IS NULL
    OR email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  );

COMMENT ON COLUMN customers.email IS
  'Optional customer email. Nullable — most historical rows will be NULL. '
  'Populated from the public booking form or by staff via the admin Customers page.';
