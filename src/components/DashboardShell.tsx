import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Search,
  Bell,
  PanelLeft,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const ownerNav: NavItem[] = [
  { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/owner/dashboard", label: "Properties", icon: Building2 },
];

const salesNav: NavItem[] = [
  { to: "/sales/dashboard", label: "Inventory", icon: LayoutDashboard },
];

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = user?.role === "sales" ? salesNav : ownerNav;
  const roleLabel = user?.role ?? "guest";

  const Sidebar = (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
          G
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Gharpayy</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Inventory OS
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {roleLabel === "sales" ? "Sales" : roleLabel === "owner" ? "Owner" : "Workspace"}
        </p>
        <ul className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                {user.role}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="block rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{Sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="hidden flex-1 items-center md:flex">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search rooms, properties…"
                className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <button
              className="rounded-md border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            {user && (
              <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 sm:flex">
                <div className="h-5 w-5 rounded-full bg-primary/20 text-[10px] font-semibold leading-5 text-center text-primary">
                  {user.name.charAt(0)}
                </div>
                <span className="text-xs font-medium">{user.name}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page header */}
        <div className="border-b border-border bg-background px-4 py-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: typeof LayoutDashboard;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info" | "muted";
  children: ReactNode;
}) {
  const map: Record<string, string> = {
    success:
      "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_85%,white)] ring-[color-mix(in_oklab,var(--success)_30%,transparent)]",
    warning:
      "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_92%,white)] ring-[color-mix(in_oklab,var(--warning)_30%,transparent)]",
    danger:
      "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[color-mix(in_oklab,var(--danger)_92%,white)] ring-[color-mix(in_oklab,var(--danger)_30%,transparent)]",
    info: "bg-[color-mix(in_oklab,var(--info)_18%,transparent)] text-[color-mix(in_oklab,var(--info)_92%,white)] ring-[color-mix(in_oklab,var(--info)_30%,transparent)]",
    muted: "bg-secondary text-muted-foreground ring-border",
  };
  const dotMap: Record<string, string> = {
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
    info: "bg-[var(--info)]",
    muted: "bg-muted-foreground/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset",
        map[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotMap[tone])} />
      {children}
    </span>
  );
}
