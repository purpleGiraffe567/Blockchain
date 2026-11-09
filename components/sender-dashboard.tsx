'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Bill, ConnectionWithProfile } from '@/lib/supabase';
import { useRole } from '@/lib/role-context';
import { ConnectionPanel } from '@/components/connection-panel';
import {
  Loader2,
  Check,
  Clock,
  RefreshCw,
  Zap,
  Link2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Users,
} from 'lucide-react';

const FX_RATES: Record<string, number> = {
  PHP: 56.0,
  MXN: 17.5,
  INR: 83.0,
  VND: 24500.0,
  NGN: 1500.0,
  KES: 129.0,
  USD: 1.0,
};

type PayState = {
  status: 'idle' | 'paying' | 'success' | 'error';
  billId: string | null;
  result?: {
    txHash: string | null;
    senderPublicKey: string;
    sendMax: string;
    destAmount: string;
    destAssetCode: string;
    pathLength: number;
    direct: boolean;
    message: string;
  };
  error?: string;
};

export function SenderDashboard() {
  const { profile } = useRole();
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>({ status: 'idle', billId: null });

  const loadData = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Load active connections (sender → recipients)
      const { data: conns, error: connErr } = await supabase
        .from('connections')
        .select('*, recipient:profiles!connections_recipient_id_fkey(*)')
        .eq('sender_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (connErr) {
        setError(connErr.message);
        setLoading(false);
        return;
      }
      const activeConns = (conns as ConnectionWithProfile[]) || [];
      setConnections(activeConns);

      const recipientIds = activeConns.map((c) => c.recipient_id);
      if (recipientIds.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }

      // Load bills from all connected recipients
      const { data: billData, error: billErr } = await supabase
        .from('bills')
        .select('*')
        .in('recipient_id', recipientIds)
        .order('created_at', { ascending: false });
      if (billErr) setError(billErr.message);
      else setBills((billData as Bill[]) || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const payBill = async (bill: Bill) => {
    setPayState({ status: 'paying', billId: bill.id });
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          amountLocal: Number(bill.amount_due),
          currency: bill.currency,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Payment failed on the server.');
      }

      const usdcAmount =
        Number(bill.amount_due) / (FX_RATES[bill.currency] ?? 56.0);
      const { error: updErr } = await supabase
        .from('bills')
        .update({
          status: 'paid',
          stellar_tx_hash: json.txHash,
          paid_amount_usdc: usdcAmount.toFixed(2),
          paid_at: new Date().toISOString(),
        })
        .eq('id', bill.id);

      if (updErr) {
        setPayState({ status: 'success', billId: bill.id, result: json });
        setError(`Paid on Stellar, but couldn't update bill status: ${updErr.message}`);
      } else {
        setPayState({ status: 'success', billId: bill.id, result: json });
        await loadData();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPayState({ status: 'error', billId: bill.id, error: message });
    }
  };

  const pending = bills.filter((b) => b.status === 'pending');
  const paid = bills.filter((b) => b.status === 'paid');
  const totalDueUsd = pending.reduce(
    (s, b) => s + Number(b.amount_due) / (FX_RATES[b.currency] ?? 56.0),
    0
  );

  // Group bills by recipient
  const billsByRecipient = connections.map((conn) => ({
    connection: conn,
    recipientName: conn.recipient?.display_name || 'Unknown',
    bills: bills.filter((b) => b.recipient_id === conn.recipient_id),
  }));

  return (
    <main className="min-h-screen bg-white">
      {/* Masthead */}
      <section className="border-b border-black">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="editorial-label">Sender View · Overseas Worker</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Linked Family Bills
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Pay any bill your family uploads with USDC — a Stellar path payment
            delivers local currency to the payout anchor and settles in seconds.
          </p>
        </div>
        <div className="gold-bar h-px w-full" />
      </section>

      {/* Editorial stat sections divided by crisp lines */}
      <section className="border-b border-black">
        <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-3">
          <StatBlock
            label="Bills Awaiting Payment"
            value={pending.length.toString()}
            sub={`${pending.length} pending`}
            borderRight
          />
          <StatBlock
            label="Total Due in USDC"
            value={`$${totalDueUsd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            sub="At current FX rates"
            borderRight
          />
          <StatBlock
            label="Family Connected"
            value={connections.length.toString()}
            sub="Active links"
          />
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-b border-black bg-black text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px md:grid-cols-3">
          <Step
            n="01"
            title="You pay in USDC"
            body="Your USDC stays on Stellar. One signed transaction, one network fee."
          />
          <Step
            n="02"
            title="Path payment routes it"
            body="A PathPaymentStrictReceive finds the cheapest USDC → local path through the DEX."
          />
          <Step
            n="03"
            title="Anchor pays out locally"
            body="The payout anchor delivers local currency to the biller — the bill is settled."
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Left: connections */}
          <div className="lg:col-span-2">
            <ConnectionPanel />
          </div>

          {/* Right: bills */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bills to Cover</h2>
              <button
                onClick={loadData}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-black"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 border border-black bg-black/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!profile ? (
              <div className="flex items-center gap-3 border border-black p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up your profile…
              </div>
            ) : loading ? (
              <div className="flex items-center gap-3 border border-black p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading linked bills…
              </div>
            ) : connections.length === 0 ? (
              <div className="border border-black p-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-lg">No family connected yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate a connection code on the left and share it with your
                  family member to see their bills here.
                </p>
              </div>
            ) : bills.length === 0 ? (
              <div className="border border-black p-12 text-center">
                <Link2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-lg">No bills from your family yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once your family uploads bills, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {billsByRecipient.map((group) =>
                  group.bills.length === 0 ? null : (
                    <div key={group.connection.id}>
                      <div className="mb-3 flex items-center gap-3 border-b border-black/20 pb-2">
                        <span className="editorial-label">
                          {group.recipientName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.bills.length} bill
                          {group.bills.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-px border-y border-black bg-black">
                        {group.bills.map((bill) => (
                          <SenderBillRow
                            key={bill.id}
                            bill={bill}
                            usdcEquivalent={
                              Number(bill.amount_due) /
                              (FX_RATES[bill.currency] ?? 56.0)
                            }
                            payState={payState}
                            onPay={() => payBill(bill)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mx-auto max-w-6xl px-6 py-12 text-center">
        <div className="gold-bar mx-auto mb-4 h-px w-16" />
        <p className="editorial-label">
          Stellar Testnet · PathPaymentStrictReceive · Settled in seconds
        </p>
      </footer>
    </main>
  );
}

function StatBlock({
  label,
  value,
  sub,
  borderRight,
}: {
  label: string;
  value: string;
  sub: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className={`px-8 py-8 ${borderRight ? 'border-b border-black/30 md:border-b-0 md:border-r' : ''}`}
    >
      <p className="editorial-label">{label}</p>
      <p className="mt-3 text-4xl font-bold tnum">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-b border-white/20 px-8 py-8 last:border-b-0 md:border-b-0 md:border-r md:border-white/20">
      <div className="flex items-baseline gap-4">
        <span className="gold-text text-2xl font-bold tnum">{n}</span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{body}</p>
    </div>
  );
}

function SenderBillRow({
  bill,
  usdcEquivalent,
  payState,
  onPay,
}: {
  bill: Bill;
  usdcEquivalent: number;
  payState: PayState;
  onPay: () => void;
}) {
  const isPaid = bill.status === 'paid';
  const isPaying = payState.status === 'paying' && payState.billId === bill.id;
  const justPaid = payState.status === 'success' && payState.billId === bill.id;
  const payError =
    payState.status === 'error' && payState.billId === bill.id
      ? payState.error
      : null;

  return (
    <div className="bg-white p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold">{bill.biller_name}</span>
            <StatusBadge status={bill.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acct {bill.account_number} · for {bill.recipient_name}
            {bill.due_date && (
              <>
                {' · '}due {new Date(bill.due_date).toLocaleDateString()}
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="editorial-label">Amount Due</span>
              <p className="text-2xl font-bold tnum">
                {Number(bill.amount_due).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {bill.currency}
              </p>
            </div>
            <div>
              <span className="editorial-label">USDC Equivalent</span>
              <p className="gold-text text-2xl font-bold tnum">
                {usdcEquivalent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USDC
              </p>
            </div>
            <div>
              <span className="editorial-label">Payout Anchor</span>
              <p className="text-sm font-semibold">{bill.payout_anchor}</p>
            </div>
          </div>

          {isPaid && bill.stellar_tx_hash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${bill.stellar_tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 gold-text text-xs uppercase tracking-[0.18em] underline underline-offset-4"
            >
              <ExternalLink className="h-3 w-3" />
              Settled on-chain · {bill.stellar_tx_hash.slice(0, 12)}…
            </a>
          )}

          {justPaid && payState.result?.txHash && (
            <div className="mt-3 border border-black bg-black p-4 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(45_70%_44%)]" />
                <span className="text-sm uppercase tracking-[0.18em]">
                  Payment Settled
                </span>
              </div>
              <p className="mt-2 text-sm text-white/80">
                {payState.result.message}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/70 sm:grid-cols-4">
                <Detail
                  label="Sender"
                  value={`${payState.result.senderPublicKey.slice(0, 8)}…${payState.result.senderPublicKey.slice(-6)}`}
                />
                <Detail label="Sent (max)" value={`${payState.result.sendMax} USDC`} />
                <Detail
                  label="Delivered"
                  value={`${payState.result.destAmount} ${payState.result.destAssetCode}`}
                />
                <Detail
                  label="Path"
                  value={payState.result.direct ? 'Direct' : `${payState.result.pathLength}-hop`}
                />
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${payState.result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[hsl(45_70%_44%)] text-xs uppercase tracking-[0.18em] underline underline-offset-4"
              >
                <ExternalLink className="h-3 w-3" />
                View transaction
              </a>
            </div>
          )}

          {payError && (
            <div className="mt-3 flex items-start gap-2 border border-black bg-black/5 px-3 py-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isPaid ? (
            <span className="flex items-center gap-2 border border-black bg-white px-5 py-3 text-sm uppercase tracking-[0.18em] text-black">
              <Check className="h-4 w-4" />
              Paid
            </span>
          ) : (
            <button
              onClick={onPay}
              disabled={isPaying}
              className="group flex items-center gap-2 border border-black bg-black px-5 py-3 text-sm uppercase tracking-[0.18em] text-white transition-colors hover:bg-[hsl(45_70%_44%)] disabled:opacity-60"
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Paying…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Pay via Stellar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="uppercase tracking-[0.15em] text-white/50">{label}</span>
      <p className="mt-0.5 font-mono text-white/90 tnum">{value}</p>
    </div>
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
