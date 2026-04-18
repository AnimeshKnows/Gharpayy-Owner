import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { BedDouble, Filter, MapPin, ShieldCheck } from "lucide-react";
import { DashboardShell, SectionCard, StatCard, StatusBadge } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ControlType, RoomWithProperty } from "@/types/models";

function parseControlType(raw: unknown): ControlType | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "open" || v === "requested" || v === "dedicated") return v;
  return undefined;
}

export const Route = createFileRoute("/sales/dashboard")({
  validateSearch: (raw: Record<string, unknown>) => {
    const locRaw = raw.location;
    const location =
      typeof locRaw === "string"
        ? locRaw.trim() || undefined
        : Array.isArray(locRaw) && typeof locRaw[0] === "string"
          ? locRaw[0].trim() || undefined
          : undefined;
    const controlType = parseControlType(raw.controlType);
    return { location, controlType };
  },
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Priority bucket matching backend GET /api/sales/inventory ordering. */
function inventoryTier(r: RoomWithProperty): 1 | 2 | 3 {
  if (r.controlType === "dedicated") return 1;
  if (r.blockStatus === "approved") return 2;
  return 3;
}

function SalesDashboard() {
  const search = useSearch({ from: "/sales/dashboard" });
  const navigate = useNavigate({ from: "/sales/dashboard" });

  const [locationInput, setLocationInput] = useState(() => search.location ?? "");
  const debouncedLocation = useDebouncedValue(locationInput, 400);

  useEffect(() => {
    const next = debouncedLocation.trim();
    const cur = (search.location ?? "").trim();
    if (next === cur) return;
    void navigate({
      search: (prev) => ({
        ...prev,
        location: next.length ? next : undefined,
      }),
      replace: true,
    });
  }, [debouncedLocation, navigate, search.location]);

  const [rooms, setRooms] = useState<RoomWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.salesInventory({
          location: search.location,
          controlType: search.controlType,
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
  }, [search.location, search.controlType]);

  const { dedicated, approvedLock, fresh } = useMemo(() => {
    const dedicated = rooms.filter((r) => inventoryTier(r) === 1);
    const approvedLock = rooms.filter((r) => inventoryTier(r) === 2);
    const fresh = rooms.filter((r) => inventoryTier(r) === 3);
    return { dedicated, approvedLock, fresh };
  }, [rooms]);

  const refreshInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.salesInventory({
        location: search.location,
        controlType: search.controlType,
      });
      setRooms(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [search.location, search.controlType]);

  return (
    <DashboardShell
      title="Sales inventory"
      subtitle="Sell what's real, close faster — owner-confirmed and pipeline-visible rooms."
      actions={<Legend />}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Listed rooms" value={rooms.length} icon={BedDouble} />
        <StatCard label="Dedicated tier" value={dedicated.length} hint="Top priority" icon={ShieldCheck} />
        <StatCard label="Approved lock tier" value={approvedLock.length} hint="High-intent path" />
        <StatCard label="Fresh tier" value={fresh.length} hint="Open / other" />
      </div>

      <div className="mt-5">
        <SectionCard
          title="Filters"
          description="Location updates the URL after a short pause; control type updates immediately."
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
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Match property location…"
                  className="h-9 w-56 rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Control type
              </span>
              <select
                value={search.controlType ?? ""}
                onChange={(e) => {
                  const v = e.target.value as ControlType | "";
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      controlType:
                        v === "open" || v === "requested" || v === "dedicated" ? v : undefined,
                    }),
                    replace: true,
                  });
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="requested">Requested</option>
                <option value="dedicated">Dedicated</option>
              </select>
            </label>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <InventorySection
              title="Dedicated inventory"
              description="Owner-committed dedicated control — highest priority."
              rooms={dedicated}
              onInventoryChange={refreshInventory}
            />
            <InventorySection
              title="Locked for high-intent buyers"
              description="Approved block path — strong buyer signal."
              rooms={approvedLock}
              onInventoryChange={refreshInventory}
            />
            <InventorySection
              title="Fresh vacancies"
              description="Open, pending, or rejected block states — still sellable when vacant or vacating."
              rooms={fresh}
              onInventoryChange={refreshInventory}
            />
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground">No rooms match these filters.</p>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function InventorySection({
  title,
  description,
  rooms,
  onInventoryChange,
}: {
  title: string;
  description: string;
  rooms: RoomWithProperty[];
  onInventoryChange: () => Promise<void>;
}) {
  if (rooms.length === 0) return null;
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((r) => (
          <RoomCard key={r._id} room={r} onInventoryChange={onInventoryChange} />
        ))}
      </div>
    </section>
  );
}

type ModalState =
  | null
  | { kind: "block"; room: RoomWithProperty }
  | { kind: "visit"; room: RoomWithProperty };

function RoomCard({
  room,
  onInventoryChange,
}: {
  room: RoomWithProperty;
  onInventoryChange: () => Promise<void>;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const tier = inventoryTier(room);
  const tone =
    tier === 1 ? ("success" as const) : tier === 2 ? ("warning" as const) : ("muted" as const);
  const label =
    tier === 1 ? "Dedicated" : tier === 2 ? "Approved lock" : "Fresh";
  const accent =
    tier === 1
      ? "ring-[var(--success)]/40"
      : tier === 2
        ? "ring-[var(--warning)]/40"
        : "ring-border/60";

  const lockHint =
    room.blockStatus === "pending"
      ? "Pending sales block — awaiting owner response."
      : room.blockStatus === "approved" && room.lockedUntil
        ? `Approved lock until ${new Date(room.lockedUntil).toLocaleString()}`
        : null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setLocalErr(null);
    try {
      await fn();
      await onInventoryChange();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg hover:shadow-black/20",
        "ring-1 ring-inset ring-transparent",
        accent,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Room {room.roomNumber}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {room.propertyName} · {room.propertyLocation}
          </p>
        </div>
        <StatusBadge tone={tone}>{label}</StatusBadge>
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
        <dt className="text-muted-foreground">Control</dt>
        <dd className="text-right capitalize">{room.controlType}</dd>
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
      {lockHint && (
        <p className="mt-2 text-[10px] text-amber-600/90 dark:text-amber-400/90">{lockHint}</p>
      )}
      {localErr && (
        <p className="mt-2 text-[10px] text-destructive">{localErr}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-secondary disabled:opacity-50"
          onClick={() => setModal({ kind: "block", room })}
        >
          Request block
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-secondary disabled:opacity-50"
          onClick={() => setModal({ kind: "visit", room })}
        >
          Schedule visit
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-secondary disabled:opacity-50"
          onClick={() =>
            void run(async () => {
              await api.salesCreateActionLog({ roomId: room._id, actionType: "pitch" });
            })
          }
        >
          Log pitch
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-secondary disabled:opacity-50"
          onClick={() =>
            void run(async () => {
              await api.salesCreateActionLog({ roomId: room._id, actionType: "virtual_tour" });
            })
          }
        >
          Virtual tour done
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-secondary disabled:opacity-50"
          onClick={() =>
            void run(async () => {
              await api.salesCreateActionLog({ roomId: room._id, actionType: "booking" });
            })
          }
        >
          Mark booking
        </button>
      </div>
      {modal?.kind === "block" && modal.room._id === room._id && (
        <BlockModal
          room={room}
          onClose={() => setModal(null)}
          onSubmit={async (expiryHours) => {
            await api.salesCreateBlockRequest({ roomId: room._id, expiryHours });
            setModal(null);
            await onInventoryChange();
          }}
        />
      )}
      {modal?.kind === "visit" && modal.room._id === room._id && (
        <VisitModal
          room={room}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await api.salesCreateVisit(payload);
            setModal(null);
            await onInventoryChange();
          }}
        />
      )}
    </article>
  );
}

function BlockModal({
  room,
  onClose,
  onSubmit,
}: {
  room: RoomWithProperty;
  onClose: () => void;
  onSubmit: (expiryHours: number) => Promise<void>;
}) {
  const [hours, setHours] = useState("6");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm font-semibold">Request block</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Room {room.roomNumber} · {room.propertyName}
        </p>
        <label className="mt-3 block text-xs">
          <span className="text-muted-foreground">Expiry (hours)</span>
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border border-border px-3 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            onClick={() => {
              setSaving(true);
              setErr(null);
              const n = Math.max(1, parseInt(hours, 10) || 6);
              void onSubmit(n)
                .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
                .finally(() => setSaving(false));
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitModal({
  room,
  onClose,
  onSubmit,
}: {
  room: RoomWithProperty;
  onClose: () => void;
  onSubmit: (p: {
    roomId: string;
    customerName: string;
    customerPhone?: string;
    visitType: "virtual" | "physical";
    scheduledTime: string;
  }) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [visitType, setVisitType] = useState<"virtual" | "physical">("physical");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm font-semibold">Schedule visit</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Room {room.roomNumber} · {room.propertyName}
        </p>
        <input
          placeholder="Customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="mt-3 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Phone (optional)"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="mt-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <select
          value={visitType}
          onChange={(e) => setVisitType(e.target.value as "virtual" | "physical")}
          className="mt-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="physical">Physical</option>
          <option value="virtual">Virtual</option>
        </select>
        <label className="mt-2 block text-xs text-muted-foreground">
          Scheduled (local datetime)
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border border-border px-3 py-1.5 text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            onClick={() => {
              if (!customerName.trim() || !scheduledTime) {
                setErr("Name and scheduled time required");
                return;
              }
              setSaving(true);
              setErr(null);
              const iso = new Date(scheduledTime).toISOString();
              void onSubmit({
                roomId: room._id,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim() || undefined,
                visitType,
                scheduledTime: iso,
              })
                .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
                .finally(() => setSaving(false));
            }}
          >
            Save
          </button>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          {/* TODO(WhatsApp): send visit confirmation to customer when WhatsApp is integrated. */}
        </p>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      <StatusBadge tone="success">Dedicated</StatusBadge>
      <StatusBadge tone="warning">Approved lock</StatusBadge>
      <StatusBadge tone="muted">Fresh</StatusBadge>
    </div>
  );
}
