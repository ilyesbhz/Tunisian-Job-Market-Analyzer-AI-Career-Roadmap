import Link from "next/link";

import { Bookmark, Route, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getFilterOptions } from "@/lib/jobs";
import { CAREER_STATUSES } from "@/lib/roadmap/schema";
import { getInitials } from "@/lib/utils";

import { AccountForm, CareerForm, PasswordForm } from "./_components/profile-forms";

const dateFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

function Stat({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: number }) {
  return (
    <Link href={href} className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-muted text-muted-foreground grid size-8 place-items-center rounded-lg border [&_svg]:size-4">
        {icon}
      </span>
      <span>
        <span className="block text-lg leading-none font-medium tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </span>
    </Link>
  );
}

export default async function ProfilePage() {
  const { id } = await getCurrentUser();
  const [user, { countries }] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        name: true, email: true, role: true, createdAt: true,
        careerStatus: true, targetRole: true, preferredCountry: true, skills: true,
        _count: { select: { favorites: true, savedSearches: true, roadmaps: true } },
      },
    }),
    getFilterOptions(),
  ]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card className="from-primary/5 to-card bg-linear-to-t shadow-xs">
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14 rounded-xl text-lg">
            <AvatarFallback className="rounded-xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {user.email} · member since {dateFmt.format(user.createdAt)}
              {user.careerStatus && <Badge variant="secondary">{CAREER_STATUSES[user.careerStatus].label}</Badge>}
              {user.role === "ADMIN" && <Badge>Admin</Badge>}
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <Stat href="/dashboard/saved" icon={<Bookmark />} label="Saved offers" value={user._count.favorites} />
            <Stat href="/dashboard/saved" icon={<Search />} label="Saved searches" value={user._count.savedSearches} />
            <Stat href="/dashboard/roadmap" icon={<Route />} label="Roadmaps" value={user._count.roadmaps} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Career profile</CardTitle>
            <CardDescription>Used to pre-fill your AI career roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            <CareerForm
              countries={countries}
              profile={{
                careerStatus: user.careerStatus,
                targetRole: user.targetRole,
                preferredCountry: user.preferredCountry,
                skills: user.skills,
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your name and the email you log in with.</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountForm name={user.name} email={user.email} />
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>At least 8 characters, with a letter and a digit.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
