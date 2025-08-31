import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ja_session")?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 200 });

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      authenticated: true,
      user: { username: payload.sub ?? "user" },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
