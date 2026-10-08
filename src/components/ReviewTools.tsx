import { useState } from 'react';
import { supabase } from '../lib/supabase';
import QRCode from 'qrcode';
import type { Card } from '../lib/types';

function safeHttpUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : '';
}

function fillTemplate(template: string, card: Card, reviewLink: string): string {
  return template
    .split('{{name}}').join(card.full_name)
    .split('{{company}}').join(card.company || card.full_name)
    .split('{{review_link}}').join(reviewLink);
}

export default function ReviewTools({ card }: { card: Card }) {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const reviewUrl = safeHttpUrl(card.review_google_url || '');
  if (!reviewUrl) return null;

  const hasPasscode = card.review_passcode_hash && card.review_passcode_hash.length > 0;

  const smsMessage = fillTemplate(card.review_sms_message || '', card, reviewUrl);
  const emailSubject = fillTemplate(card.review_email_subject || '', card, reviewUrl);
  const emailMessage = fillTemplate(card.review_email_message || '', card, reviewUrl);

  const canSendSms = Boolean(smsMessage && phone.trim());
  const canSendEmail = Boolean(emailMessage && email.trim());

  const smsHref = canSendSms
    ? `sms:${phone.trim()}?&body=${encodeURIComponent(smsMessage)}`
    : undefined;
  const emailHref = canSendEmail
    ? `mailto:${email.trim()}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`
    : undefined;

  async function verify() {
    if (!passcode.trim() || verifying) return;
    setVerifying(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_review_passcode', {
        p_slug: card.slug,
        p_passcode: passcode.trim(),
      });
      if (rpcError) throw rpcError;
      if (data === true) {
        setUnlocked(true);
        setError('');
      } else {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(`Incorrect passcode. ${5 - next} attempts remaining.`);
        }
        setPasscode('');
      }
    } catch {
      setError('Could not verify. Please try again.');
    }
    setVerifying(false);
  }

  // If no passcode is set, don't show the tools at all
  if (!hasPasscode) return null;

  // ── Passcode entry ──────────────────────────────────────────────────────
  if (!unlocked) {
    const locked = attempts >= 5;
    return (
      <div className="cv-card mt-6 p-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--cv-secondary) 12%, white)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cv-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-800">Review tools</p>
        <p className="mt-1 text-xs text-slate-500">Enter your passcode to access review request tools.</p>
        <div className="mt-4 flex gap-2">
          <input
            type="password"
            inputMode="numeric"
            className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-center text-base font-medium tracking-widest outline-none focus:border-[var(--cv-secondary)] focus:ring-2 focus:ring-[var(--cv-secondary)]/20"
            value={passcode}
            onChange={(e) => { setPasscode(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !locked) verify(); }}
            placeholder="••••"
            disabled={locked}
            maxLength={20}
          />
          <button
            onClick={verify}
            disabled={verifying || locked || !passcode.trim()}
            className="h-11 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--cv-primary)' }}
          >
            {verifying ? '…' : 'Unlock'}
          </button>
        </div>
        {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  // ── Unlocked: show review tools ─────────────────────────────────────────
  return (
    <>
      <div className="cv-card mt-6 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Review tools</p>
          <button
            onClick={() => setUnlocked(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Lock
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Customer phone</span>
            <input
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] outline-none focus:border-[var(--cv-secondary)] focus:ring-2 focus:ring-[var(--cv-secondary)]/20"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </label>
          <a
            href={smsHref}
            onClick={(e) => { if (!canSendSms) e.preventDefault(); }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-40"
            style={{ backgroundColor: 'var(--cv-primary)', borderRadius: 'var(--cv-btn-radius)', pointerEvents: canSendSms ? 'auto' : 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Send by text
          </a>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Customer email</span>
            <input
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] outline-none focus:border-[var(--cv-secondary)] focus:ring-2 focus:ring-[var(--cv-secondary)]/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </label>
          <a
            href={emailHref}
            onClick={(e) => { if (!canSendEmail) e.preventDefault(); }}
            className="flex h-11 w-full items-center justify-center gap-2 border bg-white text-[15px] font-semibold shadow-sm transition-transform active:scale-[0.99] disabled:opacity-40"
            style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)', borderRadius: 'var(--cv-btn-radius)', pointerEvents: canSendEmail ? 'auto' : 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
            Send by email
          </a>

          <button
            onClick={() => setShowQR(true)}
            className="flex h-11 w-full items-center justify-center gap-2 border bg-white text-[15px] font-semibold shadow-sm transition-transform active:scale-[0.99]"
            style={{ borderColor: 'var(--cv-secondary)', color: 'var(--cv-secondary)', borderRadius: 'var(--cv-btn-radius)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17 17v.01" />
            </svg>
            Show QR code
          </button>
        </div>
      </div>

      {showQR && (
        <QRModalInline url={reviewUrl} onClose={() => setShowQR(false)} />
      )}
    </>
  );
}

function QRModalInline({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-900">Google review QR code</p>
        <p className="mt-1 break-all font-mono text-xs text-slate-500">{url}</p>
        <QRCodeCanvas url={url} />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const canvas = document.getElementById('review-qr-canvas') as HTMLCanvasElement | null;
              if (canvas) {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'review-qr.png';
                a.click();
              }
            }}
            className="h-10 flex-1 rounded-lg bg-slate-900 text-sm font-semibold text-white"
          >
            Download PNG
          </button>
          <button onClick={onClose} className="h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function QRCodeCanvas({ url }: { url: string }) {
  const ref = useState<HTMLCanvasElement | null>(null);
  const canvasRef = { current: ref[0] } as React.MutableRefObject<HTMLCanvasElement | null>;
  const setCanvas = ref[1];

  if (typeof document !== 'undefined') {
    queueMicrotask(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, { width: 280, margin: 2 }, () => {});
      }
    });
  }

  return <canvas id="review-qr-canvas" ref={setCanvas} className="mx-auto mt-4" />;
}
