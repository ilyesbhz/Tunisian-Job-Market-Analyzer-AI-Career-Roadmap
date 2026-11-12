import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const session = token ? await decrypt(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};