import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface InviteInfo {
  id: string;
  email: string | null;
  max_uses: number;
  use_count: number;
}

export default function Join() {
  const [params] = useSearchParams();
  const token = params.get('invite') ?? '';
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [state, setState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    supabase
      .rpc('validate_invite', { p_token: token })
      .then(({ data, error }) => {
        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          setState('invalid');
        } else {
          const inv = Array.isArray(data) ? data[0] : data;
          setInvite(inv as InviteInfo);
          if ((inv as InviteInfo).email) setEmail((inv as InviteInfo).email as string);
          setState('valid');
        }
      });
  }, [token]);

  async function submit() {
    if (!token || !email.trim() || password.length < 8) return;
    setBusy(true);
    setError('');

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            token,
            email: email.trim(),
            password,
            fullName: fullName.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not create your account.');
        setBusy(false);
        return;
      }

      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setBusy(false);
  }

  // ── Styles matching the existing auth page ──
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-400">Checking invite…</p>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">This invite is no longer valid</h1>
          <p className="mt-2 text-sm text-slate-500">
            The link may have expired, been revoked, or reached its usage limit.
          </p>
          <Link
            to="/#request-access"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Request access
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Account created</h1>
          <p className="mt-2 text-sm text-slate-500">
            You can now sign in with your email and password.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const emailLocked = !!invite?.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">
          ← AirWave.cards
        </Link>
        <h1 className="mt-3 text-lg font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          You have been invited to join AirWave.
        </p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
            <input
              className={input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              className={`${input} ${emailLocked ? 'bg-slate-100 text-slate-500' : ''}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailLocked}
              autoComplete="username"
            />
            {emailLocked && (
              <span className="mt-1 block text-xs text-slate-400">
                This invite is tied to your email address.
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <span className="mt-1 block text-xs text-slate-400">At least 8 characters.</span>
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !email.trim() || password.length < 8}
            className="h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
