import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK    = '#1B1812';
const MANILA = '#E9DECA';
const CARD   = '#F4ECDC';
const STEEL  = '#27566E';
const ORANGE = '#E0521A';
const AMBER  = '#EFAE10';
const STAMP_RED = '#B91C1C';

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const cond: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };
const sans: React.CSSProperties = { fontFamily: "'Barlow', sans-serif" };

const TRADES = [
  'Heating','Cooling','Plumbing','Electrical','Roofing','Siding',
  'Landscaping','Excavating','Septic','Garage Doors','Concrete','Tree Service',
];

// ── Hero Card ─────────────────────────────────────────────────────────────────
function HeroCard() {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function activate() {
    if (active) return;
    setActive(true);
    timer.current = setTimeout(() => setActive(false), 2800);
  }

  useEffect(() => () => { clearTimeout(timer.current); }, []);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  }

  const ringStyle = (delay: number, color: string): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 160,
    height: 160,
    borderRadius: '50%',
    border: `2px solid ${color}`,
    pointerEvents: 'none',
    animation: `ring-pulse 1.1s ease-out ${delay}ms forwards`,
    zIndex: 0,
  });

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Signal rings — behind the card */}
      {active && (
        <div className="ring-animate" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={ringStyle(0,   STEEL)} />
          <div style={ringStyle(160, ORANGE)} />
          <div style={ringStyle(320, STEEL)} />
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Tap to see the save interaction"
        onClick={activate}
        onKeyDown={onKey}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 300,
          background: CARD,
          border: `2px solid ${INK}`,
          boxShadow: `8px 8px 0 ${INK}`,
          cursor: 'pointer',
          outline: 'none',
        }}
        className="focus-visible:ring-4 focus-visible:ring-offset-2"
      >
        {/* SAVED stamp overlay */}
        {active && (
          <div
            className="stamp-press"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{
                ...cond,
                fontSize: '3.6rem',
                fontWeight: 900,
                color: STAMP_RED,
                letterSpacing: '0.08em',
                border: `4px solid ${STAMP_RED}`,
                padding: '2px 14px',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}>
                SAVED
              </div>
              <div style={{ ...mono, fontSize: '0.58rem', color: STAMP_RED, marginTop: 4, letterSpacing: '0.12em' }}>
                06/21 · CONTACTS
              </div>
            </div>
          </div>
        )}

        {/* Header bar */}
        <div style={{
          background: INK, padding: '9px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ ...mono, color: MANILA, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em' }}>JOB CARD</span>
          <span style={{ ...mono, color: AMBER, fontSize: '0.68rem', fontWeight: 700 }}>No. 0147</span>
        </div>

        {/* Identity */}
        <div style={{ padding: '14px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 46, height: 46, background: ORANGE, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ ...cond, color: 'white', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.04em' }}>JR</span>
            </div>
            <div>
              <div style={{ ...sans, fontSize: '1.2rem', fontWeight: 700, color: INK, lineHeight: 1.1 }}>Jordan Reyes</div>
              <div style={{ ...mono, fontSize: '0.56rem', color: INK, marginTop: 3, letterSpacing: '0.05em' }}>
                OWNER · REYES HEATING & AIR<br />MIDLAND MI
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div style={{
            borderTop: `1.5px dashed ${INK}`, borderBottom: `1.5px dashed ${INK}`,
            padding: '7px 0', marginBottom: 12,
            display: 'flex', gap: 12,
          }}>
            <span style={{ ...mono, fontSize: '0.58rem', color: STEEL }}>Licensed ✓</span>
            <span style={{ ...mono, fontSize: '0.58rem', color: STEEL }}>Insured ✓</span>
            <span style={{ ...mono, fontSize: '0.58rem', color: STEEL }}>24/7 Service</span>
          </div>

          {/* 2×2 action grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 12 }}>
            {([
              { label: 'Call', bg: STEEL, fg: 'white',  mt: 0,  ml: 0  },
              { label: 'Text', bg: 'transparent', fg: INK, mt: 0,  ml: -2 },
              { label: 'Book', bg: 'transparent', fg: INK, mt: -2, ml: 0  },
              { label: 'Save', bg: ORANGE, fg: 'white', mt: -2, ml: -2 },
            ] as const).map(({ label, bg, fg, mt, ml }) => (
              <div key={label} style={{
                background: bg, color: fg,
                border: `2px solid ${INK}`,
                marginTop: mt, marginLeft: ml,
                padding: '8px 0', textAlign: 'center',
                ...sans, fontSize: '0.82rem', fontWeight: 600,
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Perforation */}
        <div style={{ borderTop: `2px dashed ${INK}`, margin: '0 12px' }} />

        {/* Ticket footer */}
        <div style={{ padding: '8px 12px' }}>
          <span style={{ ...mono, fontSize: '0.6rem', color: INK, letterSpacing: '0.1em', opacity: 0.7 }}>
            AIRWAVE.CARDS/REYES
          </span>
        </div>
      </div>

      <p style={{ ...mono, fontSize: '0.65rem', color: INK, marginTop: 12, opacity: 0.5, letterSpacing: '0.05em' }}>
        ↑ tap the card
      </p>
    </div>
  );
}

// ── Grid tile helper ──────────────────────────────────────────────────────────
// Collapses borders in a 2-col grid (no double lines).
// Pass `col` (0|1) and `row` (0|1) to get correct margin offsets.
function GridTile({
  label, body, col, row, bg = CARD,
}: {
  label: string; body: string; col: 0|1; row: 0|1; bg?: string;
}) {
  return (
    <div style={{
      border: `2px solid ${INK}`,
      background: bg,
      marginLeft: col === 1 ? -2 : 0,
      marginTop: row === 1 ? -2 : 0,
      padding: '28px 24px',
    }}>
      <h3 style={{ ...cond, fontWeight: 700, fontSize: '1.25rem', textTransform: 'uppercase', color: INK, marginBottom: 8 }}>
        {label}
      </h3>
      <p style={{ ...sans, fontSize: '0.95rem', color: INK, lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ background: MANILA, color: INK, ...sans }}>

      {/* ── 1. Nav ── */}
      <nav style={{ borderBottom: `2px solid ${INK}`, background: MANILA, position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span style={{ ...cond, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', userSelect: 'none' }}>
            AirWave<span style={{ color: ORANGE }}>.</span><span style={{ color: STEEL }}>cards</span>
          </span>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              style={{ ...sans, fontSize: '0.9rem', fontWeight: 600, color: INK, textDecoration: 'none' }}
              className="hover:underline"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              style={{
                ...sans, fontSize: '0.9rem', fontWeight: 600,
                background: INK, color: CARD,
                padding: '9px 20px', textDecoration: 'none',
                border: `2px solid ${INK}`,
                display: 'inline-block',
              }}
            >
              Create free card
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 2. Hero ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Card — on top on mobile, right on desktop */}
          <div className="order-1 flex justify-center lg:order-2">
            <HeroCard />
          </div>

          {/* Copy — below on mobile, left on desktop */}
          <div className="order-2 lg:order-1">
            <p style={{ ...mono, fontSize: '0.72rem', color: STEEL, letterSpacing: '0.14em', marginBottom: 16 }}>
              DIGITAL JOB CARD · BUILT FOR THE TRADES
            </p>

            <h1 style={{
              ...cond,
              fontSize: 'clamp(2.6rem, 6.5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.0,
              textTransform: 'uppercase',
              color: INK,
              marginBottom: 22,
            }}>
              Get saved in their{' '}
              <span style={{ color: STEEL }}>phone.</span>
              <br />
              Get the{' '}
              <span style={{ color: ORANGE }}>callback.</span>
            </h1>

            <p style={{ ...sans, fontSize: '1.05rem', fontWeight: 400, lineHeight: 1.65, color: INK, maxWidth: 500, marginBottom: 30 }}>
              AirWave puts your number, your reviews, and your booking on one card.
              Tap a phone, text the link, or stick the QR on the truck. The customer
              saves you in seconds — so your name is right there when the furnace quits at 2 a.m.
            </p>

            <div className="flex flex-wrap gap-3" style={{ marginBottom: 26 }}>
              <Link
                to="/signup"
                style={{
                  ...sans, fontWeight: 600, fontSize: '0.95rem',
                  background: ORANGE, color: 'white',
                  padding: '12px 24px', textDecoration: 'none',
                  border: `2px solid ${INK}`, display: 'inline-block',
                }}
              >
                Create your free card →
              </Link>
              <a
                href="#ways"
                style={{
                  ...sans, fontWeight: 600, fontSize: '0.95rem',
                  background: 'transparent', color: INK,
                  padding: '12px 24px', textDecoration: 'none',
                  border: `2px solid ${INK}`, display: 'inline-block',
                }}
              >
                See an example
              </a>
            </div>

            <div className="flex flex-wrap gap-5">
              {['Free to make', 'No app to download', 'Works on every phone'].map((f) => (
                <span key={f} style={{ ...mono, fontSize: '0.72rem', color: INK, letterSpacing: '0.04em' }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Trades ticker ── */}
      <div
        aria-hidden="true"
        style={{ borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`, background: INK, overflow: 'hidden', padding: '11px 0' }}
      >
        <div className="ticker-track">
          {[...TRADES, ...TRADES].map((trade, i) => (
            <span key={i} style={{ ...mono, color: CARD, fontSize: '0.75rem', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              <span style={{ marginRight: 14 }}>{trade}</span>
              <span style={{ color: ORANGE, marginRight: 14 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 4. What goes on it ── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 style={{ ...cond, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', color: INK, marginBottom: 32 }}>
          What goes on it
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <GridTile col={0} row={0} label="Tap to call"      body="One tap dials your number. No hunting for a contact." />
          <GridTile col={1} row={0} label="Get a quote"       body="A booking link or contact form right on the card." />
          <GridTile col={0} row={1} label="Reviews up front"  body="Link your Google or Facebook reviews where they are seen first." />
          <GridTile col={1} row={1} label="Save the contact"  body="One button adds your name, number, and email to their phone." />
        </div>
      </section>

      {/* ── 5. Three ways ── */}
      <section id="ways" style={{ background: INK, borderTop: `2px solid ${INK}` }}>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 style={{ ...cond, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', color: CARD, marginBottom: 32 }}>
            Three ways to hand it over
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {([
              {
                label: 'LINK', heading: 'Text it',
                body: 'Send the link after the estimate. Opens on any phone, no app required.',
                highlight: false,
              },
              {
                label: 'QR', heading: 'Stick it on the truck',
                body: 'Put the code on the truck, yard sign, or invoice. They scan it on the spot.',
                highlight: false,
              },
              {
                label: 'TAP', heading: 'Tap a card',
                body: 'Program a tap card or dash sticker. Their phone touches it, your card opens.',
                highlight: true,
              },
            ] as const).map(({ label, heading, body, highlight }, i) => (
              <div
                key={label}
                style={{
                  border: `2px solid ${highlight ? AMBER : '#3d3730'}`,
                  marginLeft: i > 0 ? -2 : 0,
                  padding: '28px 24px',
                  background: highlight ? '#231f1a' : 'transparent',
                  position: 'relative',
                }}
              >
                {highlight && (
                  <div style={{ ...mono, fontSize: '0.6rem', color: AMBER, letterSpacing: '0.16em', marginBottom: 8 }}>
                    — RECOMMENDED
                  </div>
                )}
                <div style={{ ...mono, fontSize: '0.68rem', color: AMBER, letterSpacing: '0.16em', marginBottom: 8 }}>
                  {label}
                </div>
                <h3 style={{ ...cond, fontWeight: 700, fontSize: '1.25rem', textTransform: 'uppercase', color: CARD, marginBottom: 10 }}>
                  {heading}
                </h3>
                <p style={{ ...sans, fontSize: '0.95rem', color: '#b0a898', lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CTA band ── */}
      <section style={{ background: STEEL, borderTop: `2px solid ${INK}` }}>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 style={{
            ...cond,
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: CARD,
            lineHeight: 1.05,
            marginBottom: 18,
            maxWidth: 700,
            marginInline: 'auto',
          }}>
            Quit handing out cards that end up in the{' '}
            <span style={{ color: AMBER }}>junk drawer.</span>
          </h2>
          <p style={{ ...sans, fontSize: '1rem', color: '#9ec4d0', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Make a card that lives on their phone. Takes about three minutes.
          </p>
          <Link
            to="/signup"
            style={{
              ...sans, fontWeight: 600, fontSize: '1rem',
              background: ORANGE, color: 'white',
              padding: '14px 30px', textDecoration: 'none',
              border: `2px solid ${INK}`, display: 'inline-block',
            }}
          >
            Create your free card →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `2px solid ${INK}`, background: MANILA, padding: '20px 0' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
          <span style={{ ...mono, fontSize: '0.68rem', color: INK, opacity: 0.55, letterSpacing: '0.1em' }}>
            AIRWAVE.CARDS
          </span>
          <span style={{ ...mono, fontSize: '0.68rem', color: INK, opacity: 0.35 }}>
            © {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}
