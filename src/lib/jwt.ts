import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET is not set in .env");

const key = new TextEncoder().encode(secret);

export type SessionPayload = {
  userId: number;
  role: "USER" | "ADMIN";
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return { userId: payload.userId as number, role: payload.role as "USER" | "ADMIN" };
  } catch {
    return null; // bad signature, tampered or expired token
  }
}