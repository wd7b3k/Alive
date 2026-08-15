# ALIVE v3 frontend

## Требования

- Node.js `>=22.12.0`;
- npm;
- Supabase project URL;
- Supabase publishable key.

## Локальный запуск

```bash
cd projectsv2.0/products/alive/app
cp .env.example .env.local
npm install
npm run dev
```

Заполнить в `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_APP_ORIGIN=http://localhost:5173
```

`.env.local` не коммитится.

## Проверка

```bash
npm run typecheck
npm run build
```

Cloudflare Pages contract:

- Root directory: `projectsv2.0/products/alive/app`
- Build command: `npm run build`
- Build output: `dist`

## Security

В `VITE_*` запрещено помещать:

- Supabase service-role/secret key;
- Google OAuth client secret;
- database password;
- email provider tokens.

Frontend может содержать только browser-safe Supabase URL/publishable key; доступ к private data ограничивается RLS.
