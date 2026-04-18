import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Violation,
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
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [busyBlockId, setBusyBlockId] = useState<string | null>(null);

  const reloadCore = useCallback(async () => {
    if (!user) return;
    const [props, br, fd, viol] = await Promise.all([
      api.ownerProperties(user._id),
      api.ownerPendingBlockRequests(user._id),
      api.ownerEffortFeed(user._id),
      api.ownerViolations(user._id).catch(() => [] as Violation[]),
    ]);
    setProperties(props);
    setBlockRequests(br);
    setFeed(fd);
    setViolations(viol);
    setSelectedPropertyId((prev) => prev ?? props[0]?._id ?? null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reloadCore();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reloadCore]);

  const reloadRooms = useCallback(async () => {
    if (!user || !selectedPropertyId) return;
    try {
      const rs = await api.ownerRooms(user._id, selectedPropertyId);
      setRooms(rs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    }
  }, [user, selectedPropertyId]);

  useEffect(() => {
    void reloadRooms();
  }, [reloadRooms]);

  const stats = useMemo(() => {
    const vacant = rooms.filter((r) => r.status === "vacant").length;
    const dedicated = rooms.filter((r) => r.controlType === "dedicated").length;
    const dedicatedBeds = rooms
      .filter((r) => r.controlType === "dedicated")
      .reduce((s, r) => s + r.beds, 0);
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    return {
      total: rooms.length,
      vacant,
      dedicated,
      dedicatedBeds,
      occupied,
      pendingBlocks: blockRequests.length,
    };
  }, [rooms, blockRequests.length]);

  async function onStatus(roomId: string, status: "vacant" | "vacating" | "occupied") {
    if (!user) return;
    setBusyRoomId(roomId);
    setError(null);
    try {
      const vacatingDate =
        status === "vacating" ? new Date(Date.now() + 7 * 86400000).toISOString() : undefined;
      await api.ownerUpdateRoomStatus(user._id, roomId, { status, vacatingDate });
      await reloadRooms();
      await reloadCore();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyRoomId(null);
    }
  }

  async function onDedicated(roomId: string, dedicated: boolean) {
    if (!user) return;
    setBusyRoomId(roomId);
    setError(null);
    try {
      await api.ownerToggleDedicated(user._id, roomId, dedicated);
      await reloadRooms();
      await reloadCore();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyRoomId(null);
    }
  }

  async function onRespondBlock(requestId: string, action: "approve" | "reject") {
    if (!user) return;
    setBusyBlockId(requestId);
    setError(null);
    try {
      await api.ownerRespondBlockRequest(user._id, requestId, { action });
      await reloadRooms();
      await reloadCore();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Respond failed");
    } finally {
      setBusyBlockId(null);
    }
  }

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

      {!loading && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Allocation & compliance (this property)
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Dedicated rooms</dt>
              <dd className="font-medium tabular-nums">{stats.dedicated}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dedicated beds</dt>
              <dd className="font-medium tabular-nums">{stats.dedicatedBeds}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pending block requests (all props)</dt>
              <dd className="font-medium tabular-nums">{stats.pendingBlocks}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {/* TODO(WhatsApp): notify sales on block approve/reject when integrating outbound messaging. */}
            Operational controls only — messaging not wired yet.
          </p>
        </div>
      )}

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
                      type="button"
                      onClick={() => setSelectedPropertyId(p._id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {p.name}
                      <span className="ml-2 text-[10px] text-muted-foreground">· {p.location}</span>
                    </button>
                  );
                })}
                {properties.length === 0 && (
                  <p className="text-xs text-muted-foreground">No properties yet.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Rooms" description="Status, control, and quick actions">
              <div className="-mx-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Room</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Control</th>
                      <th className="px-4 py-2 text-right font-medium">Actual ₹</th>
                      <th className="px-4 py-2 text-right font-medium">Expected ₹</th>
                      <th className="px-4 py-2 font-medium">Vacating</th>
                      <th className="px-4 py-2 font-medium">Lock</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
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
                          <StatusBadge tone={controlTone(r.controlType)}>{r.controlType}</StatusBadge>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {r.actualRent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {r.expectedRent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {r.vacatingDate
                            ? new Date(r.vacatingDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {r.lockedUntil ? new Date(r.lockedUntil).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={busyRoomId === r._id}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-secondary disabled:opacity-50"
                              onClick={() => void onStatus(r._id, "vacant")}
                            >
                              Vacant
                            </button>
                            <button
                              type="button"
                              disabled={busyRoomId === r._id}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-secondary disabled:opacity-50"
                              onClick={() => void onStatus(r._id, "vacating")}
                            >
                              Vacating
                            </button>
                            <button
                              type="button"
                              disabled={busyRoomId === r._id}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-secondary disabled:opacity-50"
                              onClick={() => void onStatus(r._id, "occupied")}
                            >
                              Occupied
                            </button>
                            <button
                              type="button"
                              disabled={busyRoomId === r._id}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-secondary disabled:opacity-50"
                              onClick={() => void onDedicated(r._id, r.controlType !== "dedicated")}
                            >
                              {r.controlType === "dedicated" ? "Remove dedicated" : "Dedicated"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Room {b.roomNumber}
                          <span className="ml-1 font-normal text-muted-foreground">· {b.propertyName}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.salesUserName} · {new Date(b.requestTime).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(b.expiryTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="warning">{b.status}</StatusBadge>
                        <button
                          type="button"
                          disabled={busyBlockId === b._id}
                          className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground disabled:opacity-50"
                          onClick={() => void onRespondBlock(b._id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyBlockId === b._id}
                          className="rounded-md border border-border px-2 py-1 text-[10px] font-medium disabled:opacity-50"
                          onClick={() => void onRespondBlock(b._id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {blockRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No pending requests.</p>
                )}
              </div>
            </SectionCard>

            {violations.length > 0 && (
              <SectionCard title="Compliance violations" description="Logged overrides on committed inventory">
                <ul className="space-y-2 text-xs">
                  {violations.map((v) => (
                    <li key={v._id} className="rounded border border-destructive/30 bg-destructive/5 p-2">
                      <p className="font-medium text-destructive">{v.type}</p>
                      <p className="text-muted-foreground">{v.description}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(v.timestamp).toLocaleString()} · room {v.room}
                      </p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>

          <SectionCard title="Effort feed" description="Recent sales activity">
            <ol className="relative flex flex-col gap-3">
              {feed.map((a) => (
                <li key={a._id} className="rounded-lg border border-border bg-surface p-3">
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
