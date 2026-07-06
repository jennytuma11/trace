import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearSessionCookie,
  COOKIE_NAME_EXPORT,
  verifySession,
} from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));
  const token = request.cookies.get(COOKIE_NAME_EXPORT)?.value;
  const session = token ? await verifySession(token) : null;

  if (token && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    loginUrl.searchParams.set("reason", "session-expired");
    const response = isPublic
      ? NextResponse.next()
      : pathname.startsWith("/api/")
        ? NextResponse.json(
            {
              error:
                "Your session is invalid. Please sign out and sign in again with your Supabase account.",
            },
            { status: 401 }
          )
        : NextResponse.redirect(loginUrl);
    clearSessionCookie(response);
    return response;
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublic && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
