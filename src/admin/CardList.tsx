import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Card } from '../lib/types';
import { templates } from '../lib/templates';
import { useAuth } from './AuthContext';
import QRModal from './QRModal';

const FREE_CARD_LIMIT = 5;

interface CardWithOwner extends Card {
  ownerEmail?: string;
}

export default function CardList() {
  const { session, isAdmin } = useAuth();
  const [cards, setCards] = useState<CardWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCard, setQrCard] = useState<Card | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false });
    const rawCards = (data as Card[]) ?? [];

    if (isAdmin && rawCards.length > 0) {
      const ownerIds = [...new Set(rawCards.map((c) => c.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', ownerIds);
      const emailMap = Object.fromEntries((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]));
      setCards(rawCards.map((c) => ({ ...c, ownerEmail: emailMap[c.owner_id] })));
    } else {
      setCards(rawCards);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!isAdmin && isAdmin !== false) return; // wait until isAdmin is resolved
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const ownCards = cards.filter((c) => c.owner_id === session?.user.id);
  const atLimit = !isAdmin && ownCards.length >= FREE_CARD_LIMIT;

  async function toggleActive(card: Card) {
    await supabase.from('cards').update({ is_active: !card.is_active }).eq('id', card.id).select('id');
    load();
  }

  async function duplicate(card: Card) {
    if (atLimit) return;
    const { id, owner_id, created_at, updated_at, ...rest } = card;
    let newSlug = `${card.slug}-copy`;
    const { data: clash } = await supabase.from('cards').select('id').eq('slug', newSlug).maybeSingle();
    if (clash) newSlug = `${card.slug}-${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from('cards')
      .insert({ ...rest, slug: newSlug, is_active: false })
      .select()
      .single();
    if (!error && data) navigate(`/dashboard/cards/${(data as Card).id}`);
    else load();
  }

  async function remove(card: Card) {
    if (!window.confirm(`Delete the card "${card.full_name || card.slug}"? This cannot be undone.`)) return;
    await supabase.from('cards').delete().eq('id', card.id);
    load();
  }

  function copyUrl(card: Card) {
    navigator.clipboard?.writeText(`${window.location.origin}/${card.slug}`);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(''), 1500);
  }

  function startTemplate(templateId: string) {
    navigate(`/dashboard/cards/new?template=${templateId}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-base font-bold text-slate-900">CardStand</Link>
            <p className="text-xs text-slate-400">
              {session?.user.email}
              {isAdmin && (
                <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">Admin</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {ownCards.length} of {FREE_CARD_LIMIT} cards
              </span>
            )}
            {isAdmin && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {cards.length} total card{cards.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => (atLimit ? null : setShowTemplates(true))}
              disabled={atLimit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              New card
            </button>
            <button onClick={signOut} className="text-sm text-slate-500 hover:text-slate-800">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {atLimit && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have reached the free limit of {FREE_CARD_LIMIT} cards. Delete one to make room.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-800">Make your first card.</p>
            <p className="mt-1 text-sm text-slate-500">Pick a starting point. You can change everything later.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <button key={t.id} onClick={() => startTemplate(t.id)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-400">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
                {card.profile_photo_url ? (
                  <img src={card.profile_photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500">
                    {(card.full_name || card.slug).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {card.full_name || '(no name)'}
                    {!card.is_active && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">inactive</span>
                    )}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-500">/{card.slug}</p>
                  {isAdmin && card.ownerEmail && (
                    <p className="truncate text-xs text-slate-400">{card.ownerEmail}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button onClick={() => copyUrl(card)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                    {copiedId === card.id ? 'Copied' : 'Copy URL'}
                  </button>
                  <button onClick={() => setQrCard(card)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">QR</button>
                  <a href={`/${card.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">View</a>
                  <Link to={`/dashboard/cards/${card.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Edit</Link>
                  <button onClick={() => duplicate(card)} disabled={atLimit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40">Duplicate</button>
                  <button onClick={() => toggleActive(card)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                    {card.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(card)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowTemplates(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold text-slate-900">Start a new card</p>
            <p className="mt-1 text-sm text-slate-500">Pick a starting point.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <button key={t.id} onClick={() => startTemplate(t.id)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-400">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {qrCard && <QRModal card={qrCard} onClose={() => setQrCard(null)} />}
    </div>
  );
}
