import { cookies } from "next/headers";
import { encrypt, decrypt, type SessionPayload } from "./jwt";

const COOKIE_NAME = "session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days, in seconds

export async function createSession(userId: number, role: SessionPayload["role"]) {
  const token = await encrypt({ userId, role });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}