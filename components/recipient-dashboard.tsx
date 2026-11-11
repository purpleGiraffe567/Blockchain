'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Bill } from '@/lib/supabase';
import { useRole } from '@/lib/role-context';
import { ConnectionPanel } from '@/components/connection-panel';
import { RecipientProfileForm } from '@/components/recipient-profile-form';
import {
  PlusCircle,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
  Clock,
  Upload,
  FileText,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'utility', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'internet', label: 'Internet' },
  { value: 'telecom', label: 'Mobile / Telecom' },
  { value: 'rent', label: 'Rent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['PHP', 'MXN', 'INR', 'VND', 'NGN', 'KES', 'USD'];

export function RecipientDashboard() {
  const { profile, profileError, profileChecked } = useRole();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [billerName, setBillerName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [category, setCategory] = useState('utility');
  const [recipientName, setRecipientName] = useState('Santos Family');
  const [dueDate, setDueDate] = useState('');

  const loadBills = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setBills((data as Bill[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError('Your profile is not ready yet. Please wait a moment and try again.');
      return;
    }
    const amt = parseFloat(amount);
    if (!billerName || !accountNumber || !Number.isFinite(amt) || amt <= 0) {
      setError('Biller name, account number, and a positive amount are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('bills').insert({
      biller_name: billerName,
      account_number: accountNumber,
      amount_due: amt,
      currency,
      category,
      recipient_name: recipientName,
      due_date: dueDate || null,
      recipient_id: profile.id,
    });
    if (error) {
      setError(error.message);
    } else {
      setBillerName('');
      setAccountNumber('');
      setAmount('');
      setDueDate('');
      await loadBills();
    }
    setSubmitting(false);
  };

  const removeBill = async (id: string) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) setError(error.message);
    else setBills((b) => b.filter((x) => x.id !== id));
  };

  if (!profile && profileChecked) {
    return <RecipientProfileForm />;
  }

  const pending = bills.filter((b) => b.status === 'pending');
  const paid = bills.filter((b) => b.status === 'paid');
  const totalDue = pending.reduce((s, b) => s + Number(b.amount_due), 0);

  return (
    <main className="min-h-screen bg-white">
      {/* Masthead */}
      <section className="border-b border-black">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="editorial-label">Recipient View · Family Member</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Household Bills
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Upload the bills your overseas family member should cover. Link
            their account with a one-time code so they can see and pay your
            bills directly.
          </p>
        </div>
        <div className="gold-bar h-px w-full" />
      </section>

      {/* Stat strip */}
      <section className="border-b border-black">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Total Bills', value: bills.length },
            { label: 'Pending', value: pending.length },
            { label: 'Paid', value: paid.length },
            {
              label: 'Outstanding',
              value: `${totalDue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pending[0]?.currency || 'PHP'}`,
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-6 ${
                i < 3 ? 'border-b border-black/30 md:border-b-0' : ''
              } ${i % 4 !== 3 ? 'md:border-r md:border-black/30' : ''} ${
                i < 2 ? 'border-r border-black/30 md:border-r' : ''
              } ${i === 2 ? 'border-r border-black/30 md:border-r' : ''}`}
            >
              <p className="editorial-label">{s.label}</p>
              <p className="mt-2 text-3xl font-bold tnum">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Left column: upload + connection */}
          <div className="space-y-8 lg:col-span-2">
            <div className="border border-black">
              <div className="flex items-center gap-3 border-b border-black bg-black px-5 py-4 text-white">
                <Upload className="h-5 w-5" />
                <h2 className="text-lg font-bold uppercase tracking-[0.15em]">
                  Upload a Bill
                </h2>
              </div>
              <form onSubmit={submit} className="space-y-5 p-5">
                <Field label="Biller Name">
                  <input
                    className="remita-input"
                    placeholder="e.g. Manila Electric Company"
                    value={billerName}
                    onChange={(e) => setBillerName(e.target.value)}
                  />
                </Field>
                <Field label="Account Number">
                  <input
                    className="remita-input"
                    placeholder="e.g. MEC-2094-55821"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Amount Due">
                    <input
                      className="remita-input tnum"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Currency">
                    <select
                      className="remita-input"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Category">
                  <select
                    className="remita-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Recipient / Family Name">
                  <input
                    className="remita-input"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <Field label="Due Date (optional)">
                  <input
                    className="remita-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>

                {error && (
                  <p className="border border-black bg-black/5 px-3 py-2 text-sm text-black">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !profile}
                  className="flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  Add Bill
                </button>
              </form>
            </div>

            <ConnectionPanel />
          </div>

          {/* Bill list */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Tracked Bills</h2>
              <button
                onClick={loadBills}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-black"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {profileError && !profile ? (
              <div className="border border-black p-8">
                <p className="font-bold">Your profile could not be set up.</p>
                <p className="mt-2 text-sm text-muted-foreground">{profileError}</p>
              </div>
            ) : !profile ? (
              <div className="flex items-center gap-3 border border-black p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up your profile…
              </div>
            ) : loading ? (
              <div className="flex items-center gap-3 border border-black p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading bills…
              </div>
            ) : bills.length === 0 ? (
              <div className="border border-black p-10 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No bills yet. Upload your first bill on the left.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-black border border-black">
                {bills.map((bill) => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onDelete={() => removeBill(bill.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="editorial-label">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function BillRow({ bill, onDelete }: { bill: Bill; onDelete: () => void }) {
  const isPaid = bill.status === 'paid';
  return (
    <li className="group flex items-start justify-between gap-4 p-5 transition-colors hover:bg-black/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-bold">{bill.biller_name}</span>
          <StatusBadge status={bill.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Acct {bill.account_number} · {labelFor(bill.category)} ·{' '}
          {bill.recipient_name}
        </p>
        <p className="mt-2 text-2xl font-bold tnum">
          {Number(bill.amount_due).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-base font-normal text-muted-foreground">
            {bill.currency}
          </span>
        </p>
        {bill.due_date && (
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Due {new Date(bill.due_date).toLocaleDateString()}
          </p>
        )}
        {isPaid && bill.stellar_tx_hash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${bill.stellar_tx_hash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block gold-text text-xs uppercase tracking-[0.18em] underline underline-offset-4"
          >
            Settled on-chain · {bill.stellar_tx_hash.slice(0, 10)}…
          </a>
        )}
      </div>
      <button
        onClick={onDelete}
        disabled={isPaid}
        className="border border-black p-2 text-muted-foreground transition-colors hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-muted-foreground"
        aria-label="Delete bill"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function StatusBadge({ status }: { status: Bill['status'] }) {
  if (status === 'paid') {
    return (
      <span className="flex items-center gap-1 border border-black bg-black px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">
        <Check className="h-3 w-3" /> Paid
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 border border-black bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-black">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function labelFor(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label || cat;
}
