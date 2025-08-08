"use client";

import { motion } from "framer-motion";
import JobRow from "@/components/JobRow";

interface Job {
  id: string;
  // autres propriétés si besoin
}

interface JobTableProps {
  jobs: Job[];
}

export default function JobTable({ jobs }: JobTableProps) {
  if (!jobs || jobs.length === 0) {
    return (
      <p className="text-muted-foreground p-4">
        Aucune offre trouvée.
      </p>
    );
  }

  // Variants Framer Motion pour le tableau
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 } // délai entre chaque ligne
    }
  };

  const row = {
    hidden: { opacity: 0, y: 5 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted text-sm text-muted-foreground">
            <th className="p-3 text-left">Entreprise</th>
            <th className="p-3 text-left">Poste</th>
            <th className="p-3 text-left">Localisation</th>
            <th className="p-3 text-left">Date</th>
          </tr>
        </thead>
        <motion.tbody>
          {jobs.map((job) => (
            <motion.tr
              key={job.id}
              variants={row}
              className="transition-colors hover:bg-muted/40 cursor-pointer"
            >
              <JobRow job={job} />
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </motion.div>
  );
}
