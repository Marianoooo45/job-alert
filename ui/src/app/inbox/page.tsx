// ui/src/app/inbox/page.tsx
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";
export const revalidate = 0; // pas de cache pour l'auth

// Construit une base URL fiable (local, Vercel, proxy…)
async function getBaseUrl() {
  const h = await headers(); // Next 16 : headers() est async

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, "");

  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

export default async function InboxPage() {
  // Next 16 : cookies() est async
  const cookieStore = await cookies();

  // On reconstruit le header Cookie : "name=value; other=value2"
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("; ");

  const base = await getBaseUrl();

  let me: any = null;
  try {
    const res = await fetch(`${base}/api/me`, {
      // très important : on forward les cookies de la requête
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
      next: { revalidate: 0 },
    });

    me = res.ok ? await res.json().catch(() => null) : null;
  } catch {
    me = null;
  }

  const isAuthed = Boolean(me?.user || me?.authenticated);
  if (!isAuthed) {
    redirect(`/login?next=${encodeURIComponent("/inbox")}`);
  }

  return <InboxClient />;
}
