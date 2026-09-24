import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Radar } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MapPinned,
  ScanEye,
  Radar as RadarIcon,
  LogOut,
} from "lucide-react";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Map", icon: MapPinned },
  { to: "/report", label: "Report", icon: ScanEye },
  { to: "/command-center", label: "Command Center", icon: RadarIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Radar className="size-4.5" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight sm:block">
              BLINDSPOT360
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map((l) => {
              const active =
                l.to === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <l.icon className="size-3.5" />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="bs-mono hidden max-w-[180px] truncate text-xs text-muted-foreground md:block">
              {user?.email ?? "guest"}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
