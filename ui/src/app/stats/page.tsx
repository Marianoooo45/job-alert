"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Database,
  Clock,
  Target,
  Users,
} from "lucide-react";

interface TopBank {
  name: string;
  value: number;
}

interface HistoryPoint {
  date: string;
  count: number;
}

interface BankHealth {
  bank: string;
  lastSeen: string | null;
  total: number;
}

interface ContractGroup {
  label: string;
  value: number;
}

interface WeekdayStat {
  weekday: string;
  count: number;
}

interface Kpis {
  daysTracked: number;
  avgPerDay: number;
  lastDayCount: number;
  lastDayDate: string | null;
  rolling7d: number;
  bestDayCount: number;
  bestDayDate: string | null;
  internShare: number;
  cdiShare: number;
}

interface StatData {
  totalJobs: number;
  topBanks: TopBank[];
  history: HistoryPoint[];
  bankHealth: BankHealth[];
  kpis: Kpis;
  contractGroups: ContractGroup[];
  jobsByWeekday: WeekdayStat[];
}

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#6366f1",
  "Non spécifié": "#4b5563",
  Stage: "#22c55e",
  Alternance: "#f97316",
  CDD: "#06b6d4",
  VIE: "#eab308",
  Freelance: "#ec4899",
  Autres: "#9ca3af",
};

const DEFAULT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#06b6d4",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
];

function formatInt(n: number | undefined) {
  return (n ?? 0).toLocaleString("fr-FR");
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------- KPI CARD ----------
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: "up" | "down";
  delay?: number;
}) {
  return (
    <div
      className="stat-card-appear group relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

      <Card className="relative border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden group">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {subtitle}
                </CardDescription>
              </div>
            </div>
            {trend && (
              <div
                className={`p-1.5 rounded-full ${
                  trend === "up" ? "bg-emerald-500/10" : "bg-red-500/10"
                }`}
              >
                {trend === "up" ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative z-10">
          {/* ICI le texte devient visible */}
          <div className="text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
            {value}
          </div>
        </CardContent>

        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Card>
    </div>
  );
}

// ---------- PAGE ----------
export default function StatsPage() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topLimit, setTopLimit] = useState<10 | 20 | 50>(20);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          try {
            return Promise.reject(JSON.parse(errText));
          } catch {
            throw new Error(errText || res.statusText);
          }
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        console.error("Erreur stats:", err);
        setError(err.message || "Erreur inconnue");
      })
      .finally(() => setLoading(false));
  }, []);

  const donutData = useMemo(() => (data ? data.contractGroups : []), [data]);
  const weekdayData = useMemo(() => (data ? data.jobsByWeekday : []), [data]);
  const topBanksLimited = useMemo(
    () => (data ? data.topBanks.slice(0, topLimit) : []),
    [data, topLimit],
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div
            className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-secondary rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1s" }}
          />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Chargement du Terminal...
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            Synchronisation des données 📊
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 space-y-4 p-4 text-center">
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/5 backdrop-blur-xl max-w-md">
          <h2 className="text-xl font-bold mb-2">⚠️ Erreur Terminal</h2>
          <p className="text-sm opacity-90 font-mono bg-red-950/50 text-red-400 p-3 rounded border border-red-500/20">
            {error || "Données manquantes"}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Vérifie les logs côté backend pour plus de détails.
          </p>
        </div>
      </div>
    );
  }

  const { kpis } = data;
  const internPct = (kpis.internShare * 100).toFixed(1);
  const cdiPct = (kpis.cdiShare * 100).toFixed(1);
  const bestSource = data.topBanks[0];

  return (
    <div className="container mx-auto px-4 py-8 mt-24 space-y-8 relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 blur-3xl" />
        <div className="relative text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent animate-gradient">
            MARKET INTELLIGENCE
          </h1>
          <p className="text-muted-foreground font-mono text-sm md:text-base">
            Résultat de 1 an de chomage : faire des stats inutiles •{" "}
            {new Date().toLocaleDateString("fr-FR")}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-500">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={Database}
          title="Total Offres"
          value={formatInt(data.totalJobs)}
          subtitle="Offres en base de données"
          trend="up"
          delay={0}
        />
        <KpiCard
          icon={Users}
          title="Sources Actives"
          value={formatInt(data.bankHealth.length)}
          subtitle="Banques surveillées"
          delay={100}
        />
        <KpiCard
          icon={Activity}
          title="Moyenne / Jour"
          value={Math.round(kpis.avgPerDay).toLocaleString("fr-FR")}
          subtitle="Performance globale"
          delay={200}
        />
        <KpiCard
          icon={Zap}
          title="7 Derniers Jours"
          value={formatInt(kpis.rolling7d)}
          subtitle={`Dernier: ${formatDate(kpis.lastDayDate)}`}
          trend="up"
          delay={300}
        />
      </div>

      {/* KPIs secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card-appear" style={{ animationDelay: "400ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-sm font-medium">
                  Meilleur Jour
                </CardTitle>
              </div>
              <CardDescription>Record absolu d&apos;offres</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatInt(kpis.bestDayCount)} offres
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📅 {formatDate(kpis.bestDayDate)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="stat-card-appear" style={{ animationDelay: "500ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Programmes Junior
                </CardTitle>
              </div>
              <CardDescription>Stage + Alternance + VIE</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{internPct}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                Positions early-career
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="stat-card-appear" style={{ animationDelay: "600ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-secondary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(247,118,142,0.3)] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-secondary" />
                <CardTitle className="text-sm font-medium">Poids CDI</CardTitle>
              </div>
              <CardDescription>Contrats permanents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{cdiPct}%</div>
              {bestSource && (
                <p className="text-xs text-muted-foreground mt-2">
                  Top source:{" "}
                  <span className="font-semibold text-primary">
                    {bestSource.name}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Flux temporel */}
      <div className="stat-card-appear" style={{ animationDelay: "700ms" }}>
        <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Flux d&apos;Offres Récupérées</CardTitle>
                  <CardDescription>
                    Volume quotidien • Historique complet
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-xs border-primary/30 text-primary"
              >
                REAL-TIME
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.history}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.1}
                  stroke="currentColor"
                  className="text-border"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return isNaN(d.getTime())
                      ? str
                      : d.toLocaleDateString("fr-FR", {
                          month: "short",
                          day: "numeric",
                        });
                  }}
                  minTickGap={30}
                  stroke="currentColor"
                  className="text-muted-foreground text-xs"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-muted-foreground text-xs"
                  tick={{ fill: "currentColor" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    backdropFilter: "blur(12px)",
                  }}
                  labelFormatter={(label) => formatDate(label as string)}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="Offres"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top contributeurs + santé des sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="stat-card-appear" style={{ animationDelay: "800ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 group h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle>Top Contributeurs</CardTitle>
                  <CardDescription>Sources les plus actives</CardDescription>
                </div>
              </div>
              <select
                value={topLimit}
                onChange={(e) =>
                  setTopLimit(Number(e.target.value) as 10 | 20 | 50)
                }
                className="rounded-lg bg-background/60 border border-border px-3 py-1.5 text-xs font-mono backdrop-blur-xl hover:border-primary/50 transition-colors cursor-pointer"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </CardHeader>
            <CardContent className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topBanksLimited}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal
                    vertical={false}
                    opacity={0.1}
                    stroke="currentColor"
                    className="text-border"
                  />
                  <XAxis
                    type="number"
                    stroke="currentColor"
                    className="text-muted-foreground text-xs"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    style={{ fontSize: "11px" }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tick={{ fill: "currentColor" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      backdropFilter: "blur(12px)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    name="Offres"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="stat-card-appear" style={{ animationDelay: "900ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 group h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Activity className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Dernière Activité</CardTitle>
                  <CardDescription>Monitoring fraîcheur données</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[450px] overflow-auto pr-2 space-y-2 custom-scrollbar">
              {data.bankHealth.map((item, idx) => {
                const lastSeenDate = item.lastSeen
                  ? new Date(item.lastSeen)
                  : null;
                const daysAgo =
                  !lastSeenDate || isNaN(lastSeenDate.getTime())
                    ? 999
                    : Math.floor(
                        (Date.now() - lastSeenDate.getTime()) /
                          (1000 * 3600 * 24)
                      );
                const isStale = daysAgo > 3;

                return (
                  <div
                    key={item.bank}
                    className="source-item-appear flex items-center justify-between border border-border/50 hover:border-primary/50 bg-background/20 hover:bg-background/40 px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] group/item"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${
                            isStale
                              ? "bg-red-500/10 border-red-500/30 text-red-500"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                          } group-hover/item:scale-110 transition-transform duration-300`}
                        >
                          {item.bank.substring(0, 2).toUpperCase()}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                            isStale ? "bg-red-500" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {item.bank}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {formatInt(item.total)} offres
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div
                        className={`text-xs font-mono font-semibold ${
                          isStale ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {lastSeenDate && !isNaN(lastSeenDate.getTime())
                          ? lastSeenDate.toLocaleDateString("fr-FR")
                          : "Jamais"}
                      </div>
                      {isStale && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-5 px-2 font-mono"
                        >
                          ⚠ {daysAgo === 999 ? "?" : `${daysAgo}j`}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Donut + weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="stat-card-appear" style={{ animationDelay: "1000ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Types de Contrat</CardTitle>
                  <CardDescription>Distribution par catégorie</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {donutData.map((entry, index) => {
                      const color =
                        CONTRACT_COLORS[entry.label] ||
                        DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                      return <Cell key={entry.label} fill={color} />;
                    })}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={50}
                    wrapperStyle={{ fontSize: "11px" }}
                    iconType="circle"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      backdropFilter: "blur(12px)",
                    }}
                    formatter={(value: any, name: any) => [
                      `${formatInt(Number(value))} offres`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="stat-card-appear" style={{ animationDelay: "1100ms" }}>
          <Card className="border-border/50 bg-background/40 backdrop-blur-xl hover:border-secondary/30 transition-all duration-500 group">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle>Volume par Jour</CardTitle>
                  <CardDescription>Patterns hebdomadaires</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.1}
                    stroke="currentColor"
                    className="text-border"
                  />
                  <XAxis
                    dataKey="weekday"
                    stroke="currentColor"
                    className="text-muted-foreground text-xs"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground text-xs"
                    tick={{ fill: "currentColor" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      backdropFilter: "blur(12px)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#22c55e"
                    name="Offres"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }

        @keyframes scan {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }

        @keyframes statCardAppear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes sourceItemAppear {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .stat-card-appear {
          animation: statCardAppear 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)
            forwards;
          opacity: 0;
        }

        .source-item-appear {
          animation: sourceItemAppear 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)
            forwards;
          opacity: 0;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }

        @media (prefers-reduced-motion: reduce) {
          .stat-card-appear,
          .source-item-appear,
          .animate-gradient,
          .animate-scan {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
