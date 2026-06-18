import { emptyCard } from './types';
import type { CardDraft } from './types';

export interface Template {
  id: string;
  name: string;
  description: string;
  build: () => CardDraft;
}

export const templates: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from nothing and fill it in yourself.',
    build: () => ({ ...emptyCard }),
  },
  {
    id: 'home-services',
    name: 'Home services pro',
    description: 'Contractor or local service business. Save Contact, links, lead form.',
    build: () => ({
      ...emptyCard,
      title: 'Owner',
      company: 'Your Company',
      tagline: 'Quality work, done right, on time.',
      primary_color: '#EA580C',
      secondary_color: '#1E3A8A',
      background_color: '#EFF6FF',
      links_heading: 'What We Do',
      business_links: [
        { label: 'Get a Free Quote', url: 'https://', icon: '' },
        { label: 'Our Services', url: 'https://', icon: '' },
      ],
      extra_buttons: [
        { label: 'See Our Reviews', url: 'https://', style: 'outline', caption: '' },
      ],
      form_enabled: true,
      form_heading: 'Request a callback',
      form_subtext: 'Leave your info and we will reach out.',
      review_links: [{ label: 'Leave a Review', url: 'https://' }],
      social_links: [
        { platform: 'facebook', url: 'https://' },
        { platform: 'instagram', url: 'https://' },
      ],
      footer_text: '©2026 Your Company',
    }),
  },
  {
    id: 'realtor',
    name: 'Realtor / agent',
    description: 'Headshot, contact, listings link, scheduling, social.',
    build: () => ({
      ...emptyCard,
      title: 'Realtor',
      company: 'Your Brokerage',
      tagline: 'Helping you find the right place.',
      primary_color: '#0F766E',
      secondary_color: '#1E293B',
      background_color: '#F0FDFA',
      links_heading: 'Start Here',
      business_links: [
        { label: 'View My Listings', url: 'https://', icon: '' },
        { label: "What's My Home Worth", url: 'https://', icon: '' },
      ],
      calendar_url: 'https://',
      social_links: [
        { platform: 'instagram', url: 'https://' },
        { platform: 'facebook', url: 'https://' },
        { platform: 'linkedin', url: 'https://' },
      ],
      footer_text: '©2026 Your Name',
    }),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Name, photo, Save Contact, four contact buttons. Nothing else.',
    build: () => ({
      ...emptyCard,
      primary_color: '#111827',
      secondary_color: '#374151',
      background_color: '#F9FAFB',
    }),
  },
  {
    id: 'equipment-rental',
    name: 'Equipment / storage rental',
    description: 'Logo header, slab font, feature badges, quote form.',
    build: () => ({
      ...emptyCard,
      header_style: 'logo' as const,
      font_family: 'slab' as const,
      button_shape: 'square' as const,
      primary_color: '#C2410C',
      secondary_color: '#3F4A1C',
      background_color: '#F5F5F4',
      tagline: 'Delivering storage.\nSolving space.',
      features: [
        { icon: '🔒', label: 'Secure' },
        { icon: '🚚', label: 'Delivered to you' },
        { icon: '📦', label: 'Rent by the month' },
      ],
      links_heading: 'Get Started',
      business_links: [
        { label: 'Get a Quote', url: '', icon: '' },
        { label: 'Sizes & Pricing', url: '', icon: '' },
      ],
      form_enabled: true,
      form_heading: 'Reserve a unit',
      footer_text: '©2026 Your Rental Company',
    }),
  },
];
