/*
# Add email to profiles

1. Modified Tables
- `profiles`: new optional column `email` (text). Used by family member profiles; overseas worker profiles leave it empty.

2. Constraints
- `email` must be empty or look like an address (something@something.something).

3. Security
- No change to row level security or grants. The existing policies already apply to the new column.
- Note: the app has no sign-in, so emails are readable by any client that holds the app's public key.

4. Notes
- Uses IF NOT EXISTS so the migration can be re-run safely.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text
  CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
