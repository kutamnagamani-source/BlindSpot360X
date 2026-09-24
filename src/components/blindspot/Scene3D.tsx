import { cn } from "@/lib/utils";

export type SceneVariant =
  | "landing"
  | "dashboard"
  | "map"
  | "report"
  | "detail"
  | "command"
  | "auth";

type Panel = {
  className: string;
  tilt: string;
  float?: boolean;
  floatDelay?: string;
};

type SceneConfig = {
  floor: boolean;
  dots: boolean;
  panels: Panel[];
  orbs: Array<{ className: string; color: string }>;
};

/**
 * Per-page 3D environments. Each page gets its own composition of a
 * perspective floor, a fine particle field, floating glass slabs, and
 * warm ambient orbs — one shared system, distinct depth per page.
 */
const SCENES: Record<SceneVariant, SceneConfig> = {
  landing: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-40 h-24 top-[16%] left-[6%]", tilt: "-10deg", float: true },
      { className: "w-28 h-40 top-[54%] left-[16%]", tilt: "12deg", float: true, floatDelay: "2s" },
      { className: "w-52 h-28 top-[24%] right-[5%]", tilt: "9deg", float: true, floatDelay: "1s" },
    ],
    orbs: [
      { className: "size-[560px] -top-48 -left-44 opacity-45", color: "oklch(0.7 0.1 60 / 14%)" },
      { className: "size-[440px] top-[42%] -right-36 opacity-35", color: "oklch(0.84 0.12 85 / 10%)" },
    ],
  },
  dashboard: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-44 h-20 top-[18%] right-[7%]", tilt: "8deg", float: true },
      { className: "w-24 h-32 top-[58%] right-[18%]", tilt: "-11deg", float: true, floatDelay: "2.5s" },
    ],
    orbs: [
      { className: "size-[480px] -top-40 right-[12%] opacity-30", color: "oklch(0.7 0.1 60 / 12%)" },
    ],
  },
  map: {
    floor: false, // the map itself is the environment
    dots: false,
    panels: [
      { className: "w-36 h-20 top-[14%] left-[4%]", tilt: "-8deg", float: true },
      { className: "w-24 h-24 bottom-[12%] right-[30%]", tilt: "10deg", float: true, floatDelay: "3s" },
    ],
    orbs: [
      { className: "size-[420px] -top-32 left-[8%] opacity-25", color: "oklch(0.84 0.12 85 / 9%)" },
    ],
  },
  report: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-48 h-24 top-[10%] right-[6%]", tilt: "-9deg", float: true },
      { className: "w-28 h-20 bottom-[16%] left-[8%]", tilt: "11deg", float: true, floatDelay: "2s" },
    ],
    orbs: [
      { className: "size-[460px] top-[8%] -left-40 opacity-30", color: "oklch(0.84 0.12 85 / 11%)" },
    ],
  },
  detail: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-40 h-24 top-[12%] left-[4%]", tilt: "10deg", float: true },
      { className: "w-28 h-36 bottom-[18%] right-[6%]", tilt: "-12deg", float: true, floatDelay: "1.6s" },
    ],
    orbs: [
      { className: "size-[440px] -top-36 right-[16%] opacity-28", color: "oklch(0.7 0.1 60 / 12%)" },
    ],
  },
  command: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-52 h-24 top-[12%] left-[5%]", tilt: "-8deg", float: true },
      { className: "w-32 h-24 top-[46%] right-[8%]", tilt: "9deg", float: true, floatDelay: "2.2s" },
      { className: "w-24 h-32 bottom-[10%] left-[28%]", tilt: "-10deg", float: true, floatDelay: "3.4s" },
    ],
    orbs: [
      { className: "size-[520px] -top-44 left-[30%] opacity-30", color: "oklch(0.84 0.12 85 / 12%)" },
      { className: "size-[380px] bottom-[8%] -right-32 opacity-25", color: "oklch(0.63 0.21 22 / 10%)" },
    ],
  },
  auth: {
    floor: true,
    dots: true,
    panels: [
      { className: "w-44 h-28 top-[18%] left-[10%]", tilt: "-11deg", float: true },
      { className: "w-32 h-24 bottom-[22%] right-[10%]", tilt: "10deg", float: true, floatDelay: "2.8s" },
    ],
    orbs: [
      { className: "size-[520px] top-[20%] left-1/2 -translate-x-1/2 opacity-35", color: "oklch(0.84 0.12 85 / 13%)" },
    ],
  },
};

export function Scene3D({
  variant,
  className,
}: {
  variant: SceneVariant;
  className?: string;
}) {
  const scene = SCENES[variant];
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {scene.orbs.map((orb, i) => (
        <div
          key={`orb-${i}`}
          className={cn("bs-orb", orb.className)}
          style={{ background: orb.color }}
        />
      ))}
      {scene.dots && <div className="bs-dots absolute inset-0 opacity-60" />}
      {scene.panels.map((p, i) => (
        <div
          key={`panel-${i}`}
          className={cn("bs-panel3d", p.className)}
          style={
            {
              transform: `rotate(${p.tilt})`,
              "--tilt": p.tilt,
              animationDelay: p.floatDelay,
            } as React.CSSProperties
          }
        >
          {/* subtle grid etched into each slab */}
          <div
            className="absolute inset-0 rounded-[13px]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.84 0.12 85 / 7%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.84 0.12 85 / 7%) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
      ))}
      {scene.floor && <div className="bs-floor" />}
    </div>
  );
}
