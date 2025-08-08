import Image from "next/image";

interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  date: string;
  logo?: string; // URL ou chemin du logo
}

export default function JobRow({ job }: { job: Job }) {
  return (
    <>
      <td className="p-3 flex items-center gap-3">
        {job.logo ? (
          <Image
            src={job.logo}
            alt={job.company}
            width={28}
            height={28}
            className="rounded-full border border-border"
          />
        ) : (
          <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-xs font-medium bg-muted">
            {job.company
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 3)
              .toUpperCase()}
          </div>
        )}
        <span>{job.company}</span>
      </td>
      <td className="p-3">{job.title}</td>
      <td className="p-3">{job.location}</td>
      <td className="p-3 text-sm text-muted-foreground">{job.date}</td>
    </>
  );
}
