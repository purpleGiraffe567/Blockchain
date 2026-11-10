/*
# Secure sender-to-family connection via OTP

1. Summary
- Fixes the OTP functions so they return the generated code and the linked sender.
- Stops browsers from reading OTP codes or writing connections directly, so the only way to link accounts is entering a valid code.

2. Modified objects
- `generate_otp(p_sender_id)`: now returns the code and expiry. Uses a cryptographically random code. Expires any earlier unused codes for the same sender.
- `verify_otp(p_code, p_recipient_id)`: now returns the linked sender. Rejects a profile linking to itself.
- `disconnect_connection(p_connection_id, p_profile_id)`: new. Lets either side of a connection revoke it.

3. Security changes
- `connection_otps`: anonymous and signed-in browsers lose all direct access. Codes are only handled inside the database functions.
- `connections`: browsers keep read access only. Insert, update and delete are removed from the browser; the functions perform those writes.

4. Notes
- Functions run as their owner (SECURITY DEFINER) with a fixed search path.
- Execute permission on the functions is granted to anonymous and signed-in browsers, since the app has no sign-in screen.
*/

DROP POLICY IF EXISTS "anon_select_otps" ON connection_otps;
DROP POLICY IF EXISTS "anon_insert_otps" ON connection_otps;
DROP POLICY IF EXISTS "anon_update_otps" ON connection_otps;
DROP POLICY IF EXISTS "anon_delete_otps" ON connection_otps;
REVOKE ALL ON connection_otps FROM anon, authenticated;

DROP POLICY IF EXISTS "anon_insert_connections" ON connections;
DROP POLICY IF EXISTS "anon_update_connections" ON connections;
DROP POLICY IF EXISTS "anon_delete_connections" ON connections;
REVOKE INSERT, UPDATE, DELETE ON connections FROM anon, authenticated;

CREATE OR REPLACE FUNCTION generate_otp(p_sender_id uuid)
RETURNS TABLE(otp_code text, otp_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_expires timestamptz := now() + interval '10 minutes';
BEGIN
  UPDATE connection_otps
  SET status = 'expired'
  WHERE sender_id = p_sender_id AND status = 'pending';

  LOOP
    v_code := lpad(
      ((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28)::int) % 1000000)::text,
      6, '0'
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM connection_otps c
      WHERE c.code = v_code AND c.status = 'pending'
    );
  END LOOP;

  INSERT INTO connection_otps (code, sender_id, status, expires_at)
  VALUES (v_code, p_sender_id, 'pending', v_expires);

  otp_code := v_code;
  otp_expires_at := v_expires;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION verify_otp(p_code text, p_recipient_id uuid)
RETURNS TABLE(out_connection_id uuid, out_sender_id uuid, out_sender_display text, out_status text)
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
  WHERE code = p_code AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid code. No matching OTP found.';
  END IF;

  IF v_otp.expires_at < now() THEN
    UPDATE connection_otps SET status = 'expired' WHERE id = v_otp.id;
    RAISE EXCEPTION 'This code has expired. Please request a new one.';
  END IF;

  IF v_otp.sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'You cannot connect to your own account.';
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
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION disconnect_connection(p_connection_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE connections
  SET status = 'revoked'
  WHERE id = p_connection_id
    AND (sender_id = p_profile_id OR recipient_id = p_profile_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_otp(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION verify_otp(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION disconnect_connection(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_otp(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_otp(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION disconnect_connection(uuid, uuid) TO anon, authenticated;
