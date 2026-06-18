import { useState } from 'react';
import type { Card } from '../lib/types';
import { downloadVCard } from '../lib/vcard';
import SocialIcon from './SocialIcon';

interface Props {
  card: Card;
  /** Disable outbound actions when rendering inside the admin preview. */
  preview?: boolean;
}

function ContactIcon({ kind }: { kind: 'call' | 'text' | 'email' | 'web' }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'call')
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  if (kind === 'text')
    return (
      <svg {...common}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  if (kind === 'email')
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function LeadForm({ card, preview }: Props) {
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    name.trim().length > 0 && validEmail && phone.trim().length > 0 && consent && status !== 'sending';

  async function submit() {
    if (preview) {
      setStatus('sent');
      return;
    }
    if (!canSubmit) return;
    if (!card.webhook_url) {
      setStatus('error');
      setErrorMsg('This form is not connected yet.');
      return;
    }
    setStatus('sending');
    const payload = {
      full_name: name.trim(),
      business_name: business.trim(),
      email: email.trim(),
      phone: phone.trim(),
      consent: true,
      card_slug: card.slug,
      source: 'digital-card',
    };
    try {
      const res = await fetch(card.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('sent');
    } catch {
      // CORS-restricted webhook endpoints: fire-and-forget fallback.
      try {
        await fetch(card.webhook_url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
        setStatus('sent');
      } catch {
        setStatus('error');
        setErrorMsg('Could not send. Check your connection and try again.');
      }
    }
  }

  if (status === 'sent') {
    return (
      <div className="cv-card p-6 text-center">
        <p className="text-base font-semibold">{card.form_success_message || 'Sent.'}</p>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-[15px] outline-none focus:border-[var(--cv-secondary)] focus:ring-2 focus:ring-[var(--cv-secondary)]/20';

  return (
    <div className="cv-card p-6">
      {card.form_heading && (
        <h2 className="text-center text-2xl font-bold leading-snug">{card.form_heading}</h2>
      )}
      {card.form_subtext && (
        <p className="mt-3 text-center text-[15px] text-slate-600">{card.form_subtext}</p>
      )}
      <div className="mt-5 space-y-4 text-left">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Full name *</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Business name</span>
          <input className={inputCls} value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Business name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email *</span>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Phone *</span>
          <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--cv-secondary)]"
          />
          <span className="text-[13px] leading-relaxed text-slate-600">{card.form_consent_text}</span>
        </label>
        {status === 'error' && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="h-12 w-full rounded-lg text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--cv-secondary)' }}
        >
          {status === 'sending' ? 'Sending…' : 'Send it to me'}
        </button>
      </div>
    </div>
  );
}

export default function CardView({ card, preview = false }: Props) {
  const [copied, setCopied] = useState(false);
  const cardUrl = preview
    ? `${window.location.origin}/${card.slug}`
    : window.location.href;

  const vars = {
    '--cv-primary': card.primary_color || '#EA580C',
    '--cv-secondary': card.secondary_color || '#1E3A8A',
    '--cv-bg': card.background_color || '#EFF6FF',
  } as React.CSSProperties;

  function share() {
    if (preview) return;
    const data = { title: card.full_name, text: card.tagline, url: cardUrl };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else {
      navigator.clipboard?.writeText(cardUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const solidBtn =
    'flex h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold text-white shadow-sm transition-transform active:scale-[0.99]';
  const outlineBtn =
    'flex h-12 w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 text-[15px] font-semibold shadow-sm transition-transform active:scale-[0.99]';
  const linkProps = preview ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {};

  const shareMail = `mailto:?subject=${encodeURIComponent(card.full_name + ' — digital card')}&body=${encodeURIComponent('Here is my card: ' + cardUrl)}`;
  const shareSms = `sms:?&body=${encodeURIComponent('Here is my card: ' + cardUrl)}`;

  return (
    <div style={vars} className="min-h-full w-full" data-cardview>
      <style>{`
        [data-cardview] .cv-card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06); }
      `}</style>
      <div className="min-h-screen w-full pb-10" style={{ backgroundColor: 'var(--cv-bg)' }}>
        <div className="mx-auto w-full max-w-[480px] px-4">
          {/* Header */}
          <header className="pt-0 text-center">
            <div className="relative">
              {card.banner_photo_url ? (
                <img
                  src={card.banner_photo_url}
                  alt=""
                  className="h-24 w-full rounded-b-xl object-cover"
                />
              ) : (
                <div className="h-16" />
              )}
              {card.profile_photo_url && (
                <img
                  src={card.profile_photo_url}
                  alt={card.full_name}
                  className="absolute left-1/2 top-full h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white object-cover shadow-md"
                />
              )}
            </div>
            <div className={card.profile_photo_url ? 'pt-20' : 'pt-4'}>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{card.full_name}</h1>
              {(card.title || card.company) && (
                <p className="mt-1 text-lg font-medium text-slate-700">
                  {[card.title, card.company].filter(Boolean).join(' · ')}
                </p>
              )}
              {card.tagline && (
                <p className="mx-auto mt-2 max-w-[340px] whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
                  {card.tagline}
                </p>
              )}
            </div>
          </header>

          {/* Save contact */}
          <div className="mt-6">
            <button
              onClick={() => !preview && downloadVCard(card)}
              className={solidBtn}
              style={{ backgroundColor: 'var(--cv-primary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Save contact
            </button>
          </div>

          {/* Contact grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {card.phone && (
              <a href={`tel:${card.phone}`} {...linkProps} className={outlineBtn} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="call" /> Call me
              </a>
            )}
            {card.sms_number && (
              <a href={`sms:${card.sms_number}`} {...linkProps} className={outlineBtn} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="text" /> Text me
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} {...linkProps} className={outlineBtn} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="email" /> Email me
              </a>
            )}
            {card.website_url && (
              <a href={card.website_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={outlineBtn} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="web" /> Website
              </a>
            )}
          </div>

          {/* Business links */}
          {card.business_links.length > 0 && (
            <div className="cv-card mt-6 p-4">
              {card.links_heading && (
                <p className="mb-3 text-center text-[15px] font-bold text-slate-900">{card.links_heading}</p>
              )}
              <div className="space-y-3">
                {card.business_links.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...linkProps}
                    className={solidBtn}
                    style={{ backgroundColor: 'var(--cv-secondary)' }}
                  >
                    {l.label} {l.icon && <span aria-hidden="true">{l.icon}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Extra buttons */}
          {card.extra_buttons.length > 0 && (
            <div className="mt-6 space-y-4">
              {card.extra_buttons.map((b, i) => (
                <div key={i}>
                  <a
                    href={b.url}
                    target={b.url.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    {...linkProps}
                    className={b.style === 'solid' ? solidBtn : outlineBtn}
                    style={
                      b.style === 'solid'
                        ? { backgroundColor: 'var(--cv-primary)' }
                        : { borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }
                    }
                  >
                    {b.label}
                  </a>
                  {b.caption && (
                    <p className="mt-2 text-center text-sm text-slate-500">{b.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resources / calendar */}
          {(card.resources_url || card.calendar_url) && (
            <div className="mt-6 space-y-4">
              {card.resources_url && (
                <a href={card.resources_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={outlineBtn} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                  Free resources and information
                </a>
              )}
              {card.calendar_url && (
                <a href={card.calendar_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={solidBtn} style={{ backgroundColor: 'var(--cv-primary)' }}>
                  Schedule a meeting
                </a>
              )}
            </div>
          )}

          {/* Lead form */}
          {card.form_enabled && (
            <div className="mt-6">
              <LeadForm card={card} preview={preview} />
            </div>
          )}

          {/* Video */}
          {card.youtube_id && (
            <div className="mt-6">
              {card.video_heading && (
                <p className="mb-3 text-center text-[15px] font-bold text-slate-900">{card.video_heading}</p>
              )}
              <div className="cv-card overflow-hidden">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${card.youtube_id}`}
                    title="Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          )}

          {/* Share + reviews */}
          <div className="mt-8 space-y-3">
            <a href={shareMail} {...linkProps} className={outlineBtn} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              Share by email
            </a>
            <a href={shareSms} {...linkProps} className={outlineBtn} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              Share by text
            </a>
            <button onClick={share} className={outlineBtn} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              {copied ? 'Link copied' : 'Share this card'}
            </button>
            {card.review_links.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" {...linkProps} className={outlineBtn} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
                {r.label}
              </a>
            ))}
          </div>

          {/* Socials */}
          {card.social_links.length > 0 && (
            <div className="mt-8 flex justify-center gap-3">
              {card.social_links.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...linkProps}
                  aria-label={s.platform}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm"
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-10 flex flex-col items-center gap-3 text-center">
            {card.logo_url && <img src={card.logo_url} alt="" className="max-h-24 max-w-[160px] object-contain" />}
            {card.footer_text && <p className="text-sm text-slate-500">{card.footer_text}</p>}
          </footer>
        </div>
      </div>
    </div>
  );
}
