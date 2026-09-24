import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IssueDot } from "@/components/blindspot/IssueDot";
import { Shell } from "@/components/blindspot/Shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link, useNavigate } from "react-router";
import {
  ScanEye,
  MapPinned,
  ShieldCheck,
  CheckCircle2,
  FileWarning,
  ArrowRight,
  Radar,
} from "lucide-react";
import { STATUS_META, categoryMeta, timeAgo } from "@/lib/issues-ui";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myReports = useQuery(api.issues.getMyReports);
  const myConfirmations = useQuery(api.issues.getMyConfirmations);
  const stats = useQuery(api.issues.getStats);
  const leaderboard = useQuery(api.issues.getLeaderboard);

  const impact = user?.reputation ?? 0;
  const impactPct = Math.min(100, Math.round((impact / 100) * 100));

  return (
    <Shell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="bs-hud">team workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome{user?.name ? `, ${user.name}` : " back"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button className="bs-glow gap-2" onClick={() => navigate("/report")}>
              <ScanEye className="size-4" /> Report an issue
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/map")}>
              <MapPinned className="size-4" /> Map
            </Button>
          </div>
        </div>

        {/* Impact stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Reputation", value: impact, icon: Radar },
            {
              label: "Reports filed",
              value: user?.reportsCount ?? myReports?.length ?? 0,
              icon: FileWarning,
            },
            {
              label: "Confirmations",
              value: user?.confirmationsCount ?? myConfirmations?.length ?? 0,
              icon: ShieldCheck,
            },
            {
              label: "Resolutions",
              value: user?.resolutionsCount ?? 0,
              icon: CheckCircle2,
            },
          ].map((s) => (
            <Card key={s.label} className="bs-glass border-0">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="bs-mono text-2xl font-bold leading-none">{s.value}</p>
                  <p className="bs-hud mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Community impact meter */}
        <Card className="mt-4 bs-glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your impact</CardTitle>
            <CardDescription>
              Earned through verified contributions — +10 per report, +3 per
              confirmation, +5 per verified resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[oklch(0.78_0.13_205)] to-primary transition-all"
                  style={{ width: `${Math.max(4, impactPct)}%`, boxShadow: "0 0 12px oklch(0.86 0.19 162 / 50%)" }}
                />
              </div>
              <span className="bs-mono text-sm text-primary">{impactPct}%</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {/* My reports */}
          <Card className="bs-glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myReports === undefined ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : myReports.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
                  <ScanEye className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No reports yet. Spot something broken?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate("/report")}
                  >
                    File your first report
                  </Button>
                </div>
              ) : (
                myReports.map((issue) => {
                  const meta = categoryMeta(issue.category);
                  const status = STATUS_META[issue.status];
                  return (
                    <Link
                      key={issue._id}
                      to={`/issue/${issue._id}`}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3 transition-colors hover:border-primary/40"
                    >
                      <IssueDot severity={issue.severity} ping={issue.severity === "critical"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          <span className="bs-mono text-muted-foreground">
                            #{issue.issueNumber}
                          </span>{" "}
                          {issue.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <meta.icon className="size-3" /> {meta.label} ·{" "}
                          {timeAgo(issue.firstReportedAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className={status.bg + " " + status.color}>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* Recently confirmed */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Issues I've confirmed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myConfirmations === undefined ? (
                  <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
                ) : myConfirmations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Confirm open issues on the map to build verified site knowledge.
                  </p>
                ) : (
                  myConfirmations.slice(0, 5).map((issue) => (
                    <Link
                      key={issue._id}
                      to={`/issue/${issue._id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 p-2.5 text-sm transition-colors hover:border-primary/40"
                    >
                      <span className="truncate">
                        <span className="bs-mono text-muted-foreground">
                          #{issue.issueNumber}
                        </span>{" "}
                        {issue.title}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="bs-glass border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top contributors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard === undefined ? (
                  <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Be the first verified contributor on the team.
                  </p>
                ) : (
                  leaderboard.slice(0, 5).map((u, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="bs-mono w-5 shrink-0 text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="truncate">{u.name}</span>
                      </span>
                      <span className="bs-mono text-primary">{u.reputation}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Global pulse */}
        {stats && (
          <Card className="mt-6 bs-glass border-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-2">
                <IssueDot severity="critical" ping />
                <span className="text-sm">
                  <span className="bs-mono font-bold">{stats.active}</span> active
                  issues across our sites
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IssueDot severity="low" />
                <span className="text-sm">
                  <span className="bs-mono font-bold">{stats.resolved}</span> resolved
                  and verified
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/command-center">
                  Open Command Center <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
