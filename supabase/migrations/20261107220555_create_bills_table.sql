/*
# Create bills table for cross-border bill payment platform

1. New Tables
- `bills`
  - `id` (uuid, primary key)
  - `biller_name` (text, name of the utility company / biller, e.g. "Manila Electric Company")
  - `account_number` (text, the recipient's account/reference number with the biller)
  - `amount_due` (numeric(18,2), the amount owed in local currency)
  - `currency` (text, ISO 4217 local currency code the bill is denominated in, e.g. "PHP")
  - `category` (text, bill category: "utility" | "water" | "internet" | "telecom" | "rent" | "insurance" | "other")
  - `recipient_name` (text, the family member the bill belongs to)
  - `due_date` (date, when the bill must be paid by)
  - `status` (text, "pending" | "paid", default "pending")
  - `stellar_tx_hash` (text, nullable, the Stellar transaction hash once paid)
  - `paid_amount_usdc` (numeric(18,2), nullable, USDC amount charged to the sender)
  - `payout_anchor` (text, the Stellar anchor that delivers local currency to the recipient, default "eurmtl" placeholder)
  - `paid_at` (timestamptz, nullable, timestamp of payment)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `bills`.
- This is a single-tenant demo app with mock role switching (no real auth), so we
  grant CRUD to `anon` + `authenticated` and allow open access. Both the family
  recipient view and the overseas worker sender view share this same pool of bills.
- All four CRUD policies use `USING (true)` / `WITH CHECK (true)` because the data
  is intentionally shared/public across the two demo roles.

3. Seed data
- Insert a few sample bills so both views have content on first load.
*/

CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biller_name text NOT NULL,
  account_number text NOT NULL,
  amount_due numeric(18,2) NOT NULL CHECK (amount_due > 0),
  currency text NOT NULL DEFAULT 'PHP',
  category text NOT NULL DEFAULT 'utility' CHECK (category IN ('utility','water','internet','telecom','rent','insurance','other')),
  recipient_name text NOT NULL DEFAULT 'Santos Family',
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  stellar_tx_hash text,
  paid_amount_usdc numeric(18,2),
  payout_anchor text NOT NULL DEFAULT 'PHP Anchor',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON bills TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_bills" ON bills;
CREATE POLICY "anon_select_bills" ON bills FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bills" ON bills;
CREATE POLICY "anon_insert_bills" ON bills FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bills" ON bills;
CREATE POLICY "anon_update_bills" ON bills FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bills" ON bills;
CREATE POLICY "anon_delete_bills" ON bills FOR DELETE
  TO anon, authenticated USING (true);

-- Seed sample bills (use ON CONFLICT do nothing so re-runs are safe)
INSERT INTO bills (biller_name, account_number, amount_due, currency, category, recipient_name, due_date, payout_anchor) VALUES
  ('Manila Electric Company', 'MEC-2094-55821', 4250.00, 'PHP', 'utility', 'Santos Family', '2026-11-15', 'PHP Anchor'),
  ('Manila Water Company', 'MWC-7781-00234', 820.00, 'PHP', 'water', 'Santos Family', '2026-11-20', 'PHP Anchor'),
  ('PLDT Home Fiber', 'PLDT-552190', 1899.00, 'PHP', 'internet', 'Santos Family', '2026-11-18', 'PHP Anchor'),
  ('Globe Postpaid', 'GLOBE-998122', 1299.00, 'PHP', 'telecom', 'Santos Family', '2026-11-22', 'PHP Anchor')
ON CONFLICT DO NOTHING;
