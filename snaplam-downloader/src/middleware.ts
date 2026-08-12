import { NextRequest, NextResponse } from "next/server";

// Lightweight edge guard. With NextAuth database sessions we can't fully
// validate the session at the edge, so this only checks for the presence of
// a session cookie and does a fast redirect for anonymous visitors.
// Authoritative admin gating happens server-side in /admin/page.tsx.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasSession =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("next-auth.session-token") ||
      req.cookies.has("__Secure-next-auth.session-token");

    if (!hasSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
