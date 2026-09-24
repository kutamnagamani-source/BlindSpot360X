import { ISSUE_STATUSES, type IssueStatus, type Severity } from "@/convex/schema";

// ─── Category metadata ────────────────────────────────────────────────────────

import {
  Car,
  Zap,
  Droplets,
  Trash2,
  Accessibility,
  Building2,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey = (typeof ISSUE_CATEGORIES)[number]["key"];

export const ISSUE_CATEGORIES = [
  {
    key: "roads",
    label: "Roads",
    icon: Car,
    examples: ["Potholes", "Cracks", "Missing signs", "Faded crossings"],
  },
  {
    key: "electricity",
    label: "Electricity",
    icon: Zap,
    examples: ["Broken streetlights", "Exposed wiring", "Damaged poles"],
  },
  {
    key: "water",
    label: "Water",
    icon: Droplets,
    examples: ["Leaks", "Flooding", "Broken pipes"],
  },
  {
    key: "waste",
    label: "Waste",
    icon: Trash2,
    examples: ["Overflowing bins", "Illegal dumping"],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    icon: Accessibility,
    examples: ["Blocked ramps", "Broken sidewalks", "Obstructed paths"],
  },
  {
    key: "buildings",
    label: "Buildings",
    icon: Building2,
    examples: ["Damaged structures", "Broken railings"],
  },
] as const;

export function categoryMeta(key: string) {
  return ISSUE_CATEGORIES.find((c) => c.key === key) ?? ISSUE_CATEGORIES[0];
}

// ─── Severity styling ─────────────────────────────────────────────────────────

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; bg: string; dot: string; hex: string }
> = {
  critical: {
    label: "Critical",
    color: "text-[--severity-critical]",
    bg: "bg-[--severity-critical]/15 border-[--severity-critical]/40",
    dot: "bg-[--severity-critical]",
    hex: "oklch(0.62 0.22 25)",
  },
  high: {
    label: "High",
    color: "text-[--severity-high]",
    bg: "bg-[--severity-high]/15 border-[--severity-high]/40",
    dot: "bg-[--severity-high]",
    hex: "oklch(0.75 0.15 60)",
  },
  medium: {
    label: "Medium",
    color: "text-[--severity-medium]",
    bg: "bg-[--severity-medium]/15 border-[--severity-medium]/40",
    dot: "bg-[--severity-medium]",
    hex: "oklch(0.82 0.15 100)",
  },
  low: {
    label: "Low",
    color: "text-[--severity-low]",
    bg: "bg-[--severity-low]/15 border-[--severity-low]/40",
    dot: "bg-[--severity-low]",
    hex: "oklch(0.82 0.19 155)",
  },
};

// ─── Status styling ───────────────────────────────────────────────────────────

export const STATUS_META: Record<
  IssueStatus,
  { label: string; color: string; bg: string; hex: string; step: number }
> = {
  reported: {
    label: "Reported",
    color: "text-[--severity-critical]",
    bg: "bg-[--severity-critical]/15 border-[--severity-critical]/40",
    hex: "oklch(0.62 0.22 25)",
    step: 0,
  },
  verified: {
    label: "Verified",
    color: "text-[--severity-high]",
    bg: "bg-[--severity-high]/15 border-[--severity-high]/40",
    hex: "oklch(0.75 0.15 60)",
    step: 1,
  },
  in_progress: {
    label: "In progress",
    color: "text-[--severity-medium]",
    bg: "bg-[--severity-medium]/15 border-[--severity-medium]/40",
    hex: "oklch(0.82 0.15 100)",
    step: 2,
  },
  resolved: {
    label: "Resolved",
    color: "text-[--severity-resolved]",
    bg: "bg-[--severity-resolved]/15 border-[--severity-resolved]/40",
    hex: "oklch(0.7 0.13 200)",
    step: 3,
  },
  community_verified: {
    label: "Community verified",
    color: "text-[--severity-low]",
    bg: "bg-[--severity-low]/15 border-[--severity-low]/40",
    hex: "oklch(0.82 0.19 155)",
    step: 4,
  },
};

export const LIFECYCLE_STEPS: IssueStatus[] = [...ISSUE_STATUSES];

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
