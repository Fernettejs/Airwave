import type { Card } from './types';

function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function buildVCard(card: Card): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const names = card.full_name.trim().split(/\s+/);
  const last = names.length > 1 ? names[names.length - 1] : '';
  const first = names.length > 1 ? names.slice(0, -1).join(' ') : names[0] ?? '';
  lines.push(`N:${esc(last)};${esc(first)};;;`);
  lines.push(`FN:${esc(card.full_name)}`);
  if (card.company) lines.push(`ORG:${esc(card.company)}`);
  if (card.title) lines.push(`TITLE:${esc(card.title)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL,VOICE:${esc(card.phone)}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(card.email)}`);
  if (card.website_url) lines.push(`URL:${esc(card.website_url)}`);
  if (card.profile_photo_url) lines.push(`PHOTO;VALUE=URI:${card.profile_photo_url}`);
  if (card.tagline) lines.push(`NOTE:${esc(card.tagline)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function downloadVCard(card: Card): void {
  const blob = new Blob([buildVCard(card)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${card.slug || 'contact'}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
