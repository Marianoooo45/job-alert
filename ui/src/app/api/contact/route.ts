import { NextResponse } from "next/server";

const CONTACT_TO = process.env.CONTACT_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com";
const CONTACT_FROM = process.env.CONTACT_FROM || "Job Alert <noreply@notifications.jobalert.app>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { name, email, company, subject, message, website, path } = await req.json();

    // Honeypot: si rempli -> bot
    if (website) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    // Validation simple
    if (!email || !message || String(message).trim().length < 10) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const text = [
      `Nouvelle demande de contact :`,
      "",
      `Nom      : ${name || "—"}`,
      `Email    : ${email}`,
      `Société  : ${company || "—"}`,
      `Sujet    : ${subject || "—"}`,
      `Page     : ${path || "—"}`,
      "",
      message,
    ].join("\n");

    const html = text.replace(/\n/g, "<br/>");

    if (!RESEND_API_KEY) {
      // Pas de clé → on ne peut pas envoyer. Retourne 501 pour déclencher le fallback
      return NextResponse.json(
        { error: "RESEND_API_KEY manquant côté serveur" },
        { status: 501 }
      );
    }

    // Envoi via Resend API (sans dépendance)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        subject: `Contact — ${subject || "Message"}`,
        reply_to: email,
        text,
        html,
      }),
    });

    if (!r.ok) {
      const body = await r.text();
      return NextResponse.json({ error: body || "Erreur d’envoi" }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
