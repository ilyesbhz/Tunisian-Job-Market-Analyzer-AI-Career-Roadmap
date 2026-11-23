"use client";

import Link from "next/link";

import { Bell, BellOff, CalendarClock, CircleSlash, Sparkles } from "lucide-react";

import { openSearch } from "@/app/dashboard/saved/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Notification } from "@/lib/saved";

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-3 py-2.5">
      <span className="bg-muted text-muted-foreground mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border [&_svg]:size-3.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function NotificationsBell({ notifications }: { notifications: Notification[] }) {
  const count = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count ? `Notifications: ${count} new` : "Notifications: nothing new"}
        >
          <Bell />
          {count > 0 && (
            <span className="bg-destructive absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          <Link href="/dashboard/saved" className="text-muted-foreground hover:text-foreground text-xs">
            Saved jobs &amp; searches
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-8 text-center text-sm">
            <BellOff className="size-5" />
            Nothing new. Save offers and searches to get reminders and alerts here.
          </div>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.key}>
                {n.kind === "new-offers" && (
                  <Row icon={<Sparkles />}>
                    <p>
                      <span className="font-medium">{n.count.toLocaleString("en-US")} new</span>{" "}
                      {n.count === 1 ? "offer matches" : "offers match"} <span className="font-medium">{n.name}</span>
                    </p>
                    <form action={openSearch} className="mt-1">
                      <input type="hidden" name="id" value={n.searchId} />
                      <button type="submit" className="text-primary text-xs font-medium hover:underline">
                        View offers
                      </button>
                    </form>
                  </Row>
                )}
                {n.kind === "deadline" && (
                  <Row icon={<CalendarClock />}>
                    <p>
                      <span className="font-medium">{n.daysLeft === 0 ? "Last day" : `${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"} left`}</span>{" "}
                      to apply to <span className="font-medium">{n.title}</span>
                    </p>
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer" className="text-primary mt-1 inline-block text-xs font-medium hover:underline">
                        Open the offer
                      </a>
                    )}
                  </Row>
                )}
                {n.kind === "closed" && (
                  <Row icon={<CircleSlash />}>
                    <p>
                      A saved offer has closed: <span className="font-medium">{n.title}</span>
                    </p>
                  </Row>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
