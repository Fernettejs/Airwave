import { useState } from 'react';
import { Link } from 'react-router-dom';

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#0D1B2A';
const ORANGE = '#EA580C';
const BLUE   = '#2563EB';
const WHITE  = '#FFFFFF';
const LIGHT  = '#F8FAFC';
const TEXT   = '#0F172A';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

const cond: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };
const sans: React.CSSProperties = { fontFamily: "'Barlow', sans-serif" };

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
function Icon({ d, size = 22, color = ORANGE }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  phone:    'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.1 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.36 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0122 14.92z',
  calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18',
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  user:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  link:     'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  qr:       'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M17 20h3M20 20v1',
  tap:      'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10M8.5 12.5a5 5 0 007 0M6 12a8 8 0 0012 0',
  check:    'M20 6L9 17l-5-5',
};

// ── Phone mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Glow behind the phone */}
      <div style={{
        position: 'absolute', inset: -40,
        background: `radial-gradient(ellipse at center, rgba(37,99,235,0.22) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Phone shell */}
      <div style={{
        width: 230,
        background: '#1E293B',
        borderRadius: 44,
        border: '7px solid #334155',
        padding: '14px 10px 18px',
        boxShadow: '0 50px 100px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {/* Dynamic island */}
        <div style={{
          width: 68, height: 20, background: '#0F172A',
          borderRadius: 12, margin: '0 auto 10px',
        }} />

        {/* Screen */}
        <div style={{
          background: LIGHT, borderRadius: 30,
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Card header gradient */}
          <div style={{
            background: `linear-gradient(145deg, ${NAVY} 0%, ${BLUE} 100%)`,
            padding: '22px 16px 38px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '2.5px solid rgba(255,255,255,0.35)',
              margin: '0 auto 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ ...cond, color: WHITE, fontSize: '1.1rem', fontWeight: 900 }}>JR</span>
            </div>
            <div style={{ ...sans, color: WHITE, fontSize: '0.95rem', fontWeight: 700 }}>Jordan Reyes</div>
            <div style={{ ...sans, color: 'rgba(255,255,255,0.72)', fontSize: '0.62rem', marginTop: 3 }}>
              Reyes Heating & Air · Midland, MI
            </div>
          </div>

          {/* Card body — white card rising over header */}
          <div style={{
            background: WHITE,
            borderRadius: '22px 22px 0 0',
            marginTop: -18,
            padding: '16px 14px 20px',
          }}>
            {/* Stars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 10 }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ color: '#F59E0B', fontSize: '0.7rem' }}>★</span>
              ))}
              <span style={{ ...sans, color: MUTED, fontSize: '0.58rem', marginLeft: 4 }}>4.9 · 84 reviews</span>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
              {['Licensed', 'Insured', '24/7'].map(b => (
                <span key={b} style={{
                  ...sans,
                  background: '#EFF6FF', color: BLUE,
                  fontSize: '0.55rem', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 4,
                }}>{b}</span>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              {([
                { l: 'Call',  bg: ORANGE,   fg: WHITE,  border: 'none' },
                { l: 'Text',  bg: BLUE,     fg: WHITE,  border: 'none' },
                { l: 'Book',  bg: LIGHT,    fg: TEXT,   border: `1px solid ${BORDER}` },
                { l: 'Share', bg: LIGHT,    fg: TEXT,   border: `1px solid ${BORDER}` },
              ] as const).map(({ l, bg, fg, border }) => (
                <div key={l} style={{
                  ...sans,
                  background: bg, color: fg, border,
                  borderRadius: 8, padding: '7px 0',
                  textAlign: 'center', fontSize: '0.68rem', fontWeight: 600,
                }}>{l}</div>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}
              style={{
                ...sans,
                width: '100%',
                background: saved ? '#16A34A' : TEXT,
                color: WHITE,
                border: 'none', borderRadius: 8,
                padding: '8px 0', fontSize: '0.68rem', fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {saved
                ? <><Icon d={ICONS.check} size={13} color={WHITE} /> Saved to Contacts</>
                : '+ Save Contact'
              }
            </button>
          </div>
        </div>

        {/* Home indicator */}
        <div style={{
          width: 80, height: 4, background: '#475569',
          borderRadius: 2, margin: '12px auto 0',
        }} />
      </div>
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────
function OrangeBtn({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{
      ...sans,
      display: 'inline-block',
      background: ORANGE, color: WHITE,
      fontWeight: 700, fontSize: '0.95rem',
      padding: '13px 26px', borderRadius: 8,
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(234,88,12,0.45)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(234,88,12,0.35)'; }}
    >
      {children}
    </Link>
  );
}

function OutlineBtn({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{
      ...sans,
      display: 'inline-block',
      background: 'transparent', color: 'rgba(255,255,255,0.85)',
      fontWeight: 600, fontSize: '0.95rem',
      padding: '12px 26px', borderRadius: 8,
      textDecoration: 'none',
      border: '1.5px solid rgba(255,255,255,0.25)',
    }}>
      {children}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ ...sans, color: TEXT, background: WHITE }}>

      {/* ── Nav ── */}
      <header style={{ background: NAVY, position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ ...cond, fontWeight: 900, fontSize: '1.45rem', letterSpacing: '0.02em', color: WHITE }}>
              AirWave<span style={{ color: ORANGE }}>.</span><span style={{ color: '#7DD3FC' }}>cards</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" style={{ ...sans, fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link to="/signup" style={{
              ...sans, fontSize: '0.9rem', fontWeight: 700,
              background: ORANGE, color: WHITE,
              padding: '9px 20px', borderRadius: 7,
              textDecoration: 'none',
            }}>
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: NAVY, paddingBottom: 0 }}>
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-0 sm:pt-24">
          <div className="grid items-end gap-12 lg:grid-cols-2">

            {/* Copy */}
            <div className="pb-16 lg:pb-24">
              <div className="fade-up" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(234,88,12,0.15)', color: ORANGE,
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                padding: '5px 12px', borderRadius: 20,
                border: '1px solid rgba(234,88,12,0.3)',
                marginBottom: 20, textTransform: 'uppercase',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, display: 'inline-block' }} />
                Built for home service pros
              </div>

              <h1 className="fade-up-1" style={{
                ...cond,
                fontSize: 'clamp(2.8rem, 7vw, 4.4rem)',
                fontWeight: 900, lineHeight: 1.0,
                color: WHITE, marginBottom: 22,
              }}>
                Your business card,<br />
                built for the{' '}
                <span style={{ color: '#7DD3FC' }}>phone.</span>
              </h1>

              <p className="fade-up-2" style={{
                fontSize: '1.05rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.65)',
                maxWidth: 480, marginBottom: 32,
              }}>
                One link your customers can tap, call, book from, and save to their
                contacts. Share it as a text, QR code, or tap card — no app needed.
              </p>

              <div className="fade-up-3 flex flex-wrap items-center gap-3" style={{ marginBottom: 32 }}>
                <OrangeBtn to="/signup">Create your free card →</OrangeBtn>
                <OutlineBtn to="/login">Sign in</OutlineBtn>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {['Free to set up', 'No app to download', 'Works on any phone'].map(f => (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Icon d={ICONS.check} size={15} color='#4ADE80' />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Phone mockup — sits flush with section bottom */}
            <div className="hidden justify-center pb-0 lg:flex">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ background: LIGHT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: BORDER }}>
            {[
              { stat: '1 tap',    label: 'to call or text you' },
              { stat: '3 min',    label: 'to build your card' },
              { stat: 'Any phone', label: 'no app required' },
            ].map(({ stat, label }) => (
              <div key={stat} style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div style={{ ...cond, fontWeight: 900, fontSize: '1.6rem', color: TEXT }}>{stat}</div>
                <div style={{ fontSize: '0.82rem', color: MUTED, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <section style={{ background: WHITE, padding: '80px 0' }}>
        <div className="mx-auto max-w-6xl px-5">
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Simple setup
            </p>
            <h2 style={{ ...cond, fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 900, color: TEXT, lineHeight: 1.1 }}>
              Up and running in minutes
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: '01', title: 'Fill in your info',
                body: 'Name, phone, trade, service area, booking link, and social profiles. Live preview as you type.',
              },
              {
                n: '02', title: 'Grab your link',
                body: 'You get a short link and a QR code the moment you save. Print it, text it, or tap it.',
              },
              {
                n: '03', title: 'Get saved in their phone',
                body: 'Customers save your contact in one tap. Your name shows up when they need a callback.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ position: 'relative' }}>
                <div style={{
                  ...cond, fontSize: '3.5rem', fontWeight: 900,
                  color: BORDER, lineHeight: 1, marginBottom: 12,
                  userSelect: 'none',
                }}>
                  {n}
                </div>
                <h3 style={{ ...cond, fontWeight: 700, fontSize: '1.2rem', color: TEXT, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.93rem', color: MUTED, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's on the card ── */}
      <section style={{ background: LIGHT, padding: '80px 0', borderTop: `1px solid ${BORDER}` }}>
        <div className="mx-auto max-w-6xl px-5">
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              What's on the card
            </p>
            <h2 style={{ ...cond, fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 900, color: TEXT, lineHeight: 1.1 }}>
              Everything a customer needs to act
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ICONS.phone,    title: 'Tap to call',       body: 'One tap dials your number. No hunting for a saved contact.' },
              { icon: ICONS.calendar, title: 'Request a quote',   body: 'Link your booking page or contact form right on the card.' },
              { icon: ICONS.star,     title: 'Reviews visible',   body: 'Your Google or Facebook rating builds trust before they even call.' },
              { icon: ICONS.user,     title: 'Save your contact', body: 'One button adds your full info to their phone contacts.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{
                background: WHITE, borderRadius: 12,
                border: `1px solid ${BORDER}`,
                padding: '24px 20px',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'rgba(234,88,12,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Icon d={icon} size={20} color={ORANGE} />
                </div>
                <h3 style={{ ...cond, fontWeight: 700, fontSize: '1.05rem', color: TEXT, marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: '0.88rem', color: MUTED, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 ways to share ── */}
      <section style={{ background: NAVY, padding: '80px 0' }}>
        <div className="mx-auto max-w-6xl px-5">
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Share your way
            </p>
            <h2 style={{ ...cond, fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>
              Three ways to hand it over
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ICONS.link, label: 'LINK',
                title: 'Text the link',
                body: 'Send it after an estimate. Opens on any phone, saves to contacts in one tap.',
                highlight: false,
              },
              {
                icon: ICONS.qr, label: 'QR CODE',
                title: 'Stick it on the truck',
                body: 'Print the QR on your truck door, yard sign, or invoice. They scan it on the spot.',
                highlight: false,
              },
              {
                icon: ICONS.tap, label: 'TAP CARD',
                title: 'Tap a card',
                body: 'Program a NFC card or sticker. Their phone touches it, your card opens instantly.',
                highlight: true,
              },
            ].map(({ icon, label, title, body, highlight }) => (
              <div key={label} style={{
                background: highlight ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                border: `1px solid ${highlight ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.1)'}`,
                padding: '28px 24px',
                position: 'relative',
              }}>
                {highlight && (
                  <div style={{
                    position: 'absolute', top: -11, left: 20,
                    background: BLUE, color: WHITE,
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
                  }}>
                    Recommended
                  </div>
                )}
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: highlight ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Icon d={icon} size={20} color={highlight ? '#93C5FD' : 'rgba(255,255,255,0.6)'} />
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
                <h3 style={{ ...cond, fontWeight: 700, fontSize: '1.15rem', color: WHITE, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades strip ── */}
      <div style={{ background: LIGHT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '14px 24px' }}>
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-x-6 gap-y-1 justify-center">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Used by:</span>
          {['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Siding', 'Landscaping', 'Concrete', 'Excavating', 'Garage Doors', 'Tree Service'].map(t => (
            <span key={t} style={{ fontSize: '0.82rem', fontWeight: 600, color: MUTED }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── CTA band ── */}
      <section style={{ background: WHITE, padding: '96px 0' }}>
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 style={{
            ...cond,
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 900, lineHeight: 1.05, color: TEXT, marginBottom: 16,
          }}>
            Stop losing work to whoever's easier to find.
          </h2>
          <p style={{ fontSize: '1rem', color: MUTED, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 32px' }}>
            Give every customer a card they'll actually keep. It takes three minutes and it's free.
          </p>
          <OrangeBtn to="/signup">Create your free card →</OrangeBtn>
          <p style={{ fontSize: '0.8rem', color: MUTED, marginTop: 12 }}>No credit card needed. Free forever on the basic plan.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: NAVY, borderTop: `1px solid rgba(255,255,255,0.07)`, padding: '24px 0' }}>
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 px-5">
          <span style={{ ...cond, fontWeight: 900, fontSize: '1.1rem', color: WHITE, letterSpacing: '0.02em' }}>
            AirWave<span style={{ color: ORANGE }}>.</span><span style={{ color: '#7DD3FC' }}>cards</span>
          </span>
          <div className="flex items-center gap-6">
            <Link to="/login" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Sign in</Link>
            <Link to="/signup" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Sign up</Link>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} AirWave.cards</span>
        </div>
      </footer>
    </div>
  );
}
