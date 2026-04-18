import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BedDouble, Filter, MapPin, ShieldCheck } from "lucide-react";
import { DashboardShell, SectionCard, StatCard, StatusBadge } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ControlType, RoomWithProperty } from "@/types/models";

export const Route = createFileRoute("/sales/dashboard")({
  head: () => ({
    meta: [
      { title: "Sales dashboard — Gharpayy Inventory OS" },
      {
        name: "description",
        content:
          "Live, owner-confirmed inventory for the Gharpayy sales team. Sell what's real, close faster.",
      },
    ],
  }),
  component: SalesDashboardRoute,
});

function SalesDashboardRoute() {
  return (
    <RoleGuard allow={["sales"]}>
      <SalesDashboard />
    </RoleGuard>
  );
}

function SalesDashboard() {
  const [rooms, setRooms] = useState<RoomWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [controlType, setControlType] = useState<"" | ControlType>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.salesInventory({
          location: location || undefined,
          controlType: controlType || undefined,
        });
        if (!cancelled) setRooms(r);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load inventory");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location, controlType]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => set.add(r.propertyLocation));
    return Array.from(set);
  }, [rooms]);

  const stats = useMemo(() => {
    const dedicated = rooms.filter((r) => r.controlType === "dedicated").length;
    const blockable = rooms.filter(
      (r) =>
        r.controlType !== "dedicated" &&
        (r.status === "vacant" ||
          (r.status === "vacating" && r.blockStatus !== "approved")),
    ).length;
    const locked = rooms.length - dedicated - blockable;
    return { total: rooms.length, dedicated, blockable, locked };
  }, [rooms]);

  return (
    <DashboardShell
      title="Sales inventory"
      subtitle="Sell what's real, close faster — only owner-confirmed rooms."
      actions={<Legend />}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sellable rooms" value={stats.total} icon={BedDouble} />
        <StatCard label="Dedicated" value={stats.dedicated} hint="Top priority" icon={ShieldCheck} />
        <StatCard label="Blockable" value={stats.blockable} hint="Open + vacating" />
        <StatCard label="Locked" value={stats.locked} hint="Held by others" />
      </div>

      <div className="mt-5">
        <SectionCard
          title="Filters"
          description="Narrow inventory by location or control type"
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3 w-3" />
              {rooms.length} results
            </span>
          }
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Location
              </span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Indiranagar"
                  list="loc-options"
                  className="h-9 w-56 rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <datalist id="loc-options">
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Control type
              </span>
              <select
                value={controlType}
                onChange={(e) => setControlType(e.target.value as ControlType | "")}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">All</option>
                <option value="dedicated">Dedicated</option>
                <option value="requested">Requested</option>
                <option value="open">Open</option>
              </select>
            </label>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rooms.map((r) => (
              <RoomCard key={r._id} room={r} />
            ))}
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sellable rooms match these filters.
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function classifyRoom(r: RoomWithProperty) {
  if (r.controlType === "dedicated")
    return { tone: "success" as const, label: "Dedicated", accent: "ring-[var(--success)]/40" };
  if (
    r.status === "vacant" ||
    (r.status === "vacating" && r.blockStatus !== "approved")
  )
    return { tone: "warning" as const, label: "Blockable", accent: "ring-[var(--warning)]/40" };
  return { tone: "danger" as const, label: "Locked", accent: "ring-[var(--danger)]/40" };
}

function RoomCard({ room }: { room: RoomWithProperty }) {
  const c = classifyRoom(room);
  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg hover:shadow-black/20",
        "ring-1 ring-inset ring-transparent",
        c.accent,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Room {room.roomNumber}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {room.propertyName} · {room.propertyLocation}
          </p>
        </div>
        <StatusBadge tone={c.tone}>{c.label}</StatusBadge>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Beds</dt>
        <dd className="text-right tabular-nums">{room.beds}</dd>
        <dt className="text-muted-foreground">Rent</dt>
        <dd className="text-right tabular-nums font-medium text-foreground">
          ₹{room.actualRent.toLocaleString("en-IN")}
        </dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-right capitalize">{room.status}</dd>
        <dt className="text-muted-foreground">Block</dt>
        <dd className="text-right capitalize">{room.blockStatus}</dd>
        {room.lockedUntil && (
          <>
            <dt className="text-muted-foreground">Locked until</dt>
            <dd className="text-right text-[11px]">
              {new Date(room.lockedUntil).toLocaleString()}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <StatusBadge tone="success">Dedicated</StatusBadge>
      <StatusBadge tone="warning">Blockable</StatusBadge>
      <StatusBadge tone="danger">Locked</StatusBadge>
    </div>
  );
}
