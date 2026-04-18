import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Activity, BedDouble, ShieldCheck } from "lucide-react";
import { DashboardShell, SectionCard, StatCard, StatusBadge } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ActionLogWithRoom,
  BlockRequestWithRoom,
  Property,
  RoomWithProperty,
} from "@/types/models";

export const Route = createFileRoute("/owner/dashboard")({
  head: () => ({
    meta: [
      { title: "Owner dashboard — Gharpayy Inventory OS" },
      {
        name: "description",
        content:
          "Properties, room status, pending block requests, and effort feed for Gharpayy owners.",
      },
    ],
  }),
  component: OwnerDashboardRoute,
});

function OwnerDashboardRoute() {
  return (
    <RoleGuard allow={["owner"]}>
      <OwnerDashboard />
    </RoleGuard>
  );
}

function OwnerDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomWithProperty[]>([]);
  const [blockRequests, setBlockRequests] = useState<BlockRequestWithRoom[]>([]);
  const [feed, setFeed] = useState<ActionLogWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [props, br, fd] = await Promise.all([
          api.ownerProperties(user._id),
          api.ownerPendingBlockRequests(user._id),
          api.ownerEffortFeed(user._id),
        ]);
        if (cancelled) return;
        setProperties(props);
        setSelectedPropertyId(props[0]?._id ?? null);
        setBlockRequests(br);
        setFeed(fd);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedPropertyId) return;
    let cancelled = false;
    (async () => {
      try {
        const rs = await api.ownerRooms(user._id, selectedPropertyId);
        if (!cancelled) setRooms(rs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load rooms");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedPropertyId]);

  const stats = useMemo(() => {
    const vacant = rooms.filter((r) => r.status === "vacant").length;
    const dedicated = rooms.filter((r) => r.controlType === "dedicated").length;
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    return {
      total: rooms.length,
      vacant,
      dedicated,
      occupied,
    };
  }, [rooms]);

  return (
    <DashboardShell
      title="Owner dashboard"
      subtitle="Fill my beds, don't lose control."
    >
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Properties" value={properties.length} icon={Building2} />
        <StatCard label="Rooms" value={stats.total} hint={`${stats.occupied} occupied`} icon={BedDouble} />
        <StatCard label="Vacant" value={stats.vacant} hint="Available now" icon={Activity} />
        <StatCard label="Dedicated" value={stats.dedicated} hint="Locked to Gharpayy" icon={ShieldCheck} />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <SectionCard
              title="Properties"
              description="Switch property to inspect its rooms"
            >
              <div className="flex flex-wrap gap-2">
                {properties.map((p) => {
                  const active = selectedPropertyId === p._id;
                  return (
                    <button
                      key={p._id}
                      onClick={() => setSelectedPropertyId(p._id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {p.name}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        · {p.location}
                      </span>
                    </button>
                  );
                })}
                {properties.length === 0 && (
                  <p className="text-xs text-muted-foreground">No properties yet.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Rooms" description="Live status & control type">
              <div className="-mx-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Room</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Control</th>
                      <th className="px-4 py-2 text-right font-medium">Actual ₹</th>
                      <th className="px-4 py-2 text-right font-medium">Expected ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr
                        key={r._id}
                        className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                      >
                        <td className="px-4 py-2.5 font-medium">{r.roomNumber}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge tone={controlTone(r.controlType)}>
                            {r.controlType}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {r.actualRent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {r.expectedRent.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-xs text-muted-foreground"
                        >
                          No rooms in this property.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Pending block requests"
              description="Sales is waiting on your call"
              actions={
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {blockRequests.length} pending
                </span>
              }
            >
              <div className="flex flex-col gap-2">
                {blockRequests.map((b) => (
                  <div
                    key={b._id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Room {b.roomNumber}
                          <span className="ml-1 font-normal text-muted-foreground">
                            · {b.propertyName}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.salesUserName} · {new Date(b.requestTime).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(b.expiryTime).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge tone="warning">{b.status}</StatusBadge>
                    </div>
                  </div>
                ))}
                {blockRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No pending requests.</p>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Effort feed" description="Recent sales activity">
            <ol className="relative flex flex-col gap-3">
              {feed.map((a) => (
                <li
                  key={a._id}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize">
                      {a.actionType.replace(/_/g, " ")}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Room {a.roomNumber} · {a.propertyName}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.salesUserName}</p>
                  {a.notes && <p className="mt-1.5 text-xs">{a.notes}</p>}
                </li>
              ))}
              {feed.length === 0 && (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              )}
            </ol>
          </SectionCard>
        </div>
      )}
    </DashboardShell>
  );
}

function statusTone(status: RoomWithProperty["status"]) {
  switch (status) {
    case "vacant":
      return "success" as const;
    case "vacating":
      return "warning" as const;
    case "blocked":
      return "danger" as const;
    case "reserved":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function controlTone(control: RoomWithProperty["controlType"]) {
  switch (control) {
    case "dedicated":
      return "success" as const;
    case "requested":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}
