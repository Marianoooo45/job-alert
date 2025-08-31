// ui/src/app/inbox/page.tsx

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import InboxClient from "./InboxClient";

// Ne jamais mettre "use client" ici : c'est un composant serveur.
// Il fait la vérification d'auth côté serveur avant de rendre le client.
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const cookieHeader = cookies().toString();
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  }).catch(() => null);

  const me = res && res.ok ? await res.json().catch(() => null) : null;
  const isAuthed = Boolean(me?.user || me?.authenticated);

  if (!isAuthed) {
    redirect(`/login?next=${encodeURIComponent("/inbox")}`);
  }

  // Si connecté -> on rend ton composant client tel qu’il était
  return <InboxClient />;
}
