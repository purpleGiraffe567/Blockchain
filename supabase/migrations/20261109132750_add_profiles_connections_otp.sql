/*
# Add profiles, connections, OTP linking, and scope bills to recipients

## Purpose
Introduces a lightweight mock-identity layer so a Sender can securely connect
to one or more Recipient (family member) accounts using a single-use OTP.
Once connected, the Sender sees only the bills uploaded by their linked
recipients, and bills are owned by the recipient who created them.

## 1. New Tables
### profiles — mock identity per device
### connections — directed sender→recipient link (many-to-many)
### connection_otps — single-use expiring 6-digit codes

## 2. Modified Tables
### bills — added recipient_id (uuid, FK to profiles)

## 3. Security
- RLS on all new tables, open policies (anon+authenticated) matching the
  existing bills pattern (no-real-auth demo).
- generate_otp and verify_otp are SECURITY DEFINER with EXECUTE granted to
  anon+authenticated only.

## 4. Functions
### generate_otp(sender_id) → creates pending 6-digit OTP, returns code+expiry
### verify_otp(code, recipient_id) → atomically marks used + upserts connection
*/

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('recipient','sender')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ===== connections =====
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, recipient_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO service_role;

DROP POLICY IF EXISTS "anon_select_connections" ON connections;
CREATE POLICY "anon_select_connections" ON connections FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_connections" ON connections;
CREATE POLICY "anon_insert_connections" ON connections FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_connections" ON connections;
CREATE POLICY "anon_update_connections" ON connections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_connections" ON connections;
CREATE POLICY "anon_delete_connections" ON connections FOR DELETE
  TO anon, authenticated USING (true);

-- ===== connection_otps =====
CREATE TABLE IF NOT EXISTS connection_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

ALTER TABLE connection_otps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON connection_otps TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connection_otps TO service_role;

DROP POLICY IF EXISTS "anon_select_otps" ON connection_otps;
CREATE POLICY "anon_select_otps" ON connection_otps FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_otps" ON connection_otps;
CREATE POLICY "anon_insert_otps" ON connection_otps FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_otps" ON connection_otps;
CREATE POLICY "anon_update_otps" ON connection_otps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_otps" ON connection_otps;
CREATE POLICY "anon_delete_otps" ON connection_otps FOR DELETE
  TO anon, authenticated USING (true);

-- ===== bills: add recipient_id =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE bills ADD COLUMN recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== generate_otp =====
CREATE OR REPLACE FUNCTION generate_otp(p_sender_id uuid)
RETURNS TABLE (code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_expires timestamptz := now() + interval '10 minutes';
BEGIN
  LOOP
    v_code := lpad((floor(random() * 1000000))::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM connection_otps WHERE code = v_code AND status = 'pending');
  END LOOP;

  INSERT INTO connection_otps (code, sender_id, status, expires_at)
  VALUES (v_code, p_sender_id, 'pending', v_expires);

  RETURN QUERY SELECT v_code, v_expires;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_otp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_otp(uuid) TO anon, authenticated;

-- ===== verify_otp =====
CREATE OR REPLACE FUNCTION verify_otp(p_code text, p_recipient_id uuid)
RETURNS TABLE (
  out_connection_id uuid,
  out_sender_id uuid,
  out_sender_display text,
  out_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp connection_otps%ROWTYPE;
  v_sender profiles%ROWTYPE;
  v_conn_id uuid;
BEGIN
  SELECT * INTO v_otp
  FROM connection_otps
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid code. No matching OTP found.';
  END IF;

  IF v_otp.status = 'used' THEN
    RAISE EXCEPTION 'This code has already been used.';
  END IF;

  IF v_otp.expires_at < now() THEN
    UPDATE connection_otps SET status = 'expired' WHERE id = v_otp.id;
    RAISE EXCEPTION 'This code has expired. Please request a new one.';
  END IF;

  UPDATE connection_otps
  SET status = 'used', used_at = now(), recipient_id = p_recipient_id
  WHERE id = v_otp.id;

  SELECT * INTO v_sender FROM profiles WHERE id = v_otp.sender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender profile not found.';
  END IF;

  INSERT INTO connections (sender_id, recipient_id, status)
  VALUES (v_sender.id, p_recipient_id, 'active')
  ON CONFLICT (sender_id, recipient_id)
  DO UPDATE SET status = 'active'
  RETURNING id INTO v_conn_id;

  out_connection_id := v_conn_id;
  out_sender_id := v_sender.id;
  out_sender_display := v_sender.display_name;
  out_status := 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_otp(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION verify_otp(text, uuid) TO anon, authenticated;
