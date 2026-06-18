import { useState } from 'react';
import type { Card } from '../lib/types';
import { downloadVCard } from '../lib/vcard';
import SocialIcon from './SocialIcon';

interface Props {
  card: Card;
  preview?: boolean;
}

const fontStacks: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  rounded: '"Nunito", ui-rounded, system-ui, -apple-system, sans-serif',
  slab: '"Roboto Slab", Rockwell, "Courier Bold", Courier, Georgia, serif',
};

const buttonRadius: Record<string, string> = {
  rounded: '10px',
  pill: '9999px',
  square: '4px',
};

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
          className="h-12 w-full text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--cv-secondary)', borderRadius: 'var(--cv-btn-radius)' }}
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

  const btnRadius = buttonRadius[card.button_shape ?? 'rounded'] ?? '10px';
  const photoRadius = (card.photo_shape ?? 'circle') === 'circle' ? '50%' : '20px';
  const fontStack = fontStacks[card.font_family ?? 'sans'] ?? fontStacks.sans;
  const headerStyle = card.header_style ?? 'photo';

  const vars = {
    '--cv-primary': card.primary_color || '#EA580C',
    '--cv-secondary': card.secondary_color || '#1E3A8A',
    '--cv-bg': card.background_color || '#EFF6FF',
    '--cv-btn-radius': btnRadius,
    '--cv-font': fontStack,
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
    'flex h-12 w-full items-center justify-center gap-2 px-4 text-[15px] font-semibold text-white shadow-sm transition-transform active:scale-[0.99]';
  const outlineBtn =
    'flex h-12 w-full items-center justify-center gap-2 border bg-white px-4 text-[15px] font-semibold shadow-sm transition-transform active:scale-[0.99]';
  const linkProps = preview ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {};

  const shareMail = `mailto:?subject=${encodeURIComponent(card.full_name + ' — digital card')}&body=${encodeURIComponent('Here is my card: ' + cardUrl)}`;
  const shareSms = `sms:?&body=${encodeURIComponent('Here is my card: ' + cardUrl)}`;

  function renderHeader() {
    if (headerStyle === 'logo') {
      return (
        <header className="pt-6 text-center">
          {card.logo_url && (
            <div className="flex justify-center">
              <img src={card.logo_url} alt={card.company || card.full_name} className="max-h-[110px] max-w-[220px] object-contain" />
            </div>
          )}
          {card.banner_photo_url && (
            <div className="mt-4">
              <img src={card.banner_photo_url} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: '160px' }} />
            </div>
          )}
          <div className="mt-5">
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
      );
    }

    if (headerStyle === 'banner') {
      return (
        <header className="text-center">
          {card.banner_photo_url ? (
            <img src={card.banner_photo_url} alt="" className="h-[170px] w-full object-cover" />
          ) : (
            <div className="h-[170px] w-full" style={{ backgroundColor: 'var(--cv-secondary)', opacity: 0.15 }} />
          )}
          <div className="pt-5">
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
      );
    }

    // 'photo' — default
    return (
      <header className="pt-0 text-center">
        <div className="relative">
          {card.banner_photo_url ? (
            <img src={card.banner_photo_url} alt="" className="h-24 w-full rounded-b-xl object-cover" />
          ) : (
            <div className="h-16" />
          )}
          {card.profile_photo_url && (
            <img
              src={card.profile_photo_url}
              alt={card.full_name}
              className="absolute left-1/2 top-full h-28 w-28 -translate-x-1/2 -translate-y-1/2 border-4 border-white object-cover shadow-md"
              style={{ borderRadius: photoRadius }}
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
    );
  }

  return (
    <div style={vars} className="min-h-full w-full" data-cardview>
      <style>{`
        [data-cardview] { font-family: var(--cv-font); }
        [data-cardview] .cv-card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06); }
        [data-cardview] .cv-btn-solid { border-radius: var(--cv-btn-radius); }
        [data-cardview] .cv-btn-outline { border-radius: var(--cv-btn-radius); }
      `}</style>
      <div className="min-h-screen w-full pb-10" style={{ backgroundColor: 'var(--cv-bg)' }}>
        <div className="mx-auto w-full max-w-[480px] px-4">

          {renderHeader()}

          {/* Save contact */}
          <div className="mt-6">
            <button
              onClick={() => !preview && downloadVCard(card)}
              className={`${solidBtn} cv-btn-solid`}
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
              <a href={`tel:${card.phone}`} {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="call" /> Call me
              </a>
            )}
            {card.sms_number && (
              <a href={`sms:${card.sms_number}`} {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="text" /> Text me
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="email" /> Email me
              </a>
            )}
            {card.website_url && (
              <a href={card.website_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                <ContactIcon kind="web" /> Website
              </a>
            )}
          </div>

          {/* Feature badges */}
          {card.features?.length > 0 && (
            <div className="cv-card mt-6 p-4">
              <div className="grid grid-cols-3 gap-3">
                {card.features.map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 text-center">
                    <span className="text-3xl leading-none">{f.icon}</span>
                    <span className="text-[13px] font-bold text-slate-800 leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {(card.about_heading || card.about_text) && (
            <div className="cv-card mt-6 p-5">
              {card.about_heading && (
                <h2 className="text-base font-bold text-slate-900">{card.about_heading}</h2>
              )}
              {card.about_text && (
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
                  {card.about_text}
                </p>
              )}
            </div>
          )}

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
                    className={`${solidBtn} cv-btn-solid`}
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
                    className={b.style === 'solid' ? `${solidBtn} cv-btn-solid` : `${outlineBtn} cv-btn-outline`}
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
                <a href={card.resources_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)' }}>
                  Free resources and information
                </a>
              )}
              {card.calendar_url && (
                <a href={card.calendar_url} target="_blank" rel="noopener noreferrer" {...linkProps} className={`${solidBtn} cv-btn-solid`} style={{ backgroundColor: 'var(--cv-primary)' }}>
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

          {/* Gallery */}
          {card.gallery?.length > 0 && (
            <div className="mt-6 space-y-4">
              {card.gallery.map((item, i) => (
                <div key={i}>
                  <img src={item.url} alt={item.caption || ''} className="w-full rounded-xl object-cover" />
                  {item.caption && (
                    <p className="mt-2 text-center text-sm text-slate-500">{item.caption}</p>
                  )}
                </div>
              ))}
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
            <a href={shareMail} {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              Share by email
            </a>
            <a href={shareSms} {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              Share by text
            </a>
            <button onClick={share} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
              {copied ? 'Link copied' : 'Share this card'}
            </button>
            {card.review_links.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" {...linkProps} className={`${outlineBtn} cv-btn-outline`} style={{ borderColor: '#cbd5e1', color: '#334155' }}>
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

          {/* Footer — hide logo here when header_style is 'logo' (already shown at top) */}
          <footer className="mt-10 flex flex-col items-center gap-3 text-center">
            {headerStyle !== 'logo' && card.logo_url && (
              <img src={card.logo_url} alt="" className="max-h-24 max-w-[160px] object-contain" />
            )}
            {card.footer_text && <p className="text-sm text-slate-500">{card.footer_text}</p>}
          </footer>
        </div>
      </div>
    </div>
  );
}
