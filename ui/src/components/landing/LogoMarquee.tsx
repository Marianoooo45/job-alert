// ui/src/components/landing/LogosMarquee.tsx
"use client";

type Item = { logo: string; label: string };

const BANKS: Item[] = [
  { logo: "/bank-logos/sg.png", label: "Société Générale" },
  { logo: "/bank-logos/db.png", label: "Deutsche Bank" },
  { logo: "/bank-logos/bnp.png", label: "BNP Paribas" },
  { logo: "/bank-logos/ca.png", label: "Crédit Agricole" },
  { logo: "/bank-logos/bpce.png", label: "Groupe BPCE" },
  { logo: "/bank-logos/edr.png", label: "Edmond de Rothschild" },
  { logo: "/bank-logos/hsbc.png", label: "HSBC" },
  { logo: "/bank-logos/ubs.png", label: "UBS" },
  { logo: "/bank-logos/rbc.png", label: "RBC" },
  { logo: "/bank-logos/cic.png", label: "CIC" },
  { logo: "/bank-logos/bbva.png", label: "BBVA" },
  { logo: "/bank-logos/mufg.png", label: "MUFG" },
  // … (tu peux en mettre +)
];

export default function LogoMarquee() {
  // on duplique la piste pour une boucle infinie
  const track = [...BANKS, ...BANKS];

  return (
    <section className="panel rounded-2xl px-3 py-3">
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="text-sm text-muted-foreground">Banques couvertes</div>
        <div className="text-xs text-muted-foreground/80">20+</div>
      </div>

      <div className="marquee-container">
        <ul className="marquee-track" aria-label="Liste des banques couvertes">
          {track.map((b, i) => (
            <li key={`${b.label}-${i}`} className="marquee-chip">
              {/* tu peux remplacer par <BankAvatar /> si tu veux */}
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-6 w-6 rounded-full bg-surface border border-border avatar-ring"
                  style={{
                    backgroundImage: `url(${b.logo})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-hidden
                />
                <span className="text-sm">{b.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
