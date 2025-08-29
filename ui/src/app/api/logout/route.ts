import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set("ja_session", "", { path: "/", maxAge: 0 });
  return res;
}
