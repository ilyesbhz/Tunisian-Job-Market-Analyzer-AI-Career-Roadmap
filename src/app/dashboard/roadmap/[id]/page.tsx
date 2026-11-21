import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Check, ExternalLink, Flag, Lightbulb, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { JOB_LEVELS } from "@/lib/levels";
import { CAREER_STATUSES, type MarketFacts, type RoadmapInput, type RoadmapPlan } from "@/lib/roadmap/schema";

import { deleteRoadmap } from "../actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function RoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId: user.id } });
  if (!roadmap) notFound();

  const input = roadmap.input as RoadmapInput;
  const market = roadmap.market as MarketFacts;
  const plan = roadmap.plan as RoadmapPlan;
  const missing = market.topSkills.filter((s) => !s.has);
  const jobsLink = `/dashboard/jobs?${new URLSearchParams({ q: roadmap.targetRole, country: input.country })}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/dashboard/roadmap">
              <ArrowLeft /> All roadmaps
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{roadmap.targetRole}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {CAREER_STATUSES[input.status]?.label} · {input.country} · created {dateFmt.format(roadmap.createdAt)}
          </p>
        </div>
        <form action={deleteRoadmap}>
          <input type="hidden" name="id" value={roadmap.id} />
          <Button type="submit" variant="outline" size="sm">
            <Trash2 /> Delete
          </Button>
        </form>
      </div>

      <Card className="from-primary/5 to-card bg-linear-to-t shadow-xs">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6">{plan.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {/* The plan, as a vertical timeline */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Your roadmap</CardTitle>
            <CardDescription>{plan.phases.length} phases, in order</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-6">
              {plan.phases.map((phase, i) => (
                <li key={`${i}-${phase.title}`} className="relative flex gap-4">
                  {i < plan.phases.length - 1 && (
                    <span aria-hidden className="bg-border absolute top-8 bottom-[-1.5rem] left-[0.9375rem] w-px" />
                  )}
                  <span className="bg-primary text-primary-foreground relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{phase.title}</h3>
                      <Badge variant="secondary">{phase.duration}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{phase.goal}</p>
                    {phase.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {phase.skills.map((s) => (
                          <Badge key={s} variant="outline">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {phase.actions.length > 0 && (
                      <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm">
                        {phase.actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                    {phase.milestone && (
                      <p className="mt-3 flex items-start gap-2 text-sm">
                        <Flag className="text-primary mt-0.5 size-4 shrink-0" />
                        <span>
                          <span className="font-medium">Milestone:</span> {phase.milestone}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Market facts: computed from the offers, not by the AI */}
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Skill gap</CardTitle>
              <CardDescription>
                {market.matchingOffers > 0
                  ? `From ${market.matchingOffers.toLocaleString("en-US")} matching offers in ${input.country}`
                  : `No matching offers in ${input.country}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {market.skillData && market.topSkills.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {market.topSkills.map((s) => (
                    <li key={s.name} className="flex items-center gap-2 text-sm">
                      {s.has ? (
                        <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="You have it" />
                      ) : (
                        <X className="text-muted-foreground size-4 shrink-0" aria-label="To learn" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">{s.share}% of offers</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Skill data is only extracted for Tunisian offers, so this plan uses general knowledge of the role
                  for skills.
                </p>
              )}
              {market.skillData && missing.length === 0 && market.topSkills.length > 0 && (
                <p className="mt-3 text-sm">You already have every top skill. Nice work.</p>
              )}
            </CardContent>
          </Card>

          {market.salaryByLevel.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Salary by level</CardTitle>
                <CardDescription>Average of matching offers, TND per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {market.salaryByLevel.map((s) => (
                    <li key={s.level} className="flex items-center justify-between gap-2">
                      <span>{JOB_LEVELS[s.level].label}</span>
                      <span className="tabular-nums">
                        <span className="font-medium">{s.avgTnd.toLocaleString("en-US")} TND</span>{" "}
                        <span className="text-muted-foreground text-xs">({s.n} offers)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {plan.tips.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="size-4" /> Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                  {plan.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Offers for your next step</CardTitle>
          <CardDescription>Open offers matching your target role and level</CardDescription>
        </CardHeader>
        <CardContent>
          {market.nextOffers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open offers match right now.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {market.nextOffers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{o.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {[o.company, o.location].filter(Boolean).join(" · ")}
                      {o.validThrough ? ` · apply by ${dateFmt.format(new Date(o.validThrough))}` : ""}
                    </p>
                  </div>
                  {o.level && <Badge variant="secondary">{JOB_LEVELS[o.level].label}</Badge>}
                  {o.url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={o.url} target="_blank" rel="noreferrer">
                        View <ExternalLink />
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="link" className="mt-2 px-0">
            <Link href={jobsLink}>See all matching offers</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Skill gap, salaries and offers come from the job offers in our database. The roadmap itself is written by an
        AI model ({roadmap.model}) and can contain mistakes: use it as a guide, not as advice.
      </p>
    </div>
  );
}
