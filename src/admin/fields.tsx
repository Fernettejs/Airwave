import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-300"
        />
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" />
      </div>
    </Field>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  userId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  userId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setErr('');
    const ext = file.name.split('.').pop() || 'png';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('card-assets').upload(path, file, { upsert: false });
    if (error) {
      setErr(error.message);
    } else {
      const { data } = supabase.storage.from('card-assets').getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setBusy(false);
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg border border-dashed border-slate-300" />
        )}
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https:// or upload" />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {err && <span className="mt-1 block text-xs text-red-600">{err}</span>}
    </Field>
  );
}

interface RepeaterProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  blank: T;
  addLabel: string;
}

export function Repeater<T>({ items, onChange, render, blank, addLabel }: RepeaterProps<T>) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {render(item, (patch) => {
                const next = [...items];
                next[i] = { ...next[i], ...patch };
                onChange(next);
              })}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600" aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600" aria-label="Move down">↓</button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, k) => k !== i))}
                className="rounded border border-red-200 bg-white px-2 py-0.5 text-xs text-red-600"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...blank }])}
        className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        {addLabel}
      </button>
    </div>
  );
}
