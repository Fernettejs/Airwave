/*
# Add optional review request settings to cards

1. New columns on `public.cards`
- `review_enabled` (boolean): controls whether the review request section appears on the public card.
- `review_google_url` (text): the card owner's Google Business Profile review URL.
- `review_heading` (text): optional heading shown above the review actions.
- `review_subtext` (text): optional supporting text shown below the heading.
- `review_sms_message` (text): message template used when a visitor chooses text.
- `review_email_subject` (text): subject used when a visitor chooses email.
- `review_email_message` (text): message template used when a visitor chooses email.

2. Existing data
- Existing cards keep their current appearance because review requests default to disabled.
- Existing `review_links` data remains unchanged and continues to be supported.

3. Security
- No new tables are introduced.
- Existing cards row-level security policies continue to protect the new settings with the card row.

4. Template fields
- Message templates may use `{{name}}`, `{{company}}`, and `{{review_link}}`; these are replaced on the public card before opening SMS or email.
*/

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS review_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_google_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_heading text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_subtext text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_sms_message text NOT NULL DEFAULT 'Got a minute for a quick review? Sharing your experience helps us reach and serve our community. {{review_link}}',
  ADD COLUMN IF NOT EXISTS review_email_subject text NOT NULL DEFAULT 'Would you share your experience with {{company}}?',
  ADD COLUMN IF NOT EXISTS review_email_message text NOT NULL DEFAULT 'Got a minute for a quick review? Sharing your experience helps us reach and serve our community. {{review_link}}';