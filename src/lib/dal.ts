import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

// Valid session or redirect to /login
export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

// The logged-in user, read fresh from the database
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/login");
  return user;
});

// Admin-only pages and actions (used later for data import)
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}