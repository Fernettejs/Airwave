alter table public.cards
  add column if not exists header_style text not null default 'photo',
  add column if not exists photo_shape  text not null default 'circle',
  add column if not exists font_family  text not null default 'sans',
  add column if not exists button_shape text not null default 'rounded',
  add column if not exists about_heading text not null default '',
  add column if not exists about_text    text not null default '',
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists gallery  jsonb not null default '[]'::jsonb;
