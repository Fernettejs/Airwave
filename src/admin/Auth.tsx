import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function submit() {
    setBusy(true);
    setError('');
    setNotice('');
    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.');
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (!data.session) {
        // email confirmation is on; user must confirm before first login
        setNotice('Check your email to confirm your account, then sign in.');
      }
      // if a session is returned, AuthContext flips and we redirect automatically
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">
          ← CardStand
        </Link>
        <h1 className="mt-3 text-lg font-bold text-slate-900">
          {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'signup'
            ? 'Make digital cards in minutes. No card required.'
            : 'Sign in to manage your cards.'}
        </p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {notice && <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">{notice}</p>}
          <button
            onClick={submit}
            disabled={busy || !email || !password}
            className="h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-slate-900">Sign in</Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link to="/signup" className="font-semibold text-slate-900">Create a free account</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
