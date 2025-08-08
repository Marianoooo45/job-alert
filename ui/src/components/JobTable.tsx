// Fichier: ui/src/components/JobTable.tsx — PRO (large + sans "Source" + dates humaines)
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { BANK_CONFIG } from "@/config/banks";
import React from "react";

interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
  keyword: string;
  category?: string | null;
  contract_type?: string | null;
}
interface Props { jobs: Job[]; }

function Pill({ text }: { text: string }) {
  if (!text || text.toLowerCase() === "non-specifie") return null;
  return (
    <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
      {text}
    </span>
  );
}

export default function JobTable({ jobs }: Props) {
  if (jobs.length === 0) {
    return <div className="text-center text-muted-foreground mt-8">Aucune offre ne correspond à votre recherche.</div>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
      {/* min-w élargie pour afficher plus d’infos */}
      <Table className="min-w-[1100px] table-auto">
        <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur">
          <TableRow className="border-border">
            <TableHead className="w-[50%]">Offre</TableHead>
            <TableHead className="w-[22%]">Entreprise</TableHead>
            <TableHead className="w-[16%]">Lieu</TableHead>
            <TableHead className="w-[12%] text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const bankInfo = BANK_CONFIG[job.source as keyof typeof BANK_CONFIG];

            const gradientStyle: React.CSSProperties =
              bankInfo && (bankInfo as any).gradient
                ? {
                    backgroundImage: `linear-gradient(to right, ${(bankInfo as any).gradient[0]}, ${(bankInfo as any).gradient[1]})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent",
                  }
                : { color: (bankInfo as any)?.color || "inherit" };

            const d = new Date(job.posted);
            const formattedDate = format(d, "d MMMM yyyy", { locale: fr });
            const relative = formatDistanceToNow(d, { locale: fr, addSuffix: true });

            return (
              <TableRow key={job.id} className="border-border hover:bg-surfaceMuted/60">
                <TableCell className="align-top">
                  <div className="font-medium leading-snug">
                    <Link
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 visited:text-violet-500 hover:underline transition-colors"
                    >
                      {job.title}
                    </Link>
                    <Pill text={job.contract_type || ""} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground space-x-2">
                    {job.category && <span className="italic">{job.category}</span>}
                    {job.keyword && <span className="opacity-80">• {job.keyword}</span>}
                  </div>
                </TableCell>

                <TableCell className="align-top">
                  <span className="font-semibold" style={gradientStyle}>
                    {job.company}
                  </span>
                </TableCell>

                <TableCell className="align-top text-muted-foreground">{job.location || "-"}</TableCell>

                <TableCell className="align-top text-right text-muted-foreground">
                  <span title={formattedDate}>{relative}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
