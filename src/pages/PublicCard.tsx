import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Card } from '../lib/types';
import CardView from '../components/CardView';
import NotFound from './NotFound';

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<Card | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.rpc('get_public_card', { p_slug: slug });
      const publicCard = (data as Card[] | null)?.[0];
      if (cancelled) return;
      if (error || !publicCard) {
        setState('missing');
        return;
      }
      setCard(publicCard);
      setState('ready');
      document.title = `${publicCard.full_name} — ${publicCard.company || 'Digital card'}`;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (state === 'missing' || !card) return <NotFound />;
  return <CardView card={card} />;
}
