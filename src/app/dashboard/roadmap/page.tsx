import Link from "next/link";

import { ChevronRight, Route } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getFilterOptions } from "@/lib/jobs";
import { CAREER_STATUSES, type RoadmapInput } from "@/lib/roadmap/schema";

import { RoadmapForm } from "./_components/roadmap-form";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function RoadmapPage() {
  const user = await getCurrentUser();
  const [{ countries }, profile, roadmaps] = await Promise.all([
    getFilterOptions(),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { careerStatus: true, targetRole: true, preferredCountry: true, skills: true },
    }),
    prisma.roadmap.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, targetRole: true, input: true, createdAt: true },
    }),
  ]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI career roadmap</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tell us where you are and where you want to go. We compare your skills with real job offers, then an AI
          model writes a step-by-step plan.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              The more precise the target role, the better the matching offers.{" "}
              {profile.targetRole || profile.skills.length ? (
                <>Pre-filled from your <Link href="/dashboard/profile" className="text-foreground underline underline-offset-4">profile</Link>.</>
              ) : (
                <>Tip: fill in your <Link href="/dashboard/profile" className="text-foreground underline underline-offset-4">profile</Link> to skip this next time.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoadmapForm
              countries={countries}
              defaults={{
                status: profile.careerStatus,
                targetRole: profile.targetRole,
                country: profile.preferredCountry && countries.includes(profile.preferredCountry) ? profile.preferredCountry : null,
                skills: profile.skills,
              }}
            />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Your roadmaps</CardTitle>
            <CardDescription>Saved so you can come back to them.</CardDescription>
          </CardHeader>
          <CardContent>
            {roadmaps.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
                <Route className="size-6" />
                No roadmap yet. Fill in your profile to create the first one.
              </div>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {roadmaps.map((r) => {
                  const input = r.input as RoadmapInput;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/roadmap/${r.id}`}
                        className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.targetRole}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {CAREER_STATUSES[input.status]?.label} · {input.country} · {dateFmt.format(r.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
