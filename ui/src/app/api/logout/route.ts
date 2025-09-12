// ui/src/app/api/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), { status: 303 });

  // Effacement robuste : mêmes attributs que lors du set
  res.cookies.set("ja_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // L’un des deux suffit, je mets les deux pour blindage cross-browser
    maxAge: 0,
    expires: new Date(0),
  });

  // (optionnel) éviter tout cache
  res.headers.set("Cache-Control", "no-store");

  return res;
}
