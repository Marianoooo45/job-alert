"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BankAvatar from "@/components/BankAvatar";
import JobTimeline from "@/components/JobTimeline";
import CalendarModal from "@/components/CalendarModal";
import { getAll, setStage, incInterviews, type SavedJob } from "@/lib/tracker";
import { BANKS_LIST } from "@/config/banks";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, TrendingUp, Archive, Activity, LayoutDashboard, Clock } from "lucide-react";

/* ... Helpers inchangés ... */
function timeAgo(ts?: number | string) { if (!ts) return "-"; const d = new Date(Number(ts)); const diff = Date.now() - d.getTime(); const days = Math.floor(diff / (1000 * 60 * 60 * 24)); if(days === 0) return "Aujourd'hui"; if(days === 1) return "Hier"; return `Il y a ${days}j`; }
function resolveBankId(company?: string | null, source?: string | null): string | undefined { const norm = (s:string) => s.toLowerCase().replace(/[^a-z0-9]/g,""); const target = norm(company || source || ""); return BANKS_LIST.find(b => target.includes(norm(b.name)) || norm(b.name).includes(target))?.id; }

type View = "favs" | "applied";

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  const [view, setView] = useState<View>("applied");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});

  useEffect(() => { setItems(getAll()); }, []);

  const appliedAll = useMemo(() => items.filter(i => i.status === "applied"), [items]);
  const favs = useMemo(() => items.filter(i => i.status === "shortlist"), [items]);
  const displayItems = view === "favs" ? favs : appliedAll;

  /* KPIs */
  const kpis = useMemo(() => {
    const active = appliedAll.filter(j => (j.stage??"applied") !== "rejected").length;
    const interviews = appliedAll.reduce((acc, curr) => acc + (curr.interviews || 0), 0);
    const rejected = appliedAll.length - active;
    const rate = appliedAll.length ? Math.round((interviews / appliedAll.length) * 100) : 0;
    return { active, interviews, rejected, rate };
  }, [appliedAll]);

  /* Chart Data */
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    appliedAll.forEach(j => { if(!j.appliedAt) return; const d = new Date(Number(j.appliedAt)).toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit"}); map.set(d, (map.get(d)||0) + 1); });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count })).slice(-7);
  }, [appliedAll]);

  return (
    <main className="min-h-screen w-full px-4 pt-32 pb-8 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Command Center
            </h1>
            <p className="text-muted-foreground mt-1">Vue d'ensemble de vos processus de recrutement.</p>
          </div>
          
          <div className="flex items-center bg-surface-muted rounded-lg p-1 border border-border">
            <button onClick={()=>setView("applied")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view==="applied" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Candidatures</button>
            <button onClick={()=>setView("favs")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view==="favs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Favoris</button>
          </div>
        </div>

        {/* KPIS */}
        {view === "applied" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Process Actifs" value={kpis.active} icon={Activity} color="text-emerald-500" bg="bg-emerald-500/10" />
            <KpiCard label="Entretiens" value={kpis.interviews} icon={Clock} color="text-blue-500" bg="bg-blue-500/10" />
            <KpiCard label="Taux Conversion" value={`${kpis.rate}%`} icon={TrendingUp} color="text-purple-500" bg="bg-purple-500/10" />
            <KpiCard label="Refus" value={kpis.rejected} icon={Archive} color="text-muted-foreground" bg="bg-foreground/5" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN TABLE */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-semibold text-foreground">{view === "applied" ? "Suivi des Candidatures" : "Liste des Favoris"}</h3>
              <button onClick={()=>setCalendarOpen(true)} className="text-xs flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><CalendarIcon className="w-4 h-4" /> Calendrier</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground bg-surface-muted/50 font-medium">
                  <tr>
                    <th className="px-6 py-3">Poste</th>
                    <th className="px-6 py-3">Banque</th>
                    {view === "applied" && <th className="px-6 py-3">Statut</th>}
                    {view === "applied" && <th className="px-6 py-3 text-center">Rounds</th>}
                    <th className="px-6 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayItems.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucune donnée.</td></tr>
                  ) : (
                    displayItems.map(job => (
                      <motion.tr key={job.id} initial={{ opacity:0 }} animate={{ opacity:1 }} className="group hover:bg-surface-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={job.link} target="_blank" className="font-medium text-foreground hover:text-primary transition-colors block max-w-[220px] truncate">{job.title}</Link>
                          <button onClick={()=>setOpenTimeline(p=>({...p,[job.id]:!p[job.id]}))} className="text-[10px] text-muted-foreground uppercase tracking-wider hover:text-primary mt-1">{openTimeline[job.id] ? "Masquer" : "Timeline"}</button>
                          {openTimeline[job.id] && <div className="mt-2"><JobTimeline job={job} /></div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <BankAvatar bankId={resolveBankId(job.company, job.source)} name={job.company} size={24} className="rounded-md opacity-80" />
                            <span className="text-muted-foreground truncate max-w-[120px]">{job.company || job.source}</span>
                          </div>
                        </td>
                        {view === "applied" && (
                          <td className="px-6 py-4">
                            <select value={job.stage || "applied"} onChange={(e)=> { setStage(job.id, e.target.value as any); setItems(getAll()); }} className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-primary outline-none">
                              {["applied","phone","interview","offer","rejected"].map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                        )}
                        {view === "applied" && (
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                              <button onClick={()=>{if((job.interviews||0)>0){incInterviews(job.id, -1); setItems(getAll())}}} className="px-2 py-1 hover:bg-surface-muted text-muted-foreground">-</button>
                              <span className="px-2 text-foreground font-mono">{job.interviews || 0}</span>
                              <button onClick={()=>{incInterviews(job.id, 1); setItems(getAll())}} className="px-2 py-1 hover:bg-surface-muted text-muted-foreground">+</button>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">{timeAgo(job.appliedAt || job.posted)}</td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDEBAR WIDGETS */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-6">Activité</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
                    <Tooltip cursor={{fill:'transparent'}} contentStyle={{backgroundColor:'var(--color-surface)', borderColor:'var(--color-border)', color:'var(--color-text)'}} itemStyle={{color:'var(--color-text)'}} />
                    <XAxis dataKey="date" tick={{fontSize:10, fill:'var(--color-text-muted)'}} axisLine={false} tickLine={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CalendarModal open={calendarOpen} onClose={()=>setCalendarOpen(false)} />
    </main>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start justify-between hover:border-foreground/20 transition-colors">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1 font-mono">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${bg} ${color}`}><Icon className="w-5 h-5" /></div>
    </div>
  );
}