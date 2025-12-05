"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BankAvatar from "@/components/BankAvatar";
import JobTimeline from "@/components/JobTimeline";
import CalendarModal from "@/components/CalendarModal";
import { getAll, setStage, incInterviews, type SavedJob } from "@/lib/tracker";
import { BANKS_LIST } from "@/config/banks";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Archive, 
  Activity, 
  LayoutDashboard, 
  Clock,
  ExternalLink,
  ChevronDown,
  Zap,
  Target,
  Award
} from "lucide-react";

/* Helpers */
function timeAgo(ts?: number | string) { 
  if (!ts) return "-"; 
  const d = new Date(Number(ts)); 
  const diff = Date.now() - d.getTime(); 
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)); 
  if(days === 0) return "Aujourd'hui"; 
  if(days === 1) return "Hier"; 
  return `Il y a ${days}j`; 
}

function resolveBankId(company?: string | null, source?: string | null): string | undefined { 
  const norm = (s:string) => s.toLowerCase().replace(/[^a-z0-9]/g,""); 
  const target = norm(company || source || ""); 
  return BANKS_LIST.find(b => target.includes(norm(b.name)) || norm(b.name).includes(target))?.id; 
}

type View = "favs" | "applied";

const STAGE_LABELS: Record<string, string> = {
  applied: "Candidature",
  phone: "Tel Screen",
  interview: "Entretien",
  offer: "Offre",
  rejected: "Refusé"
};

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  applied: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  phone: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  interview: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  offer: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" }
};

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
    const offers = appliedAll.filter(j => j.stage === "offer").length;
    return { active, interviews, rejected, rate, offers };
  }, [appliedAll]);

  /* Chart Data */
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    appliedAll.forEach(j => { 
      if(!j.appliedAt) return; 
      const d = new Date(Number(j.appliedAt)).toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit"}); 
      map.set(d, (map.get(d)||0) + 1); 
    });
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .slice(-7);
  }, [appliedAll]);

  return (
    <main className="relative min-h-screen w-full px-4 pt-28 pb-12 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-secondary/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-finance opacity-30" />

      <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
        
        {/* HEADER HÉRO */}
        <header className="relative dashboard-header-appear">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-secondary/20 blur-3xl opacity-50 animate-pulse" />
          
          <div className="relative backdrop-blur-xl bg-background/40 border border-border/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.25)] transition-all duration-500 group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
              <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-60" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <LayoutDashboard className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-secondary bg-clip-text text-transparent animate-gradient">
                      COMMAND CENTER
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      Vue d'ensemble • Processus de recrutement
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">TRACKING ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="relative group/toggle">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-background/60 backdrop-blur-xl rounded-xl p-1.5 border border-border/50 shadow-lg">
                  <button 
                    onClick={()=>setView("applied")} 
                    className={`relative px-6 py-2.5 rounded-lg text-sm font-bold font-mono transition-all duration-300 ${
                      view==="applied" 
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                    }`}
                  >
                    {view === "applied" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-secondary opacity-100 animate-gradient rounded-lg" />
                    )}
                    <span className="relative z-10">CANDIDATURES</span>
                  </button>
                  <button 
                    onClick={()=>setView("favs")} 
                    className={`relative px-6 py-2.5 rounded-lg text-sm font-bold font-mono transition-all duration-300 ${
                      view==="favs" 
                        ? "bg-secondary text-primary-foreground shadow-[0_0_20px_rgba(247,118,142,0.4)]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                    }`}
                  >
                    {view === "favs" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-100 animate-gradient rounded-lg" />
                    )}
                    <span className="relative z-10">FAVORIS</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </header>

        {/* KPIS */}
        {view === "applied" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard 
              label="Process Actifs" 
              value={kpis.active} 
              icon={Activity} 
              color="text-emerald-500" 
              bg="bg-emerald-500/10"
              border="border-emerald-500/30"
              delay={0}
            />
            <KpiCard 
              label="Entretiens" 
              value={kpis.interviews} 
              icon={Clock} 
              color="text-blue-500" 
              bg="bg-blue-500/10"
              border="border-blue-500/30"
              delay={100}
            />
            <KpiCard 
              label="Offres" 
              value={kpis.offers} 
              icon={Award} 
              color="text-yellow-500" 
              bg="bg-yellow-500/10"
              border="border-yellow-500/30"
              delay={200}
            />
            <KpiCard 
              label="Taux Conversion" 
              value={`${kpis.rate}%`} 
              icon={TrendingUp} 
              color="text-purple-500" 
              bg="bg-purple-500/10"
              border="border-purple-500/30"
              delay={300}
            />
            <KpiCard 
              label="Refus" 
              value={kpis.rejected} 
              icon={Archive} 
              color="text-red-500" 
              bg="bg-red-500/10"
              border="border-red-500/30"
              delay={400}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN TABLE */}
          <div className="lg:col-span-2 dashboard-table-appear">
            <div className="relative rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.2)] transition-all duration-500 group">
              <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
                <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-secondary to-transparent animate-scan opacity-50" />
              </div>

              <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gradient-to-r from-background/80 to-background/60">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {view === "applied" ? "Suivi des Candidatures" : "Liste des Favoris"}
                </h3>
                <button 
                  onClick={()=>setCalendarOpen(true)} 
                  className="group/cal flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <CalendarIcon className="w-4 h-4 group-hover/cal:rotate-12 transition-transform" />
                  CALENDRIER
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-b from-background/60 to-background/40 border-b border-border/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Poste</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Institution</th>
                      {view === "applied" && <th className="px-6 py-4 text-left text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Statut</th>}
                      {view === "applied" && <th className="px-6 py-4 text-center text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Rounds</th>}
                      <th className="px-6 py-4 text-right text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {displayItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <Archive className="w-6 h-6 text-primary/50" />
                            </div>
                            <p className="text-muted-foreground font-mono text-sm">Aucune donnée disponible</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((job, idx) => (
                        <motion.tr 
                          key={job.id} 
                          initial={{ opacity:0, x: -20 }} 
                          animate={{ opacity:1, x: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.3 }}
                          className="group/row hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-secondary/5 transition-all duration-300"
                        >
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <Link 
                                href={job.link} 
                                target="_blank" 
                                className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 max-w-[280px] truncate group/link"
                              >
                                {job.title}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                              </Link>
                              <button 
                                onClick={()=>setOpenTimeline(p=>({...p,[job.id]:!p[job.id]}))} 
                                className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors font-mono font-bold"
                              >
                                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${openTimeline[job.id] ? 'rotate-180' : ''}`} />
                                {openTimeline[job.id] ? "MASQUER" : "TIMELINE"}
                              </button>
                              <AnimatePresence>
                                {openTimeline[job.id] && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-2"
                                  >
                                    <JobTimeline job={job} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <BankAvatar 
                                bankId={resolveBankId(job.company, job.source)} 
                                name={job.company} 
                                size={28} 
                                className="rounded-lg ring-1 ring-border/50 group-hover/row:ring-primary/50 group-hover/row:scale-110 transition-all duration-300" 
                              />
                              <span className="text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[150px] text-sm">
                                {job.company || job.source}
                              </span>
                            </div>
                          </td>
                          {view === "applied" && (
                            <td className="px-6 py-4">
                              <select 
                                value={job.stage || "applied"} 
                                onChange={(e)=> { setStage(job.id, e.target.value as any); setItems(getAll()); }} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer ${STAGE_COLORS[job.stage || "applied"].bg} ${STAGE_COLORS[job.stage || "applied"].text} ${STAGE_COLORS[job.stage || "applied"].border} focus:ring-2 focus:ring-primary/50 outline-none`}
                              >
                                {["applied","phone","interview","offer","rejected"].map(o=>
                                  <option key={o} value={o}>{STAGE_LABELS[o]}</option>
                                )}
                              </select>
                            </td>
                          )}
                          {view === "applied" && (
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <div className="inline-flex items-center border border-border/50 rounded-lg overflow-hidden bg-background/60 backdrop-blur-xl">
                                  <button 
                                    onClick={()=>{if((job.interviews||0)>0){incInterviews(job.id, -1); setItems(getAll())}}} 
                                    className="px-3 py-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 font-bold"
                                  >
                                    −
                                  </button>
                                  <span className="px-3 text-foreground font-mono font-bold text-sm">{job.interviews || 0}</span>
                                  <button 
                                    onClick={()=>{incInterviews(job.id, 1); setItems(getAll())}} 
                                    className="px-3 py-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Clock className="w-3 h-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground group-hover/row:text-foreground font-mono text-xs transition-colors">
                                {timeAgo(job.appliedAt || job.posted)}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-secondary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </div>
          </div>

          {/* SIDEBAR WIDGETS */}
          <div className="space-y-6 dashboard-sidebar-appear">
            {/* Activity Chart */}
            <div className="relative rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl p-6 shadow-lg hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)] transition-all duration-500 group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
                <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-scan opacity-40" />
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground font-mono tracking-wider">ACTIVITÉ</h3>
              </div>
              
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <Bar dataKey="count" radius={[8,8,0,0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#gradient-${index})`}
                        />
                      ))}
                    </Bar>
                    <defs>
                      {chartData.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity={0.3} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Tooltip 
                      cursor={{fill:'transparent'}} 
                      contentStyle={{
                        backgroundColor:'hsl(var(--background))', 
                        borderColor:'hsl(var(--border))', 
                        color:'hsl(var(--foreground))',
                        borderRadius: '8px',
                        backdropFilter: 'blur(12px)',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }} 
                      itemStyle={{color:'hsl(var(--foreground))'}} 
                    />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize:10, fill:'hsl(var(--muted-foreground))', fontFamily: 'monospace'}} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-emerald-500/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Stats summary */}
            <div className="relative rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl p-6 shadow-lg hover:shadow-[0_0_40px_rgba(var(--secondary-rgb),0.15)] transition-all duration-500 group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
                <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-secondary to-transparent animate-scan opacity-40" />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-bold text-foreground font-mono tracking-wider">RÉSUMÉ</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30">
                  <span className="text-xs text-muted-foreground font-mono">Total candidatures</span>
                  <span className="text-lg font-bold text-foreground font-mono">{appliedAll.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30">
                  <span className="text-xs text-muted-foreground font-mono">Favoris sauvegardés</span>
                  <span className="text-lg font-bold text-foreground font-mono">{favs.length}</span>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-secondary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </div>
      
      <CalendarModal open={calendarOpen} onClose={()=>setCalendarOpen(false)} />
    </main>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, border, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      className="relative group"
    >
      <div className={`absolute -inset-0.5 ${bg} rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
      
      <div className={`relative rounded-xl border ${border} ${bg} backdrop-blur-xl p-5 flex items-start justify-between hover:scale-105 transition-all duration-300 overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-[1px] overflow-hidden">
          <div className={`absolute w-full h-full bg-gradient-to-r from-transparent via-current to-transparent ${color} animate-scan opacity-30`} />
        </div>

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground font-mono font-bold uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg} border ${border} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>

        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-current to-transparent opacity-5 rounded-tl-full" />
      </div>
    </motion.div>
  );
}