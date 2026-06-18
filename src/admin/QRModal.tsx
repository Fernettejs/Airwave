import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import type { Card } from '../lib/types';

export default function QRModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${window.location.origin}/${card.slug}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 280, margin: 2 }, () => {});
    }
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${card.slug}-qr.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-900">{card.full_name || card.slug}</p>
        <p className="mt-1 break-all font-mono text-xs text-slate-500">{url}</p>
        <canvas ref={canvasRef} className="mx-auto mt-4" />
        <div className="mt-4 flex gap-2">
          <button onClick={download} className="h-10 flex-1 rounded-lg bg-slate-900 text-sm font-semibold text-white">
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
