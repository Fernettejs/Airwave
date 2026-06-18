export interface BusinessLink {
  label: string;
  url: string;
  icon: string; // optional emoji or short text
}

export interface ExtraButton {
  label: string;
  url: string;
  style: 'solid' | 'outline';
  caption: string;
}

export interface SocialLink {
  platform: string; // facebook | instagram | tiktok | linkedin | youtube | x | other
  url: string;
}

export interface ReviewLink {
  label: string;
  url: string;
}

export interface Card {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  is_active: boolean;

  full_name: string;
  title: string;
  company: string;
  tagline: string;

  phone: string;
  sms_number: string;
  email: string;
  website_url: string;

  profile_photo_url: string;
  banner_photo_url: string;
  logo_url: string;
  youtube_id: string;
  video_heading: string;

  primary_color: string;
  secondary_color: string;
  background_color: string;

  links_heading: string;
  business_links: BusinessLink[];
  extra_buttons: ExtraButton[];
  social_links: SocialLink[];
  review_links: ReviewLink[];

  calendar_url: string;
  resources_url: string;

  form_enabled: boolean;
  form_heading: string;
  form_subtext: string;
  form_consent_text: string;
  webhook_url: string;
  form_success_message: string;

  footer_text: string;
}

export type CardDraft = Omit<Card, 'id' | 'owner_id' | 'created_at' | 'updated_at'>;

export const emptyCard: CardDraft = {
  slug: '',
  is_active: true,
  full_name: '',
  title: '',
  company: '',
  tagline: '',
  phone: '',
  sms_number: '',
  email: '',
  website_url: '',
  profile_photo_url: '',
  banner_photo_url: '',
  logo_url: '',
  youtube_id: '',
  video_heading: '',
  primary_color: '#EA580C',
  secondary_color: '#1E3A8A',
  background_color: '#EFF6FF',
  links_heading: '',
  business_links: [],
  extra_buttons: [],
  social_links: [],
  review_links: [],
  calendar_url: '',
  resources_url: '',
  form_enabled: false,
  form_heading: '',
  form_subtext: '',
  form_consent_text:
    'I consent to receive SMS communication in order to get this material. Message and data rates may apply. You can reply STOP at any time.',
  webhook_url: '',
  form_success_message: 'Sent. Check your messages.',
  footer_text: '',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const RESERVED_SLUGS = [
  'login', 'signup', 'dashboard', 'admin', 'api', 'assets',
  'auth', 'app', 'account', 'settings', 'new',
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}
