import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueDot } from "@/components/blindspot/IssueDot";
import { Shell } from "@/components/blindspot/Shell";
import {
  ISSUE_CATEGORIES,
  SEVERITY_META,
  STATUS_META,
  categoryMeta,
  formatDistance,
  timeAgo,
} from "@/lib/issues-ui";
import type { IssueStatus, Severity } from "@/convex/schema";
import { cn } from "@/lib/utils";
import {
  Crosshair,
  Filter,
  MapPin,
  ScanEye,
  Accessibility,
  Search,
} from "lucide-react";

// BlindSpot campus zone default center
const DEFAULT_CENTER: [number, number] = [17.4445, 78.3805];
const DEFAULT_ZOOM = 15;

type SeverityFilter = "all" | Severity;
type StatusFilter = "all" | "active" | IssueStatus;

function severityColor(sev: Severity, status: IssueStatus): string {
  if (status === "resolved" || status === "community_verified")
    return "oklch(0.7 0.13 200)";
  return SEVERITY_META[sev].hex;
}

/** Click-to-move crosshair: lets users set their location by clicking the map. */
function LocationPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center, map, zoom]);
  return null;
}

export default function BlindSpotMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [center, setCenter] = useState<[number, number]>(() => {
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    return DEFAULT_CENTER;
  });
  const [radiusKm, setRadiusKm] = useState(25);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [accessibilityOnly, setAccessibilityOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(true);

  const issues = useQuery(api.issues.listNearby, {
    lat: center[0],
    lng: center[1],
    radiusKm,
  });

  const filtered = useMemo(() => {
    if (!issues) return [];
    return issues.filter((i) => {
      if (severity !== "all" && i.severity !== severity) return false;
      if (status === "active" && (i.status === "resolved" || i.status === "community_verified"))
        return false;
      if (status !== "all" && status !== "active" && i.status !== status) return false;
      if (category !== "all" && i.category !== category) return false;
      if (accessibilityOnly && i.category !== "accessibility") return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !i.title.toLowerCase().includes(q) &&
          !i.locationLabel.toLowerCase().includes(q) &&
          !String(i.issueNumber).includes(q)
        )
          return false;
      }
      return true;
    });
  }, [issues, severity, status, category, accessibilityOnly, search]);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setRadiusKm(5);
      },
      () => {
        // Geolocation unavailable (e.g. preview iframe) — stay on demo zone
      },
    );
  };

  const activeCount = filtered.filter(
    (i) => i.status !== "resolved" && i.status !== "community_verified",
  ).length;

  return (
    <Shell>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Toolbar */}
        <div className="relative flex flex-wrap items-center gap-2 border-b border-border/70 bg-background/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <div className="bs-topline absolute inset-x-0 bottom-0" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={useMyLocation}>
            <Crosshair className="size-3.5" /> Locate me
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="h-8 w-40 pl-8 text-xs sm:w-56"
            />
          </div>

          <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityFilter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              {(Object.keys(STATUS_META) as IssueStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ISSUE_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={accessibilityOnly ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5", accessibilityOnly && "bs-glow")}
            onClick={() => setAccessibilityOnly((v) => !v)}
          >
            <Accessibility className="size-3.5" />
            Accessibility
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="bs-mono hidden text-xs text-muted-foreground sm:block">
              {activeCount} active · {filtered.length} shown
            </span>
            <Button
              variant="default"
              size="sm"
              className="bs-glow gap-1.5"
              onClick={() => navigate("/report")}
            >
              <ScanEye className="size-3.5" /> Report
            </Button>
          </div>
        </div>

        {/* Map + list */}
        <div className="relative flex flex-1 overflow-hidden">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="z-0 flex-1"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPicker
              onPick={(lat, lng) => {
                setCenter([lat, lng]);
              }}
            />
            <Recenter center={center} />
            {filtered.map((issue) => (
              <CircleMarker
                key={issue._id}
                center={[issue.lat, issue.lng]}
                radius={issue.severity === "critical" ? 10 : issue.severity === "high" ? 8 : 6}
                pathOptions={{
                  color: severityColor(issue.severity, issue.status),
                  fillColor: severityColor(issue.severity, issue.status),
                  fillOpacity: 0.9,
                  weight: 2.5,
                  className: "bs-map-marker",
                }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2 p-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bs-mono text-[11px] text-muted-foreground">
                        #{issue.issueNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_META[issue.status].bg +
                          " " +
                          STATUS_META[issue.status].color
                        }
                      >
                        {STATUS_META[issue.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryMeta(issue.category).label} · {issue.subcategory.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {issue.locationLabel}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bs-mono text-muted-foreground">
                        {issue.distanceKm !== undefined
                          ? formatDistance(issue.distanceKm)
                          : ""}
                      </span>
                      <span className="bs-mono text-muted-foreground">
                        {timeAgo(issue.firstReportedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="bs-mono text-[11px] text-primary">
                        priority {issue.priorityScore}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/issue/${issue._id}`}>View report</Link>
                      </Button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="bs-glass absolute bottom-4 left-4 z-[500] rounded-lg p-3">
            <p className="bs-hud mb-2">legend</p>
            {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
              <div key={s} className="flex items-center gap-2 py-0.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: SEVERITY_META[s].hex }}
                />
                <span className="bs-mono text-[11px] uppercase text-muted-foreground">
                  {SEVERITY_META[s].label}
                </span>
              </div>
            ))}
            <div className="mt-1.5 flex items-center gap-2 border-t border-border/60 pt-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: "oklch(0.7 0.13 200)" }}
              />
              <span className="bs-mono text-[11px] uppercase text-muted-foreground">
                Resolved
              </span>
            </div>
          </div>

          {/* Side list */}
          {listOpen && (
            <div className="absolute right-0 top-0 z-[500] flex h-full w-full max-w-sm flex-col border-l border-border/70 bg-background/95 backdrop-blur sm:static sm:w-96 sm:shrink-0 sm:bg-background">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <span className="bs-hud">issues · priority order</span>
                <Button variant="ghost" size="sm" onClick={() => setListOpen(false)}>
                  Hide
                </Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {issues === undefined ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="border-dashed border-border/70 bg-transparent">
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      <Filter className="mx-auto size-5" />
                      <p className="mt-2">No issues match these filters.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filtered.map((issue) => (
                    <button
                      key={issue._id}
                      className="bs-glass bs-lift w-full rounded-lg p-3 text-left"
                      onClick={() =>
                        setCenter([issue.lat, issue.lng])
                      }
                    >
                      <div className="flex items-center gap-2">
                        <IssueDot severity={issue.severity} ping={issue.severity === "critical"} />
                        <span className="bs-mono text-[11px] text-muted-foreground">
                          #{issue.issueNumber}
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {issue.distanceKm !== undefined
                            ? formatDistance(issue.distanceKm)
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-medium">{issue.title}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{issue.locationLabel}</span>
                        <span className="bs-mono text-primary">{issue.priorityScore}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {!listOpen && (
            <Button
              variant="outline"
              size="sm"
              className="absolute right-4 top-4 z-[500]"
              onClick={() => setListOpen(true)}
            >
              Show list
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}
