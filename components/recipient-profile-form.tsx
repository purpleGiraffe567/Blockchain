'use client';

import { useState } from 'react';
import { useRole } from '@/lib/role-context';
import { Loader2, User, Mail, AlertCircle, ArrowRight } from 'lucide-react';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function RecipientProfileForm() {
  const { createRecipientProfile } = useRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createRecipientProfile(trimmedName, trimmedEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your profile.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-black">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="editorial-label">Recipient View · Family Member</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Create Your Profile</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Tell your overseas family member who you are. Your name appears on
            your bills and your email lets them reach you.
          </p>
        </div>
        <div className="gold-bar h-px w-full" />
      </section>

      <div className="mx-auto max-w-xl px-6 py-12">
        <form onSubmit={submit} className="border border-black">
          <div className="flex items-center gap-3 border-b border-black bg-black px-5 py-4 text-white">
            <User className="h-5 w-5" />
            <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Your Details</h2>
          </div>

          <div className="space-y-5 p-5">
            <label className="block">
              <span className="editorial-label">Full Name</span>
              <span className="mt-1.5 block">
                <input
                  className="remita-input"
                  placeholder="e.g. Maria Santos"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </label>

            <label className="block">
              <span className="editorial-label">Email Address</span>
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  className="remita-input pl-9"
                  placeholder="you@example.com"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 border border-black bg-black/5 px-3 py-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Save and Continue
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
