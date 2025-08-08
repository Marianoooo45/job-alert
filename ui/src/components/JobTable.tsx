// ui/src/components/JobTable.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Job } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setStatus, getAll, type AppStatus } from "@/lib/tracker";

interface JobTableProps {
  jobs: Job[];
}

export default function JobTable({ jobs }: JobTableProps) {
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});

  // Charger les statuts depuis localStorage au montage
  useEffect(() => {
    const map: Record<string, AppStatus | undefined> = {};
    getAll().forEach((j) => (map[j.id] = j.status));
    setStatusMap(map);
  }, []);

  // Marquer un job avec un statut
  function mark(job: Job, status: AppStatus) {
    setStatus(
      {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        link: job.link,
        posted: job.posted,
        source: job.source,
      },
      status
    );
    setStatusMap((s) => ({ ...s, [job.id]: status }));
  }

  // Style des boutons selon statut
  function btn(kind: AppStatus, active?: AppStatus) {
    const base = "px-2 py-1 rounded border text-xs transition-colors";
    const is = active === kind;
    if (kind === "applied")
      return `${base} ${is ? "bg-primary text-background border-primary" : "bg-surface border-border hover:border-primary"}`;
    if (kind === "shortlist")
      return `${base} ${is ? "bg-secondary text-background border-secondary" : "bg-surface border-border hover:border-secondary"}`;
    return `${base} ${is ? "bg-destructive text-background border-destructive" : "bg-surface border-border hover:border-destructive/70"}`;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Poste</TableHead>
          <TableHead>Entreprise</TableHead>
          <TableHead>Lieu</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right w-[24%]">Suivi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Aucune offre trouvée.
            </TableCell>
          </TableRow>
        ) : (
          jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="align-top font-medium">
                <Link href={job.link} target="_blank" className="text-cyan-400 hover:underline">
                  {job.title}
                </Link>
              </TableCell>
              <TableCell className="align-top">{job.company ?? "-"}</TableCell>
              <TableCell className="align-top">{job.location ?? "-"}</TableCell>
              <TableCell className="align-top">{job.posted}</TableCell>
              <TableCell className="text-right align-top">
                <div className="inline-flex gap-2">
                  <button
                    className={btn("applied", statusMap[job.id])}
                    onClick={() => mark(job, "applied")}
                  >
                    Postulé
                  </button>
                  <button
                    className={btn("shortlist", statusMap[job.id])}
                    onClick={() => mark(job, "shortlist")}
                  >
                    ⭐
                  </button>
                  <button
                    className={btn("rejected", statusMap[job.id])}
                    onClick={() => mark(job, "rejected")}
                  >
                    Refus
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
