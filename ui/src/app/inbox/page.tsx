// ui/src/app/inbox/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";
export const revalidate = 0; // pas de cache pour l'auth

export default async function InboxPage() {
  // On reconstruit le header Cookie à partir de cookies()
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("; ");

  let me: any = null;

  try {
    const res = await fetch("/api/me", {
      // très important : on forward les cookies de la requête
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
      // On force bien Next à ne pas mettre ça en cache
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
