import Link from "next/link";

import { Bookmark, ExternalLink, MapPin, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { startOfTodayUtc } from "@/lib/jobs";
import { JOB_LEVELS } from "@/lib/levels";
import { DEADLINE_SOON_DAYS, getSavedSearches } from "@/lib/saved";

import { deleteSearch, openSearch } from "./actions";
import { SaveJobButton } from "./_components/save-job-button";

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function OfferStatus({ isActive, validThrough }: { isActive: boolean; validThrough: Date | null }) {
  const today = startOfTodayUtc();
  if (!isActive) return <Badge variant="outline">No longer listed</Badge>;
  if (!validThrough) return null;
  const left = Math.round((validThrough.getTime() - today.getTime()) / DAY_MS);
  if (left < 0) return <Badge variant="destructive">Expired</Badge>;
  if (left <= DEADLINE_SOON_DAYS) return <Badge variant="destructive">{left === 0 ? "Last day" : `${left} days left`}</Badge>;
  return <span className="text-muted-foreground text-xs">Apply by {dateFmt.format(validThrough)}</span>;
}

export default async function SavedPage() {
  const user = await getCurrentUser();
  const [searches, favorites] = await Promise.all([
    getSavedSearches(user.id),
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        jobOffer: {
          select: {
            id: true, title: true, company: true, city: true, country: true, url: true,
            level: true, isActive: true, validThrough: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your saved searches and offers. New matching offers and close deadlines also show in the bell.
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Saved searches</CardTitle>
          <CardDescription>Open a search to see its offers; its new offers then count as seen.</CardDescription>
        </CardHeader>
        <CardContent>
          {searches.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
              <Search className="size-5" />
              <p>
                No saved search yet. Filter the{" "}
                <Link href="/dashboard/jobs" className="text-foreground underline underline-offset-4">
                  job offers
                </Link>{" "}
                and choose &quot;Save this search&quot;.
              </p>
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {searches.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {s.name}
                      {s.newCount > 0 && <Badge>{s.newCount.toLocaleString("en-US")} new</Badge>}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {s.description} · {s.total.toLocaleString("en-US")} open offers
                    </p>
                  </div>
                  <form action={openSearch}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="outline" size="sm">
                      View offers
                    </Button>
                  </form>
                  <form action={deleteSearch}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Delete saved search ${s.name}`}>
                      <Trash2 />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Saved offers</CardTitle>
          <CardDescription>
            {favorites.length ? `${favorites.length} saved` : "Use the bookmark on any offer to keep it here."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
              <Bookmark className="size-5" />
              No saved offer yet.
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col divide-y">
              {favorites.map(({ jobOffer: j }) => (
                <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2.5">
                  <SaveJobButton jobId={j.id} title={j.title} saved />
                  <div className="min-w-0 flex-1">
                    {j.url ? (
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                        {j.title}
                        <ExternalLink className="text-muted-foreground ml-1 inline size-3.5 align-[-2px]" />
                      </a>
                    ) : (
                      <p className="text-sm font-medium">{j.title}</p>
                    )}
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                      {j.company && <span>{j.company} ·</span>}
                      <MapPin className="size-3" />
                      {[j.city, j.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {j.level && <Badge variant="secondary">{JOB_LEVELS[j.level].label}</Badge>}
                  <OfferStatus isActive={j.isActive} validThrough={j.validThrough} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
