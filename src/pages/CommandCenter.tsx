import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { IssueDot } from "@/components/blindspot/IssueDot";
import { Shell } from "@/components/blindspot/Shell";
import { useAuth } from "@/hooks/use-auth";
import {
  ISSUE_CATEGORIES,
  SEVERITY_META,
  STATUS_META,
  categoryMeta,
  timeAgo,
} from "@/lib/issues-ui";
import type { Category, IssueStatus } from "@/convex/schema";
import { cn } from "@/lib/utils";
import {
  Radar,
  Flame,
  TrendingUp,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Crown,
  ListChecks,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

type Zone = { name: string; lat: number; lng: number; radiusKm: number };

const ZONES: Zone[] = [
  { name: "Campus Core", lat: 17.4445, lng: 78.3805, radiusKm: 0.7 },
  { name: "Market District", lat: 17.4412, lng: 78.3852, radiusKm: 0.5 },
  { name: "School Street", lat: 17.4475, lng: 78.3789, radiusKm: 0.5 },
  { name: "Lake View", lat: 17.4501, lng: 78.3837, radiusKm: 0.5 },
  { name: "Ring Road", lat: 17.4467, lng: 78.3756, radiusKm: 0.5 },
];

export default function CommandCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = useQuery(api.issues.getStats);
  const issues = useQuery(api.issues.listNearby, {
    lat: 17.4445,
    lng: 78.3805,
    radiusKm: 50,
  });
  const makeMeAdmin = useMutation(api.seed.makeMeAdmin);
  const updateStatus = useMutation(api.issues.updateStatus);

  const [busyId, setBusyId] = useState<string | null>(null);

  const hotspots = useMemo(() => {
    if (!issues) return [];
    return ZONES.map((z) => {
      const inZone = issues.filter(
        (i) =>
          i.status !== "resolved" &&
          i.status !== "community_verified" &&
          (i.lat - z.lat) * 111 * Math.cos((z.lat * Math.PI) / 180) <= z.radiusKm * 1.5 &&
          Math.hypot(
            (i.lat - z.lat) * 111,
            (i.lng - z.lng) * 111 * Math.cos((z.lat * Math.PI) / 180),
          ) <= z.radiusKm * 1.5,
      );
      const catCounts = new Map<string, number>();
      inZone.forEach((i) => catCounts.set(i.category, (catCounts.get(i.category) ?? 0) + 1));
      const primary = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k]) => categoryMeta(k).label);
      return {
        zone: z,
        count: inZone.length,
        critical: inZone.filter((i) => i.severity === "critical").length,
        primary,
      };
    })
      .filter((h) => h.count >= 2)
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  const priorityQueue = useMemo(
    () =>
      (issues ?? [])
        .filter((i) => i.status !== "resolved" && i.status !== "community_verified")
        .slice(0, 8),
    [issues],
  );

  const maxCategory = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...Object.values(stats.byCategory));
  }, [stats]);

  const advance = async (issueId: string, status: IssueStatus) => {
    setBusyId(issueId);
    try {
      await updateStatus({ issueId: issueId as never, status });
      toast.success(`Moved to ${STATUS_META[status].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setBusyId(null);
    }
  };

  const promote = async () => {
    try {
      await makeMeAdmin();
      toast.success("You now have operator access.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };

  return (
    <Shell sceneVariant="command">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="bs-hud">blindspot360 · internal command center</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Radar className="size-6 text-primary" /> Site pulse
            </h1>
          </div>
          {user?.role !== "admin" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={promote}>
              <Crown className="size-4" /> Get operator access
            </Button>
          )}
        </div>

        {/* KPI tiles */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Active issues", value: stats?.active ?? "—", icon: Activity, color: "text-primary" },
            { label: "Critical", value: stats?.critical ?? "—", icon: AlertTriangle, color: "text-[--severity-critical]" },
            { label: "In progress", value: stats?.inProgress ?? "—", icon: TrendingUp, color: "text-[--severity-medium]" },
            { label: "Resolved", value: stats?.resolved ?? "—", icon: CheckCircle2, color: "text-[--severity-resolved]" },
            { label: "Unverified", value: stats?.reported ?? "—", icon: ShieldCheck, color: "text-muted-foreground" },
            { label: "Total ever", value: stats?.total ?? "—", icon: ListChecks, color: "text-foreground" },
          ].map((k) => (
            <Card key={k.label} className="bs-glass border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="bs-hud">{k.label}</p>
                  <k.icon className={cn("size-4", k.color)} />
                </div>
                <p className="bs-mono mt-2 text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Category load */}
          <Card className="bs-glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top issue categories</CardTitle>
              <CardDescription>all-time report distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats
                ? ISSUE_CATEGORIES.map((c) => {
                    const n = stats.byCategory[c.key as Category] ?? 0;
                    return (
                      <div key={c.key} className="flex items-center gap-3">
                        <span className="flex w-28 shrink-0 items-center gap-1.5 text-sm">
                          <c.icon className="size-3.5 text-muted-foreground" />
                          {c.label}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.7_0.1_60)] to-primary transition-all"
                            style={{ width: `${(n / maxCategory) * 100}%`, boxShadow: "0 0 10px oklch(0.84 0.12 85 / 40%)" }}
                          />
                        </div>
                        <span className="bs-mono w-8 text-right text-sm text-muted-foreground">
                          {n}
                        </span>
                      </div>
                    );
                  })
                : [0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-muted/50" />
                  ))}
            </CardContent>
          </Card>

          {/* Lifecycle funnel */}
          <Card className="bs-glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resolution flow</CardTitle>
              <CardDescription>
                every issue walks the full lifecycle — nothing falls through
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(STATUS_META) as IssueStatus[]).map((s) => {
                const n = stats?.byStatus[s] ?? 0;
                const total = stats?.total || 1;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm">{STATUS_META[s].label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(n / total) * 100}%`,
                          background: STATUS_META[s].hex,
                        }}
                      />
                    </div>
                    <span className="bs-mono w-8 text-right text-sm text-muted-foreground">
                      {n}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Hotspots */}
        <Card className="mt-6 bs-glass border border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4 text-destructive" /> Hotspot detection
            </CardTitle>
            <CardDescription>
              zones with unusually concentrated active issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {issues === undefined ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
            ) : hotspots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No concentrated hotspots right now — reports are geographically
                spread out.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hotspots.map((h) => (
                  <div
                    key={h.zone.name}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{h.zone.name}</p>
                      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                        {h.count} active
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Primary: {h.primary.join(", ") || "mixed"}
                    </p>
                    {h.critical > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3" />
                        {h.critical} critical in this zone
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 gap-1 px-2"
                      onClick={() =>
                        navigate(`/map?lat=${h.zone.lat}&lng=${h.zone.lng}`)
                      }
                    >
                      View on map <ArrowRight className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority queue */}
        <Card className="mt-6 bs-glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" /> Priority queue
            </CardTitle>
            <CardDescription>
              highest-scoring active issues — work the top of this list first
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues === undefined ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : priorityQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Queue clear. Every reported issue is resolved or verified.
              </p>
            ) : (
              priorityQueue.map((issue) => (
                <div
                  key={issue._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3"
                >
                  <IssueDot severity={issue.severity} ping={issue.severity === "critical"} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/issue/${issue._id}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      <span className="bs-mono text-muted-foreground">
                        #{issue.issueNumber}
                      </span>{" "}
                      {issue.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {issue.locationLabel} · {timeAgo(issue.firstReportedAt)} ·{" "}
                      {issue.confirms} confirmations
                    </p>
                  </div>
                  <span
                    className="bs-mono text-lg font-bold"
                    style={{ color: SEVERITY_META[issue.severity].hex }}
                  >
                    {issue.priorityScore}
                  </span>
                  {issue.status === "reported" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === issue._id}
                      onClick={() => advance(issue._id, "verified")}
                    >
                      {busyId === issue._id && <Loader2 className="size-3.5 animate-spin" />}
                      Verify
                    </Button>
                  )}
                  {issue.status === "verified" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === issue._id}
                      onClick={() => advance(issue._id, "in_progress")}
                    >
                      {busyId === issue._id && <Loader2 className="size-3.5 animate-spin" />}
                      Start work
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className={STATUS_META[issue.status].bg + " " + STATUS_META[issue.status].color}
                  >
                    {STATUS_META[issue.status].label}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
