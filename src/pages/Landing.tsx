import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IssueDot } from "@/components/blindspot/IssueDot";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Link, useNavigate } from "react-router";
import {
  Radar,
  MapPinned,
  ShieldCheck,
  BrainCircuit,
  ScanEye,
  Gauge,
  Eye,
  EyeOff,
  ArrowRight,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { ISSUE_CATEGORIES, SEVERITY_META } from "@/lib/issues-ui";
import type { Severity } from "@/convex/schema";

const HERO_DOTS: Array<{ top: string; left: string; severity: Severity; delay: string }> = [
  { top: "22%", left: "18%", severity: "critical", delay: "0s" },
  { top: "58%", left: "30%", severity: "high", delay: "0.6s" },
  { top: "38%", left: "48%", severity: "medium", delay: "1.1s" },
  { top: "66%", left: "62%", severity: "critical", delay: "0.3s" },
  { top: "30%", left: "72%", severity: "low", delay: "1.5s" },
  { top: "72%", left: "82%", severity: "high", delay: "0.9s" },
];

const FEATURES = [
  {
    icon: ScanEye,
    title: "Snap & analyze",
    body: "Photograph a problem. BlindSpot's vision pipeline suggests what it sees — a pothole, a dead streetlight — and you confirm the truth.",
  },
  {
    icon: MapPinned,
    title: "The BlindSpot Map",
    body: "Every discovered problem becomes a colored signal on a live map. Critical red, high orange, resolved teal. The city's blind spots, visible.",
  },
  {
    icon: Gauge,
    title: "Transparent priority",
    body: "No black-box scores. Safety, people affected, accessibility and duration combine into an explainable priority you can audit.",
  },
  {
    icon: ShieldCheck,
    title: "Community verification",
    body: "Neighbors confirm what's still there and what's actually fixed. Reputation is earned through verified usefulness, not noise.",
  },
  {
    icon: BrainCircuit,
    title: "Pattern intelligence",
    body: "Individual reports roll up into hotspot detection and area intelligence — where issues cluster and how a neighborhood is trending.",
  },
  {
    icon: Radar,
    title: "Command Center",
    body: "A live ops dashboard for municipalities and campus teams: priority queue, category load, and resolution throughput at a glance.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const stats = useQuery(api.issues.getStats);
  const seedIfEmpty = useMutation(api.seed.seedIfEmpty);

  // First run: populate the demo zone so the map and stats are alive.
  useEffect(() => {
    if (stats && stats.total === 0) {
      void seedIfEmpty();
    }
  }, [stats, seedIfEmpty]);

  const counters = [
    { label: "problems discovered", value: stats?.total ?? 0, icon: Eye },
    { label: "community verified", value: stats?.verified ?? 0, icon: ShieldCheck },
    { label: "resolved", value: stats?.resolved ?? 0, icon: CheckCircle2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary bs-glow">
              <Radar className="size-5" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-bold tracking-tight">BLINDSPOT</span>
              <p className="bs-hud mt-0.5 hidden sm:block">see what others miss</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/map"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Map
            </Link>
            <Link
              to="/command-center"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Command Center
            </Link>
            {isAuthenticated ? (
              <Button asChild size="sm" className="bs-glow">
                <Link to="/dashboard">
                  Open app <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="bs-glow">
                <Link to="/auth">Get started</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="bs-grid-bg absolute inset-0" />
        <div className="bs-scanline" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge
              variant="outline"
              className="w-fit gap-2 border-primary/40 bg-primary/10 text-primary"
            >
              <Activity className="size-3.5" />
              Civic intelligence platform
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              See the problems
              <br />
              hiding{" "}
              <span className="text-primary bs-glow rounded-lg px-1">
                in plain sight
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Broken streetlights, flooded drains, blocked sidewalks — we walk
              past them until they become invisible. BlindSpot turns what you
              notice into verified, prioritized, trackable fixes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bs-glow gap-2 text-base"
                onClick={() =>
                  navigate(isAuthenticated ? "/report" : "/auth?returnTo=%2Freport")
                }
              >
                <ScanEye className="size-5" />
                Scan your surroundings
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base"
                onClick={() => navigate("/map")}
              >
                <MapPinned className="size-5" />
                Explore the map
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {counters.map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <c.icon className="size-4 text-primary" />
                  <div>
                    <p className="bs-mono text-xl font-bold leading-none">
                      {c.value.toLocaleString()}
                    </p>
                    <p className="bs-hud mt-1">{c.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Radar panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="relative hidden lg:block"
          >
            <Card className="relative overflow-hidden border-primary/25 bg-card/80">
              <div className="bs-grid-bg absolute inset-0 opacity-60" />
              <div className="bs-scanline" style={{ animationDelay: "0.8s" }} />
              <div className="relative flex items-center justify-between border-b border-border/60 px-5 py-3">
                <span className="bs-hud">blindspot radar</span>
                <span className="bs-mono text-xs text-primary">● LIVE</span>
              </div>
              <CardContent className="relative p-6">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-border/60">
                  <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_center,oklch(0.82_0.19_155/8%),transparent_65%)]" />
                  {HERO_DOTS.map((d, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{ top: d.top, left: d.left }}
                    >
                      <IssueDot severity={d.severity} size={14} ping />
                    </div>
                  ))}
                  <div className="absolute bottom-3 left-3 rounded border border-border/70 bg-background/80 px-2.5 py-2 backdrop-blur">
                    {(["critical", "high", "medium", "low"] as Severity[]).map(
                      (s) => (
                        <div key={s} className="flex items-center gap-2 py-0.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: SEVERITY_META[s].hex }}
                          />
                          <span className="bs-mono text-[10px] uppercase text-muted-foreground">
                            {SEVERITY_META[s].label}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="bs-mono text-[11px] text-muted-foreground">
                    17.4432° N, 78.3823° E
                  </span>
                  <span className="bs-mono text-[11px] text-primary">
                    {stats ? `${stats.active} active signals` : "scanning…"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ─── The problem ─── */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="bs-hud">the problem</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                It&apos;s not that nobody sees them.
                <span className="text-primary"> It&apos;s that nobody tracks them.</span>
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                A pothole gets reported to three different people and fixed by
                none. The same broken light gets photographed a dozen times and
                still sits dark for months. Seeing a problem isn&apos;t the
                missing layer — <span className="text-foreground">systematic noticing is</span>:
                document → verify → prioritize → follow up → resolve.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {ISSUE_CATEGORIES.map((c) => (
                  <div
                    key={c.key}
                    className="rounded-lg border border-border/60 bg-card/50 p-3 text-center"
                  >
                    <c.icon className="mx-auto size-5 text-primary" />
                    <p className="mt-2 text-xs font-medium">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <Card className="border-border/70 bg-card/60">
              <CardContent className="p-6 sm:p-8">
                <p className="bs-hud">area analysis — zone 4</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Road damage", pct: 42 },
                    { label: "Street lighting", pct: 27 },
                    { label: "Waste management", pct: 18 },
                    { label: "Water & drainage", pct: 13 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{row.label}</span>
                        <span className="bs-mono text-muted-foreground">{row.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive">
                    ⚠ Infrastructure hotspot detected
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    27 reports this month, ↑34% vs previous month. Most common: road damage.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="bs-hud">how it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            From a glance to a fixed street in five steps
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              { n: "01", t: "Capture", d: "Photograph what everyone else stopped noticing." },
              { n: "02", t: "AI analyzes", d: "Vision suggests the object and the potential issue." },
              { n: "03", t: "You confirm", d: "AI never decides — people verify what's real." },
              { n: "04", t: "Prioritize", d: "Transparent scoring puts danger first, honestly." },
              { n: "05", t: "Track to fix", d: "Lifecycle tracking until the community confirms it's gone." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative rounded-lg border border-border/60 bg-card/50 p-4"
              >
                <span className="bs-mono text-xs text-primary">{s.n}</span>
                <p className="mt-2 font-semibold">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
                {i < 4 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground/50 md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="bs-hud">capabilities</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            One system, from first photo to final fix
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.4 }}
              >
                <Card className="h-full border-border/60 bg-card/50 transition-colors hover:border-primary/40">
                  <CardContent className="p-6">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <p className="mt-4 font-semibold">{f.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Philosophy strip ─── */}
      <section className="border-b border-border/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2">
          <div className="flex items-start gap-4 rounded-lg border border-border/60 bg-card/50 p-6">
            <EyeOff className="mt-1 size-6 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold">AI proposes, people dispose</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Detection results are always framed as &ldquo;potential issues&rdquo;.
                Every report and every resolution is confirmed by a human before
                the map changes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/60 bg-card/50 p-6">
            <Eye className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Designed for the overlooked</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Accessibility problems get their own category, their own severity
                weighting, and a map filter — because the people affected notice
                them first.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden py-24">
        <div className="bs-grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary bs-glow">
            <Radar className="size-7" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            The next problem you walk past
            <br />
            could be the last one on your street
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start with one campus, one neighborhood, one city. BlindSpot is
            built to make the invisible visible — one verified report at a time.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bs-glow gap-2 text-base"
              onClick={() =>
                navigate(isAuthenticated ? "/report" : "/auth?returnTo=%2Freport")
              }
            >
              <ScanEye className="size-5" />
              Scan your surroundings
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link to="/map">
                Open the BlindSpot Map <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Radar className="size-4 text-primary" />
            <span className="text-sm font-bold tracking-tight">BLINDSPOT</span>
          </div>
          <p className="bs-mono text-xs text-muted-foreground">
            see what everyone else stopped noticing
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
