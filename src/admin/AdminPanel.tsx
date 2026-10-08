import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AccessRequest {
  id: string;
  full_name: string;
  business_name: string;
  trade: string;
  city: string;
  email: string;
  phone: string;
  referral_source: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  created_by: string;
  max_uses: number;
  use_count: number;
  expires_at: string;
  revoked: boolean;
  note: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  invite_id: string | null;
  created_at?: string;
}

type Tab = 'requests' | 'invites' | 'users';

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { session, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('requests');

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Admin access required</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-800">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-semibold transition-colors ${
        tab === t ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
              ← Dashboard
            </Link>
            <h1 className="text-base font-bold text-slate-900">Admin</h1>
          </div>
          <span className="text-xs text-slate-400">{session?.user.email}</span>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          {tabBtn('requests', 'Requests')}
          {tabBtn('invites', 'Invites')}
          {tabBtn('users', 'Users')}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'requests' && <RequestsTab />}
        {tab === 'invites' && <InvitesTab />}
        {tab === 'users' && <UsersTab />}
      </main>
    </div>
  );
}

// ── Requests Tab ──────────────────────────────────────────────────────────────
function RequestsTab() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'declined'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setRequests((data as AccessRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function approve(req: AccessRequest) {
    setActionLoading(req.id);
    setError('');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Please sign in again.');

      const tokenBytes = new Uint8Array(16);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const { error: inviteError } = await supabase.from('invites').insert({
        token,
        email: req.email.trim().toLowerCase(),
        created_by: session.user.id,
        max_uses: 1,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        note: `Approved: ${req.full_name}`,
      });
      if (inviteError) throw new Error('Could not approve request.');

      const { data: updatedRequest, error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        })
        .eq('id', req.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (updateError || !updatedRequest) throw new Error('Could not approve request.');

      const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'approval',
          to: req.email,
          inviteToken: token,
        }),
      });
      if (!emailResponse.ok) throw new Error('Request approved, but the email could not be sent.');

      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not approve request. Please try again.';
      setError(message);
    }
    setActionLoading(null);
  }

  async function decline(req: AccessRequest) {
    setActionLoading(req.id);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('decline_request', {
        p_request_id: req.id,
      });
      if (rpcError) throw rpcError;
      load();
    } catch {
      setError('Could not decline request. Please try again.');
    }
    setActionLoading(null);
  }

  const filterBtn = (f: 'pending' | 'approved' | 'declined', label: string) => (
    <button
      onClick={() => setFilter(f)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {filterBtn('pending', 'Pending')}
        {filterBtn('approved', 'Approved')}
        {filterBtn('declined', 'Declined')}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-400">No {filter} requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{req.full_name}</p>
                  <p className="text-sm text-slate-600">{req.business_name} · {req.trade}</p>
                  <p className="mt-1 text-xs text-slate-500">{req.city}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{req.email}</span>
                    <span>{req.phone}</span>
                  </div>
                  {req.referral_source && (
                    <p className="mt-1 text-xs text-slate-400">Heard about us via: {req.referral_source}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => approve(req)}
                      disabled={actionLoading === req.id}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {actionLoading === req.id ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => decline(req)}
                      disabled={actionLoading === req.id}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                )}
                {req.status === 'approved' && (
                  <span className="shrink-0 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">Approved</span>
                )}
                {req.status === 'declined' && (
                  <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500">Declined</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Invites Tab ───────────────────────────────────────────────────────────────
function InvitesTab() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', maxUses: '1', note: '' });
  const [createdToken, setCreatedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });
    setInvites((data as Invite[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createInvite() {
    setError('');
    const maxUses = parseInt(newInvite.maxUses, 10);
    if (isNaN(maxUses) || maxUses < 1 || maxUses > 100) {
      setError('Max uses must be 1–100.');
      return;
    }
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Please sign in again.');

      const tokenBytes = new Uint8Array(16);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const { error: insertError } = await supabase.from('invites').insert({
        token,
        email: newInvite.email.trim().toLowerCase() || null,
        created_by: session.user.id,
        max_uses: maxUses,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        note: newInvite.note.trim(),
      });
      if (insertError) throw insertError;

      setCreatedToken(token);
      setShowCreate(false);
      setNewInvite({ email: '', maxUses: '1', note: '' });
      await load();
    } catch {
      setError('Could not create invite. Please try again.');
    }
  }

  async function revoke(inv: Invite) {
    if (!window.confirm('Revoke this invite? It will stop working immediately.')) return;
    await supabase.from('invites').update({ revoked: true }).eq('id', inv.id);
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/join?invite=${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Invites</h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreatedToken(''); }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? 'Cancel' : 'Create invite link'}
        </button>
      </div>

      {createdToken && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">Invite link created</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-3 py-2 text-xs text-slate-700">
              {window.location.origin}/join?invite={createdToken}
            </code>
            <button
              onClick={() => copyLink(createdToken)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email (optional)</span>
              <input
                className={inputCls}
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite(s => ({ ...s, email: e.target.value }))}
                placeholder="Leave empty for open link"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Max uses</span>
              <input
                className={inputCls}
                type="number"
                min="1"
                max="100"
                value={newInvite.maxUses}
                onChange={(e) => setNewInvite(s => ({ ...s, maxUses: e.target.value }))}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</span>
            <input
              className={inputCls}
              value={newInvite.note}
              onChange={(e) => setNewInvite(s => ({ ...s, note: e.target.value }))}
              placeholder="e.g. met at chamber event"
            />
          </label>
          <button
            onClick={createInvite}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Create link
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-slate-400">No invites yet.</p>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {inv.email || 'Open link'}
                    </p>
                    {inv.revoked && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">REVOKED</span>
                    )}
                    {inv.use_count >= inv.max_uses && !inv.revoked && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">USED</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Uses: {inv.use_count} / {inv.max_uses}</span>
                    <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                    {inv.note && <span>Note: {inv.note}</span>}
                  </div>
                  <code className="mt-2 block truncate text-xs text-slate-400">
                    {window.location.origin}/join?invite={inv.token}
                  </code>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  {!inv.revoked && (
                    <button
                      onClick={() => revoke(inv)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Map<string, Invite>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: invData }] = await Promise.all([
        supabase.from('profiles').select('id, email, is_admin, invite_id'),
        supabase.from('invites').select('*'),
      ]);

      const invMap = new Map<string, Invite>();
      (invData as Invite[] | null)?.forEach((inv) => {
        invMap.set(inv.id, inv);
      });

      setUsers((profiles as Profile[]) ?? []);
      setInvites(invMap);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <h2 className="mb-4 text-base font-bold text-slate-900">Users</h2>
      {users.length === 0 ? (
        <p className="text-sm text-slate-400">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const inv = u.invite_id ? invites.get(u.invite_id) : null;
            const source = inv
              ? (inv.note ? `Invite: ${inv.note}` : 'Invite link')
              : 'Direct signup';
            return (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {u.email}
                    {u.is_admin && (
                      <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Source: {source}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
