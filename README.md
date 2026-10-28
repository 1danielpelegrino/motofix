# MotoFix

MotoFix is the phone-first motorcycle service app from the supplied Figma Make file. It includes rider booking and complaint screens, shop and mechanic workflows, account sign-in, server-backed app data, evidence uploads, and an installable home-screen experience on supported mobile browsers.

## Run locally

Install the dependencies and start the web app and API together:

```powershell
pnpm install
pnpm dev
```

Open <http://localhost:8443>. The development server proxies API requests to the local MotoFix API. Do not open `index.html` directly from the file system; the React app and backend require the server. Use `pnpm build` to create the production frontend, then `pnpm start` to serve that build and the API together.

Demo accounts are seeded in development. Each uses the password `MotoFix123!`.

| Account | Email | Username |
| --- | --- | --- |
| Rider | `rider@motofix.local` | — |
| Shop owner | `owner@motofix.local` | `motohub` |
| Mechanic | `mechanic@motofix.local` | `marco` |

## Phone use

Open the site in the phone browser and choose **Add to Home Screen** (or the browser’s equivalent). The page uses a responsive layout, safe-area spacing, and dedicated app icons. This project does not package an Android APK or iOS App Store app.

## Server settings and data

Copy `.env.example` to `.env` to configure the XAMPP MySQL connection, server ports, and optional Google sign-in integration. The Node server reads `.env` at startup. The default database settings target XAMPP's local MySQL/MariaDB service and the existing `motofix_database` database. If your MySQL `root` account has a password, put it in `DB_PASSWORD`. Start MySQL in the XAMPP Control Panel before starting MotoFix.

Account records, sessions, app state, upload metadata, support tickets, and password reset requests are stored in the original six `motofix_*` tables. The backend also maintains `motofix_motorcycles`, `motofix_bookings`, `motofix_complaints`, `motofix_conversations`, `motofix_messages`, and `motofix_notifications` as queryable tables derived from the app-state records. These tables are backfilled on startup and updated in the same transaction when app state changes, so the current API and screens continue to work while the records are available by type. On the first start with an empty database, existing records from `server/data/motofix.json` are copied into MySQL; the local JSON file and uploaded files are retained. Upload contents remain in `server/data/uploads/`. In production, set `NODE_ENV=production`; demo accounts are then disabled unless `MOTOFIX_DEMO_ACCOUNTS=true` is explicitly set. Back up the database and upload folder before deploying or handling real customer data.

Password recovery emails use SMTP. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `.env`, then restart MotoFix. Use the sender address allowed by your mail provider. Set `APP_ORIGIN` to the browser-reachable base URL; links using `localhost` work only on the same computer, so phone access needs a LAN or deployed HTTPS address. Reset links expire after 30 minutes, can only be used once, and changing a password signs the account out of other sessions. **Sign up with Google** creates a new rider or shop account after the user chooses an account type and completes Google's authorization; an existing matching account can sign in through the same flow. To enable it, create a Google OAuth Web client, add `http://localhost:8443` as an authorized JavaScript origin and `http://localhost:8443/api/auth/google/callback` as an authorized redirect URI, then put the client ID and secret in `.env` and restart MotoFix. Keep the client secret private. For a deployed site, use its HTTPS origin and matching callback URL instead.
