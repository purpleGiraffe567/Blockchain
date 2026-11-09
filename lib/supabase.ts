'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Profile = {
  id: string;
  device_id: string;
  display_name: string;
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
