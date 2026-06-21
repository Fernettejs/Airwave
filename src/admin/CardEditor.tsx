import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { emptyCard, slugify, isReservedSlug } from '../lib/types';
import type { Card, CardDraft } from '../lib/types';
import { templates } from '../lib/templates';
import CardView from '../components/CardView';
import QRModal from './QRModal';
import { ColorField, Field, ImageField, Repeater, Section, inputCls } from './fields';
import { useAuth } from './AuthContext';

const AUTOSAVE_DELAY = 2000;

export default function CardEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [draft, setDraft] = useState<CardDraft>(() => {
    if (isNew) {
      const t = templates.find((x) => x.id === params.get('template'));
      return t ? t.build() : { ...emptyCard };
    }
    return { ...emptyCard };
  });
  const [cardId, setCardId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Ref to always have the latest cardId in autosave without re-registering the effect
  const cardIdRef = useRef<string | null>(null);
  cardIdRef.current = cardId;
  const draftRef = useRef<CardDraft>(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Card not found.');
        } else {
          const { id: cid, created_at, updated_at, ...rest } = data as Card;
          setDraft(rest as CardDraft);
          setCardId(cid);
          setSlugTouched(true);
        }
        setLoading(false);
      });
  }, [id, isNew]);

  function set<K extends keyof CardDraft>(key: K, value: CardDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === 'full_name' && !slugTouched) next.slug = slugify(value as string);
      return next;
    });
    setSaveMsg('');
    setDirty(true);
  }

  const previewCard: Card = useMemo(
    () => ({
      ...draft,
      id: cardId ?? 'preview',
      owner_id: userId,
      created_at: '',
      updated_at: '',
    }),
    [draft, cardId, userId]
  );

  // Core save logic — returns true on success, false on failure
  const performSave = useCallback(async (draftToSave: CardDraft, cid: string | null): Promise<boolean> => {
    const slug = slugify(draftToSave.slug);
    if (!slug || isReservedSlug(slug) || !draftToSave.full_name.trim()) return false;

    // Skip uniqueness check on autosave when slug hasn't changed
    if (cid) {
      const { error } = await supabase.from('cards').update({ ...draftToSave, slug }).eq('id', cid);
      if (error) return false;
      return true;
    } else {
      // Check uniqueness before first insert
      const { data: clash } = await supabase.from('cards').select('id').eq('slug', slug).maybeSingle();
      if (clash) return false;
      const { data, error } = await supabase.from('cards').insert({ ...draftToSave, slug }).select().single();
      if (error || !data) return false;
      setCardId((data as Card).id);
      navigate(`/dashboard/cards/${(data as Card).id}`, { replace: true });
      return true;
    }
  }, [navigate]);

  // Manual save — shows errors to user
  async function save() {
    setError('');
    setSaveMsg('');
    const slug = slugify(draft.slug);
    if (!slug) { setError('Slug is required.'); return; }
    if (isReservedSlug(slug)) { setError(`"/${slug}" is a reserved word. Choose a different slug.`); return; }
    if (!draft.full_name.trim()) { setError('Name is required.'); return; }
    setSaving(true);

    // Uniqueness check on manual save
    let q = supabase.from('cards').select('id').eq('slug', slug);
    if (cardId) q = q.neq('id', cardId);
    const { data: clash } = await q.maybeSingle();
    if (clash) {
      setError(`The slug "/${slug}" is already in use.`);
      setSaving(false);
      return;
    }

    const payload = { ...draft, slug };
    if (cardId) {
      const { error } = await supabase.from('cards').update(payload).eq('id', cardId);
      if (error) {
        if (error.code === '23505') setError(`The slug "/${slug}" is already taken. Try another.`);
        else setError(error.message);
      } else {
        setSaveMsg('Saved');
        setDirty(false);
        setDraft((d) => ({ ...d, slug }));
      }
    } else {
      const { data, error } = await supabase.from('cards').insert(payload).select().single();
      if (error) {
        if (error.message.includes('CARD_LIMIT_REACHED'))
          setError('You have reached your free card limit. Delete a card to make room.');
        else if (error.code === '23505')
          setError(`The slug "/${slug}" is already taken. Try another.`);
        else setError(error.message);
      } else if (data) {
        setCardId((data as Card).id);
        setSaveMsg('Saved');
        setDirty(false);
        setDraft((d) => ({ ...d, slug }));
        navigate(`/dashboard/cards/${(data as Card).id}`, { replace: true });
      }
    }
    setSaving(false);
  }

  // Autosave: fire 2s after the last change, only for existing cards
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Only autosave cards that have already been saved once (have a cardId)
    if (!dirty || !cardId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      const ok = await performSave(draftRef.current, cardIdRef.current);
      if (ok) {
        setSaveMsg('Saved');
        setDirty(false);
      }
      setSaving(false);
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [dirty, cardId, draft, performSave]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/${slugify(draft.slug) || '…'}`;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
            ← Cards
          </Link>
          <h1 className="text-base font-bold text-slate-900">
            {isNew && !cardId ? 'New card' : draft.full_name || 'Edit card'}
          </h1>
          <span className="hidden font-mono text-xs text-slate-400 sm:inline">{publicUrl}</span>
          <div className="ml-auto flex items-center gap-2">
            {saving && <span className="text-sm text-slate-400">Saving…</span>}
            {!saving && saveMsg && <span className="text-sm font-medium text-green-600">{saveMsg}</span>}
            {!saving && dirty && !saveMsg && (
              <span className="text-sm text-amber-600">Unsaved changes</span>
            )}
            {error && <span className="max-w-xs truncate text-sm font-medium text-red-600">{error}</span>}
            {cardId && (
              <>
                <button
                  onClick={() => navigator.clipboard?.writeText(publicUrl)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  QR
                </button>
              </>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Form column */}
        <div className="min-w-0 flex-1 space-y-5">
          <Section title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *">
                <input className={inputCls} value={draft.full_name} onChange={(e) => set('full_name', e.target.value)} />
              </Field>
              <Field label="Slug *" hint="Card URL: /your-slug">
                <input
                  className={`${inputCls} font-mono`}
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value);
                  }}
                  onBlur={() => set('slug', slugify(draft.slug))}
                />
              </Field>
              <Field label="Title">
                <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
              <Field label="Company">
                <input className={inputCls} value={draft.company} onChange={(e) => set('company', e.target.value)} />
              </Field>
            </div>
            <Field label="Tagline" hint="Line breaks are kept.">
              <textarea
                className={`${inputCls} min-h-[70px]`}
                value={draft.tagline}
                onChange={(e) => set('tagline', e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 accent-slate-900"
              />
              Card is active (publicly visible)
            </label>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone (Call me)">
                <input className={inputCls} value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+19895551234" />
              </Field>
              <Field label="SMS number (Text me)">
                <input className={inputCls} value={draft.sms_number} onChange={(e) => set('sms_number', e.target.value)} placeholder="+19895551234" />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={draft.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Website URL">
                <input className={inputCls} value={draft.website_url} onChange={(e) => set('website_url', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Calendar URL" hint="Schedule a meeting button">
                <input className={inputCls} value={draft.calendar_url} onChange={(e) => set('calendar_url', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Resources URL" hint="Free resources button">
                <input className={inputCls} value={draft.resources_url} onChange={(e) => set('resources_url', e.target.value)} placeholder="https://" />
              </Field>
            </div>
          </Section>

          <Section title="Media">
            <ImageField label="Profile photo" value={draft.profile_photo_url} onChange={(v) => set('profile_photo_url', v)} userId={userId} />
            <ImageField label="Banner photo" value={draft.banner_photo_url} onChange={(v) => set('banner_photo_url', v)} userId={userId} />
            <ImageField label="Logo (footer)" value={draft.logo_url} onChange={(v) => set('logo_url', v)} userId={userId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="YouTube video ID" hint="The part after watch?v=">
                <input className={inputCls} value={draft.youtube_id} onChange={(e) => set('youtube_id', e.target.value)} />
              </Field>
              <Field label="Video heading">
                <input className={inputCls} value={draft.video_heading} onChange={(e) => set('video_heading', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Branding">
            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField label="Primary (action buttons)" value={draft.primary_color} onChange={(v) => set('primary_color', v)} />
              <ColorField label="Secondary (links, outlines)" value={draft.secondary_color} onChange={(v) => set('secondary_color', v)} />
              <ColorField label="Page background" value={draft.background_color} onChange={(v) => set('background_color', v)} />
            </div>
          </Section>

          <Section title="Style">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Header layout">
                <select className={inputCls} value={draft.header_style} onChange={(e) => set('header_style', e.target.value as CardDraft['header_style'])}>
                  <option value="photo">Photo (profile photo over banner)</option>
                  <option value="logo">Logo at top</option>
                  <option value="banner">Banner only</option>
                </select>
              </Field>
              <Field label="Photo shape" hint="Applies to profile photo in Photo layout.">
                <select className={inputCls} value={draft.photo_shape} onChange={(e) => set('photo_shape', e.target.value as CardDraft['photo_shape'])}>
                  <option value="circle">Circle</option>
                  <option value="rounded">Rounded square</option>
                </select>
              </Field>
              <Field label="Font">
                <select className={inputCls} value={draft.font_family} onChange={(e) => set('font_family', e.target.value as CardDraft['font_family'])}>
                  <option value="sans">Sans-serif (default)</option>
                  <option value="serif">Serif (Georgia)</option>
                  <option value="rounded">Rounded (Nunito)</option>
                  <option value="slab">Slab serif (Roboto Slab)</option>
                </select>
              </Field>
              <Field label="Button shape">
                <select className={inputCls} value={draft.button_shape} onChange={(e) => set('button_shape', e.target.value as CardDraft['button_shape'])}>
                  <option value="rounded">Rounded (10px)</option>
                  <option value="pill">Pill</option>
                  <option value="square">Square (4px)</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="About">
            <Field label="Heading">
              <input className={inputCls} value={draft.about_heading} onChange={(e) => set('about_heading', e.target.value)} placeholder="About us" />
            </Field>
            <Field label="Text" hint="Line breaks are kept.">
              <textarea
                className={`${inputCls} min-h-[100px]`}
                value={draft.about_text}
                onChange={(e) => set('about_text', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Feature badges">
            <Repeater
              items={draft.features}
              onChange={(v) => set('features', v)}
              blank={{ icon: '', label: '' }}
              addLabel="Add badge"
              render={(item, update) => (
                <div className="grid gap-2 sm:grid-cols-[80px_1fr]">
                  <input className={inputCls} placeholder="Icon" value={item.icon} onChange={(e) => update({ icon: e.target.value })} />
                  <input className={inputCls} placeholder="Label" value={item.label} onChange={(e) => update({ label: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Image gallery">
            <Repeater
              items={draft.gallery}
              onChange={(v) => set('gallery', v)}
              blank={{ url: '', caption: '' }}
              addLabel="Add image"
              render={(item, update) => (
                <div className="space-y-2">
                  <ImageField label="Image" value={item.url} onChange={(v) => update({ url: v })} userId={userId} />
                  <input className={inputCls} placeholder="Caption (optional)" value={item.caption} onChange={(e) => update({ caption: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Business links">
            <Field label="Section heading" hint='e.g. "Local Is What We Do."'>
              <input className={inputCls} value={draft.links_heading} onChange={(e) => set('links_heading', e.target.value)} />
            </Field>
            <Repeater
              items={draft.business_links}
              onChange={(v) => set('business_links', v)}
              blank={{ label: '', url: '', icon: '' }}
              addLabel="Add business link"
              render={(item, update) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_80px]">
                  <input className={inputCls} placeholder="Label" value={item.label} onChange={(e) => update({ label: e.target.value })} />
                  <input className={inputCls} placeholder="https://" value={item.url} onChange={(e) => update({ url: e.target.value })} />
                  <input className={inputCls} placeholder="Icon" value={item.icon} onChange={(e) => update({ icon: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Extra buttons">
            <Repeater
              items={draft.extra_buttons}
              onChange={(v) => set('extra_buttons', v)}
              blank={{ label: '', url: '', style: 'outline' as const, caption: '' }}
              addLabel="Add button"
              render={(item, update) => (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                    <input className={inputCls} placeholder="Label" value={item.label} onChange={(e) => update({ label: e.target.value })} />
                    <input className={inputCls} placeholder="https:// or tel:+1989…" value={item.url} onChange={(e) => update({ url: e.target.value })} />
                    <select
                      className={inputCls}
                      value={item.style}
                      onChange={(e) => update({ style: e.target.value as 'solid' | 'outline' })}
                    >
                      <option value="outline">Outline</option>
                      <option value="solid">Solid</option>
                    </select>
                  </div>
                  <input className={inputCls} placeholder="Caption under the button (optional)" value={item.caption} onChange={(e) => update({ caption: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Lead capture form">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.form_enabled}
                onChange={(e) => set('form_enabled', e.target.checked)}
                className="h-4 w-4 accent-slate-900"
              />
              Show the lead form on this card
            </label>
            {draft.form_enabled && (
              <>
                <Field label="Form heading">
                  <input className={inputCls} value={draft.form_heading} onChange={(e) => set('form_heading', e.target.value)} />
                </Field>
                <Field label="Form subtext">
                  <input className={inputCls} value={draft.form_subtext} onChange={(e) => set('form_subtext', e.target.value)} />
                </Field>
                <Field label="Consent text" hint="Shown next to the required checkbox.">
                  <textarea className={`${inputCls} min-h-[70px]`} value={draft.form_consent_text} onChange={(e) => set('form_consent_text', e.target.value)} />
                </Field>
                <Field label="Webhook URL" hint="GoHighLevel inbound webhook. Submissions POST here as JSON.">
                  <input className={`${inputCls} font-mono`} value={draft.webhook_url} onChange={(e) => set('webhook_url', e.target.value)} placeholder="https://services.leadconnectorhq.com/hooks/…" />
                </Field>
                <Field label="Success message">
                  <input className={inputCls} value={draft.form_success_message} onChange={(e) => set('form_success_message', e.target.value)} />
                </Field>
              </>
            )}
          </Section>

          <Section title="Review links">
            <Repeater
              items={draft.review_links}
              onChange={(v) => set('review_links', v)}
              blank={{ label: '', url: '' }}
              addLabel="Add review link"
              render={(item, update) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputCls} placeholder="Label" value={item.label} onChange={(e) => update({ label: e.target.value })} />
                  <input className={inputCls} placeholder="https://" value={item.url} onChange={(e) => update({ url: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Social links">
            <Repeater
              items={draft.social_links}
              onChange={(v) => set('social_links', v)}
              blank={{ platform: 'facebook', url: '' }}
              addLabel="Add social link"
              render={(item, update) => (
                <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                  <select className={inputCls} value={item.platform} onChange={(e) => update({ platform: e.target.value })}>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X</option>
                    <option value="other">Other</option>
                  </select>
                  <input className={inputCls} placeholder="https://" value={item.url} onChange={(e) => update({ url: e.target.value })} />
                </div>
              )}
            />
          </Section>

          <Section title="Footer">
            <Field label="Footer text" hint='e.g. "©2026 Land Local Leads"'>
              <input className={inputCls} value={draft.footer_text} onChange={(e) => set('footer_text', e.target.value)} />
            </Field>
          </Section>
        </div>

        {/* Preview column */}
        <div className="hidden w-[400px] shrink-0 lg:block">
          <div className="sticky top-20">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
              Live preview
            </p>
            <div className="overflow-hidden rounded-[28px] border-8 border-slate-900 bg-white shadow-xl">
              <div className="h-[640px] overflow-y-auto">
                <CardView card={previewCard} preview />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQR && cardId && <QRModal card={previewCard} onClose={() => setShowQR(false)} />}
    </div>
  );
}
