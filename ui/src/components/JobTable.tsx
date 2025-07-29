// Fichier: src/components/JobTable.tsx

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { BANK_CONFIG } from "@/config/banks";
import React from 'react';

// Interfaces et Composant Pill
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
interface Props {
  jobs: Job[];
}
function Pill({ text }: { text: string }) {
  if (!text || text.toLowerCase() === 'non-specifie') return null;
  return (
    <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground capitalize">
      {text}
    </span>
  );
}

// Composant principal JobTable
export default function JobTable({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center text-muted-foreground mt-8">
        Aucune offre ne correspond à votre recherche.
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[55%]">Offre</TableHead>
            <TableHead className="w-[25%]">Entreprise</TableHead>
            <TableHead className="text-right w-[20%]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const bankInfo = BANK_CONFIG[job.source as keyof typeof BANK_CONFIG];
            
            // --- ✨ LA CORRECTION DÉFINITIVE EST ICI ✨ ---
            // On vérifie que bankInfo ET bankInfo.gradient existent avant de créer le style.
            const gradientStyle: React.CSSProperties = (bankInfo && bankInfo.gradient) 
              ? {
                  backgroundImage: `linear-gradient(to right, ${bankInfo.gradient[0]}, ${bankInfo.gradient[1]})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent', 
                } 
              : { color: bankInfo?.color || 'inherit' }; // Fallback: utilise l'ancienne couleur si elle existe, sinon la couleur par défaut.

            const formattedDate = format(new Date(job.posted), "d MMMM yyyy", { locale: fr });

            return (
              <TableRow key={job.id}>
                <TableCell className="font-medium align-top">
                  <div>
                    <Link
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 visited:text-violet-500 hover:underline transition-colors"
                    >
                      {job.title}
                    </Link>
                    <Pill text={job.contract_type || ''} />
                  </div>
                  {job.location && (
                    <p className="text-sm text-muted-foreground mt-1">{job.location}</p>
                  )}
                  {job.category && (
                    <p className="text-xs text-muted-foreground italic">{job.category}</p>
                  )}
                </TableCell>

                <TableCell className="align-top">
                  <span className="font-semibold" style={gradientStyle}>
                    {job.company}
                  </span>
                </TableCell>

                <TableCell className="text-right align-top text-muted-foreground">
                  {formattedDate}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}