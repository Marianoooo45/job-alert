// Fichier: ui/src/components/JobTable.tsx — avec avatars + largeur améliorée + date relative
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { BANK_CONFIG } from "@/config/banks";
import React from "react";
import BankAvatar from "@/components/BankAvatar";

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
      {/* min-w élargie pour afficher davantage d'infos sur desktop */}
      <Table className="min-w-[1100px] table-auto">
        <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur">
          <TableRow className="border-border">
            <TableHead className="w-[52%]">Offre</TableHead>
            <TableHead className="w-[24%]">Entreprise</TableHead>
            <TableHead className="w-[14%]">Lieu</TableHead>
            <TableHead className="w-[10%] text-right">Date</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => {
            const bankInfo = (BANK_CONFIG as any)[job.source];
            const d = new Date(job.posted);
            const formattedDate = format(d, "d MMMM yyyy", { locale: fr });
            const relative = formatDistanceToNow(d, { locale: fr, addSuffix: true });

            return (
              <TableRow key={job.id} className="border-border hover:bg-surfaceMuted/60">
                {/* Offre */}
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

                {/* Entreprise (avatar + nom) */}
                <TableCell className="align-top">
                  <div className="flex items-center gap-3">
                    <BankAvatar bankId={job.source} name={job.company} />
                    <span className="font-semibold text-foreground">
                      {job.company || job.source}
                    </span>
                  </div>
                </TableCell>

                {/* Lieu */}
                <TableCell className="align-top text-muted-foreground">
                  {job.location || "-"}
                </TableCell>

                {/* Date (relative + tooltip date exacte) */}
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
