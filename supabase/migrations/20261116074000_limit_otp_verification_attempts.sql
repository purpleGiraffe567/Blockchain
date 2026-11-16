CREATE TABLE otp_verification_rate_limits (
  recipient_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_timestamps timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[]
);

ALTER TABLE otp_verification_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON otp_verification_rate_limits FROM PUBLIC, anon, authenticated;

DROP FUNCTION verify_otp(text, uuid);

CREATE FUNCTION verify_otp(p_code text, p_recipient_id uuid)
RETURNS TABLE(
  out_connection_id uuid,
  out_sender_id uuid,
  out_sender_display text,
  out_status text,
  out_error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp connection_otps%ROWTYPE;
  v_sender profiles%ROWTYPE;
  v_conn_id uuid;
  v_now timestamptz := clock_timestamp();
  v_attempt_timestamps timestamptz[];
  v_recent_attempts timestamptz[];
BEGIN
  INSERT INTO otp_verification_rate_limits (recipient_id)
  VALUES (p_recipient_id)
  ON CONFLICT (recipient_id) DO NOTHING;

  SELECT attempt_timestamps INTO v_attempt_timestamps
  FROM otp_verification_rate_limits
  WHERE recipient_id = p_recipient_id
  FOR UPDATE;

  SELECT COALESCE(
    array_agg(attempt.attempted_at),
    ARRAY[]::timestamptz[]
  ) INTO v_recent_attempts
  FROM unnest(v_attempt_timestamps) AS attempt(attempted_at)
  WHERE attempt.attempted_at > v_now - interval '1 minute';

  IF cardinality(v_recent_attempts) >= 5 THEN
    UPDATE otp_verification_rate_limits
    SET attempt_timestamps = v_recent_attempts
    WHERE recipient_id = p_recipient_id;
    out_error := 'Too many attempts. Please wait one minute and try again.';
    RETURN NEXT;
    RETURN;
  END IF;

  v_recent_attempts := array_append(v_recent_attempts, v_now);
  UPDATE otp_verification_rate_limits
  SET attempt_timestamps = v_recent_attempts
  WHERE recipient_id = p_recipient_id;

  SELECT * INTO v_otp
  FROM connection_otps
  WHERE code = p_code AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    out_error := 'Invalid code. No matching OTP found.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_otp.expires_at <= v_now THEN
    UPDATE connection_otps SET status = 'expired' WHERE id = v_otp.id;
    out_error := 'This code has expired. Please request a new one.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_otp.sender_id = p_recipient_id THEN
    out_error := 'You cannot connect to your own account.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_sender FROM profiles WHERE id = v_otp.sender_id;
  IF NOT FOUND THEN
    out_error := 'Sender profile not found.';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE connection_otps
  SET status = 'used', used_at = v_now, recipient_id = p_recipient_id
  WHERE id = v_otp.id;

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

REVOKE EXECUTE ON FUNCTION verify_otp(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_otp(text, uuid) TO anon, authenticated;
