/*
# Tighten profile email format check

1. Modified Tables
- `profiles.email`: the format check is replaced with a stricter one.

2. Rules enforced
- Local part: letters, digits, and . _ % + - characters.
- Domain: letters, digits, and hyphens, separated by dots.
- Top-level domain: at least two letters (for example .com or .ph).
- Total length of at most 254 characters.
- Empty (NULL) is still allowed for overseas worker profiles.

3. Security
- No change to row level security or grants.

4. Notes
- Drops the old check by name and adds the new one, so the migration can be re-run safely.
- No existing rows are affected because no emails have been stored yet.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_check
  CHECK (
    email IS NULL
    OR (
      char_length(email) <= 254
      AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$'
    )
  );
