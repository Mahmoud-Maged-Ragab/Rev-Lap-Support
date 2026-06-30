# Support Knowledge Base

Internal support / knowledge base for documenting issues, error messages, and fixes — with a searchable public side and a secured admin side for CRUD.

## Stack

- **Next.js 14** (App Router, server components, route handlers)
- **TypeScript** strict mode
- **Tailwind CSS** — neutral, professional UI (no purple gradients, no glassmorphism)
- **JWT session auth** via `jose` (HTTP-only cookie) + `bcryptjs` for password hashing
- **Zod** for runtime input validation
- **Middleware** to gate `/admin/*` pages and mutating `/api/*` routes

## Project layout

```
src/
  middleware.ts         # auth gate for /admin and write APIs
  lib/
    db.ts               # Prisma singleton
    auth.ts             # JWT session create/read/destroy
    slug.ts             # slugify + uniqueSlug
    validation.ts       # Zod schemas + helpers
    issues.ts           # CRUD + search/list business logic
  app/
    layout.tsx          # global shell
    page.tsx            # public search homepage
    issues/[slug]/      # public issue detail
    admin/
      login/            # admin sign-in page
      layout.tsx        # admin shell w/ side nav
      page.tsx          # admin issues table
      issues/
        IssueForm.tsx
        new/
        [id]/edit/
      categories/
      tags/
    api/
      auth/login/       POST   — sign in
      auth/logout/      POST   — sign out
      issues/           GET, POST
      issues/[id]/      GET, PUT, DELETE
      categories/       GET, POST
      categories/[id]/  DELETE
      tags/             GET, POST
      tags/[id]/        DELETE
  components/
    SearchBar.tsx, FilterBar.tsx, IssueList.tsx
```

## Setup

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` via the `postinstall` script.

### 2. Create the PostgreSQL database

You need a running Postgres server:

 (Neon, Supabase, RDS, etc.) — copy the connection string they give you.

### 3. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_kb"
AUTH_SECRET="<paste output of: openssl rand -hex 32>"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="ChangeMe123!"
API_URL="http://localhost:3000/api"
```

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUTH_SECRET` | 32+ char random string used to sign JWT session cookies. **Never commit.** |
| `SEED_ADMIN_EMAIL` | Email for the seeded admin. |
| `SEED_ADMIN_PASSWORD` | Initial admin password — change after first login in production. |
| `API_URL` | Server-only internal API base. Never imported into client code. |

### 4. Run migrations

```bash
npm run db:migrate -- --name init
```

This creates `prisma/migrations/<timestamp>_init/` and applies it to your Postgres database. In production, use `npm run db:deploy` instead (which only applies, never generates).

### 5. Seed the admin user

```bash
npm run db:seed
```

This creates:
- An `Admin` row with `email = admin@example.com` and a **bcrypt-hashed** `passwordHash` for `ChangeMe123!` (override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
- A handful of categories, tags, and sample issues so search has data to find.

### 6. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>. Admin sign-in is at <http://localhost:3000/admin/login>.

## End-to-end flow (verifies the requested test plan)

1. **Admin logs in** — visit `/admin/login`, submit seed credentials. The `/api/auth/login` route checks the bcrypt hash and writes a signed HTTP-only JWT cookie. Middleware then permits `/admin/*`.
2. **Admin creates an issue** — `/admin/issues/new` posts JSON to `POST /api/issues`. Zod validates input; `createIssue()` generates a unique slug, upserts tags, and writes the issue.
3. **Issue saves to database** — Prisma persists `Issue` + `IssueTag` join rows in one transaction. The admin is redirected back to `/admin`, which re-fetches via `listIssues()`.
4. **User searches issue** — public homepage `/` calls `listIssues()` server-side. The query searches `title`, `description`, `errorMessage`, `solution`, `category.name`, and `tag.name`. Filters: category, tag. Sorts: newest, oldest, most viewed.
5. **User opens solution page** — `/issues/[slug]` server-renders the full issue (problem, error, solution, screenshots, tags, category, dates). View count increments asynchronously.

## Security model

- **`AUTH_SECRET`, `DATABASE_URL`, `API_URL` are env-only.** Nothing in `src/app/**` exports them to client components. They're consumed only inside `src/lib/*` and route handlers, which run server-side.
- **HTTP-only, `SameSite=Lax`, `Secure` (in production) cookie** holds the session JWT. Not accessible from JS.
- **`src/middleware.ts`** runs on every `/admin/*` and `/api/*` request:
  - `/admin/*` (except `/admin/login`) requires a valid session, else redirect to login.
  - `/api/*` mutation methods (`POST`/`PUT`/`PATCH`/`DELETE`) require a valid session, except `/api/auth/*`.
  - Public `GET`s on `/api/issues`, `/api/categories`, `/api/tags` are allowed (this is what powers the public site).
- **Defense in depth:** every mutating route also calls `readSession()` and 401s on its own. Don't rely on middleware alone.
- **Zod validation** on every write. No raw body trusted.
- **Bcrypt cost 12** for password hashes. Login uses a constant-ish compare against a dummy hash when the user doesn't exist, to reduce timing leaks.
- **Passwords are never logged or returned.**

## Common commands

```bash
npm run dev           # dev server
npm run build         # prod build (runs prisma generate first)
npm start             # serve the built app
npm run db:migrate    # create + apply migrations in dev
npm run db:deploy     # apply migrations in production
npm run db:seed       # seed admin + samples
npm run db:studio     # Prisma Studio GUI
npm run lint
```

## Notes on the UI

The design is deliberately understated — a neutral white background, slate text, a single accent blue for primary actions, system-stack typography, square-ish 6px corners, and minimal animation. There are no gradient hero sections, no glass cards, and no "AI-generated" landing-page aesthetic. The shell mirrors patterns you'd see in tools like Linear, GitHub Issues, or an internal admin dashboard.
