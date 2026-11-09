'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, ConnectionWithProfile } from '@/lib/supabase';
import { useRole } from '@/lib/role-context';
import {
  Link2,
  Plus,
  Loader2,
  Check,
  X,
  Copy,
  KeyRound,
  Users,
  Trash2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export function ConnectionPanel() {
  const { role, profile, refreshProfile } = useRole();
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);

  // OTP generation (sender)
  const [generating, setGenerating] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // OTP verification (recipient)
  const [enteredCode, setEnteredCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!profile) {
      setLoadingConns(false);
      return;
    }
    setLoadingConns(true);
    setError(null);
    try {
      if (role === 'sender') {
        // Sender sees connected recipients
        const { data, error } = await supabase
          .from('connections')
          .select('*, recipient:profiles!connections_recipient_id_fkey(*)')
          .eq('sender_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (error) setError(error.message);
        else setConnections((data as ConnectionWithProfile[]) || []);
      } else if (role === 'recipient') {
        // Recipient sees connected senders
        const { data, error } = await supabase
          .from('connections')
          .select('*, sender:profiles!connections_sender_id_fkey(*)')
          .eq('recipient_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (error) setError(error.message);
        else setConnections((data as ConnectionWithProfile[]) || []);
      }
    } catch {
      // ignore
    }
    setLoadingConns(false);
  }, [profile, role]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const generateOtp = async () => {
    if (!profile) return;
    setGenerating(true);
    setError(null);
    setOtpCode(null);
    setOtpExpiry(null);
    try {
      const { data, error } = await supabase.rpc('generate_otp', {
        p_sender_id: profile.id,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setOtpCode(data[0].code);
        setOtpExpiry(data[0].expires_at);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate OTP');
    }
    setGenerating(false);
  };

  const verifyOtp = async () => {
    if (!profile || !enteredCode.trim()) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const { data, error } = await supabase.rpc('verify_otp', {
        p_code: enteredCode.trim(),
        p_recipient_id: profile.id,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setVerifyMsg({
          type: 'success',
          text: `Connected to ${data[0].out_sender_display}. You can now share bills with them.`,
        });
        setEnteredCode('');
        await loadConnections();
        await refreshProfile();
      }
    } catch (err) {
      setVerifyMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification failed',
      });
    }
    setVerifying(false);
  };

  const revokeConnection = async (connId: string) => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'revoked' })
      .eq('id', connId);
    if (error) setError(error.message);
    else setConnections((c) => c.filter((x) => x.id !== connId));
  };

  const copyCode = () => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) {
    return (
      <div className="border border-black p-6 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="border border-black">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-black bg-black px-5 py-4 text-white">
        <Users className="h-5 w-5" />
        <h2 className="text-lg font-bold uppercase tracking-[0.15em]">
          {role === 'sender' ? 'Connected Family' : 'Linked Senders'}
        </h2>
        <span className="ml-auto text-xs uppercase tracking-[0.18em] text-white/50">
          {connections.length} active
        </span>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 flex items-start gap-2 border border-black bg-black/5 px-3 py-2 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing connections list */}
        {loadingConns ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading connections…
          </div>
        ) : connections.length > 0 ? (
          <ul className="mb-5 divide-y divide-black/20 border border-black/20">
            {connections.map((conn) => {
              const other = role === 'sender' ? conn.recipient : conn.sender;
              return (
                <li
                  key={conn.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center border border-black bg-white text-xs font-bold">
                      {(other?.display_name || '?').charAt(0)}
                    </span>
                    <div>
                      <p className="font-bold">{other?.display_name || 'Unknown'}</p>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        {role === 'sender' ? 'Family Member' : 'Overseas Worker'} · {conn.status}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeConnection(conn.id)}
                    className="border border-black p-1.5 text-muted-foreground transition-colors hover:bg-black hover:text-white"
                    aria-label="Remove connection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mb-5 border border-dashed border-black/40 p-5 text-center">
            <Link2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {role === 'sender'
                ? 'No family members connected yet. Generate a code below.'
                : 'No senders linked yet. Enter a code from your family member below.'}
            </p>
          </div>
        )}

        {/* OTP actions */}
        {role === 'sender' ? (
          <div className="space-y-4">
            <div className="rule-thin pt-4">
              <p className="editorial-label mb-2">Connect a Family Member</p>
              <p className="text-sm text-muted-foreground">
                Generate a one-time code and share it with your family member.
                They enter it on their device to link their bills to you.
              </p>
            </div>

            {otpCode ? (
              <div className="border border-black bg-black p-5 text-center text-white">
                <p className="editorial-label text-white/50">Your one-time code</p>
                <p className="my-3 text-4xl font-bold tracking-[0.3em] tnum">
                  {otpCode}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-2 border border-white/30 px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition-colors hover:bg-white hover:text-black"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Clock className="h-3.5 w-3.5" />
                    Expires in 10 min
                  </span>
                </div>
              </div>
            ) : null}

            <button
              onClick={generateOtp}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-sm uppercase tracking-[0.18em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : otpCode ? (
                <Plus className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {otpCode ? 'Generate New Code' : 'Generate Connection Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rule-thin pt-4">
              <p className="editorial-label mb-2">Link a Sender's Account</p>
              <p className="text-sm text-muted-foreground">
                Enter the one-time code your family member shared with you to
                link your bills to their account.
              </p>
            </div>

            {verifyMsg && (
              <div
                className={`flex items-start gap-2 border px-3 py-2 text-sm ${
                  verifyMsg.type === 'success'
                    ? 'border-black bg-black/5'
                    : 'border-black bg-black/5'
                }`}
              >
                {verifyMsg.type === 'success' ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{verifyMsg.text}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="remita-input flex-1 text-center text-2xl tracking-[0.3em] tnum"
                placeholder="000000"
                maxLength={6}
                value={enteredCode}
                onChange={(e) =>
                  setEnteredCode(e.target.value.replace(/[^0-9]/g, ''))
                }
              />
              <button
                onClick={verifyOtp}
                disabled={verifying || enteredCode.length !== 6}
                className="flex items-center gap-2 border border-black bg-black px-5 py-3 text-sm uppercase tracking-[0.18em] text-white transition-colors hover:bg-[hsl(45_70%_44%)] disabled:opacity-40"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
