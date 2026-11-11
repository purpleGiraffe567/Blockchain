'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the server.'
  );
}

// The server build pass runs without the browser config; the client check below fails loudly instead.
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'unconfigured',
  {
    auth: {
      persistSession: false,
    },
  }
);

export type Profile = {
  id: string;
  device_id: string;
  display_name: string;
  email: string | null;
  role: 'recipient' | 'sender';
  created_at: string;
};

export type Connection = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'active' | 'revoked';
  created_at: string;
};

export type ConnectionWithProfile = Connection & {
  recipient?: Profile;
  sender?: Profile;
};

export type Bill = {
  id: string;
  biller_name: string;
  account_number: string;
  amount_due: number;
  currency: string;
  category: string;
  recipient_name: string;
  due_date: string | null;
  status: 'pending' | 'paid';
  stellar_tx_hash: string | null;
  paid_amount_usdc: number | null;
  payout_anchor: string;
  paid_at: string | null;
  created_at: string;
  recipient_id: string | null;
};

export type BillStatus = Bill['status'];
