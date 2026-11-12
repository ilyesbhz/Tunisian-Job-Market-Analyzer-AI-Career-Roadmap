# Tunisian Job Market Analyzer

## Importing jobs from the ML pipeline

The ML project and this app use separate PostgreSQL databases. Do not point the
app's `DATABASE_URL` at the ML database: the ML schema is different from the
Prisma schema used by this app.

The ML exporter already produces the JSON format expected by this project:

```powershell
cd C:\Users\ilyesbhz\Downloads\export-jobs
python -m src.export.export_jobs
```

Copy the resulting `exports\jobs.json` to
`C:\Users\ilyesbhz\Desktop\9raya\web\job-analyzer\data\jobs.json`, or configure
the ML project's `APP_DATA_DIR` to
`C:\Users\ilyesbhz\Desktop\9raya\web\job-analyzer\data` so it writes there
automatically.

Then configure this project's `.env` with the app database connection:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Apply migrations and import the file:

```powershell
cd C:\Users\ilyesbhz\Desktop\9raya\web\job-analyzer
npx prisma migrate deploy
npm run import:jobs
```

To import a different JSON file without replacing `data\jobs.json`:

```powershell
npm run import:jobs -- C:\path\to\jobs.json
```

The importer validates each record, upserts sources and offers using
`source + externalId`, and reports invalid records without inserting them.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# Tunisian-Job-Market-Analyzer-AI-Career-Roadmap" 
