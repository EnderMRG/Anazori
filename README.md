# CivicSense

CivicSense is a bilingual campus issue-management app built with Next.js, Prisma, and Neon PostgreSQL. Authentication, campus accounts, and grievances are persisted in Neon.

## Neon setup

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string from Neon. It should look similar to `postgresql://neondb_owner:password@ep-example-pooler.region.aws.neon.tech/neondb?sslmode=require`.
3. Put it in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
AUTH_SECRET="use-a-long-random-secret"
```

4. Generate Prisma Client and create the tables:

```bash
npm run db:generate
npm run db:setup
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Authentication

- `POST /api/auth/signup` creates a Neon-backed account.
- `POST /api/auth/signin` verifies the password and creates an HTTP-only session cookie.
- `GET /api/auth/me` returns the current session user.
- `POST /api/auth/signout` clears the session.

Student demo account: `arjun@dibru.ac.in` / `password123`.

Admin account for Dibrugarh University: `admin@dibrugarhuniversity.ac.in` / `DibrugarhAdmin@2026`.

## Campus and admin workflow

- Students select their campus from the searchable campus dropdown while creating an account.
- The student signup campus dropdown is loaded from the Neon `Campus` table; it only shows campuses registered by an admin.
- Admin campus names are entered as free text during admin signup and are immediately added to that Neon table.
- Student complaints are tagged with the selected campus.
- Admins choose **Campus admin** during signup and register the campus they manage.
- Admins enter an admin-only campus control room after signing in and only see/manage grievances for their registered campus.
- The Neon schema stores users, campus ownership, and grievances. The additive setup script does not drop unrelated tables already present in the Neon database.

The dashboard brand/name is clickable and returns to the landing page. The landing page provides separate sign-in and account-creation flows.
