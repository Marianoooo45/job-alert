"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import React from "react";
import { BANK_CONFIG } from "@/config/banks";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;          // ⚠️ on garde tes champs existants
  source: string;
  keyword: string;
  category?: string | null;
  contract_type?: string | null;
}

interface Props {
  jobs: Job[];
}

function Pill({ text }: { text: string }) {
  if (!text || text.toLowerCase() === "non-specifie") return null;
  return (
    <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground capitalize">
      {text}
    </span>
  );
}

export default function JobTable({ jobs }: Props) {
  if (!jobs || jobs.length === 0) {
    return <p className="text-muted-foreground p-4">Aucune offre trouvée.</p>;
  }

  const container = {
    hidden: { opacity: 1 },
    show: { opacity: 1, transition: { staggerChildren: 0.035 } },
  };
  const row = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0 },
  };

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

        <motion.tbody variants={container} initial="hidden" animate="show">
          {jobs.map((job) => {
            const bankInfo = BANK_CONFIG[job.source as keyof typeof BANK_CONFIG];

            const gradientStyle: React.CSSProperties =
              bankInfo && (bankInfo as any).gradient
                ? {
                    backgroundImage: `linear-gradient(to right, ${(bankInfo as any).gradient[0]}, ${
                      (bankInfo as any).gradient[1]
                    })`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent",
                  }
                : { color: (bankInfo as any)?.color || "inherit" };

            const formattedDate = format(new Date(job.posted), "d MMMM yyyy", { locale: fr });

            return (
              <motion.tr
                key={job.id}
                variants={row}
                className="transition-colors hover:bg-muted/40"
              >
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
                    <Pill text={job.contract_type || ""} />
                  </div>
                  {job.location && <p className="text-sm text-muted-foreground mt-1">{job.location}</p>}
                  {job.category && <p className="text-xs text-muted-foreground italic">{job.category}</p>}
                </TableCell>

                <TableCell className="align-top">
                  <span className="font-semibold" style={gradientStyle}>
                    {job.company}
                  </span>
                </TableCell>

                <TableCell className="text-right align-top text-muted-foreground">
                  {formattedDate}
                </TableCell>
              </motion.tr>
            );
          })}
        </motion.tbody>
      </Table>
    </div>
  );
}
