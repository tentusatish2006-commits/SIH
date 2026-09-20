# SmartRoute NER — Supabase Integration

## Architecture (UI unchanged)

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML / JS / CSS |
| Optional backend | Flask + SQLite |
| Cloud | Supabase (Postgres + Auth + Storage + Realtime) |

Data preference in `js/api.js`: **Supabase → Flask → demo fallback**. App never crashes if a key/API is missing.

## Setup steps

1. Supabase Dashboard → **SQL Editor** → run `supabase/schema.sql`
2. Confirm tables + Storage bucket `field-reports`
3. Auth → enable Email provider
4. Copy `.env.example` → `.env` (gitignored)
5. Public keys live in `js/supabase-config.js` (publishable only)

## Scripts to include

```html
<script src="js/supabase-config.js"></script>
<script src="js/supabase-client.js"></script>
<script src="js/api.js"></script>
<script src="js/supabase-auth.js"></script>
<script src="js/supabase-field-report.js"></script>
```

## Field report flow

Officer → GPS + photo → Storage `field-reports` → `field_reports` row → optional incident → map/command center.

## Security

- Browser: publishable/anon key only
- Never service_role in frontend
- RLS enabled on all tables
- Tighten insert/update for production

## Run

```bash
python -m http.server 8080
# optional: cd backend && python run.py
```
