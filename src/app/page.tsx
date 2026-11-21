import Link from "next/link";
import { ArrowRight, BarChart3, BriefcaseBusiness, Globe2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-muted/40 text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="size-5" />
            </span>
            Job Analyzer
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <section>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Globe2 className="size-3.5" />
            Tunisia and international markets
          </p>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Understand the job market before your next move.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Explore opportunities, compare sectors and locations, and view salary trends across Tunisia and abroad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted">
              Log in
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-sm font-semibold">Market overview</p>
              <p className="mt-1 text-xs text-muted-foreground">Latest imported offers</p>
            </div>
            <BriefcaseBusiness className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Job offers", "Daily sync"],
              ["Sectors", "Market insights"],
              ["Locations", "Local & abroad"],
              ["Salaries", "TND monthly"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}