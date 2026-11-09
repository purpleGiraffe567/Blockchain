/*
# Fix ambiguous column reference in generate_otp

The `code` identifier in the LOOP exit condition was ambiguous with the
function's RETURNS TABLE output column. Drop and recreate with qualified
column references and renamed output parameters to avoid the clash.
*/

DROP FUNCTION IF EXISTS generate_otp(uuid);

CREATE FUNCTION generate_otp(p_sender_id uuid)
RETURNS TABLE (otp_code text, otp_expires_at timestamptz)
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
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM connection_otps
      WHERE connection_otps.code = v_code AND connection_otps.status = 'pending'
    );
  END LOOP;

  INSERT INTO connection_otps (code, sender_id, status, expires_at)
  VALUES (v_code, p_sender_id, 'pending', v_expires);

  otp_code := v_code;
  otp_expires_at := v_expires;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_otp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_otp(uuid) TO anon, authenticated;
