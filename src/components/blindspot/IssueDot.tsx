import { cn } from "@/lib/utils";
import { SEVERITY_META } from "@/lib/issues-ui";
import type { Severity } from "@/convex/schema";

/** Small severity dot with optional radar ping — the BlindSpot signature marker. */
export function IssueDot({
  severity,
  size = 10,
  ping = false,
  className,
}: {
  severity: Severity;
  size?: number;
  ping?: boolean;
  className?: string;
}) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {ping && (
        <span
          className="bs-ping absolute inset-0 rounded-full"
          style={{ background: meta.hex, opacity: 0.5 }}
        />
      )}
      <span
        className="relative rounded-full ring-2 ring-background"
        style={{ width: size, height: size, background: meta.hex }}
      />
    </span>
  );
}
