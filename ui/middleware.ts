// ui/middleware.ts (seule modif: PUBLIC_PATHS)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register", "/api/login", "/api/register", "/api/logout"];


export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("ja_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    await jwtVerify(token, secret); // throws si invalide/expiré
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  // Protège uniquement les features + API sensibles
  matcher: [
    "/offers/:path*",
    "/dashboard/:path*",
    "/inbox/:path*",
    "/api/jobs/:path*",
  ],
};

