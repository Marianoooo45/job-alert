import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const loggedIn = request.cookies.get("auth")?.value === "1";
  const { pathname } = request.nextUrl;

  if (
    !loggedIn &&
    (pathname.startsWith("/offers") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/inbox"))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/offers/:path*", "/dashboard/:path*", "/inbox/:path*"],
};
