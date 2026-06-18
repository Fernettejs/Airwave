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
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState('missing');
        return;
      }
      setCard(data as Card);
      setState('ready');
      document.title = `${(data as Card).full_name} — ${(data as Card).company || 'Digital card'}`;
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
