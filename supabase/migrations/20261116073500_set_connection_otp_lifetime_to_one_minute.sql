CREATE OR REPLACE FUNCTION generate_otp(p_sender_id uuid)
RETURNS TABLE(otp_code text, otp_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_expires timestamptz := now() + interval '1 minute';
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
