# Gharpayy Inventory OS — API Contract

This frontend (TanStack Start + React + TS + Tailwind) talks to your
**Node.js + Express + TypeScript + MongoDB (Mongoose)** backend over REST.

The frontend reads `VITE_API_URL` at build time. When unset, it uses an
in-memory mock that implements the same contract — useful for local UI work
without a running backend.

## Auth

JWT in the `Authorization: Bearer <token>` header. (You can also set it as an
HttpOnly cookie server-side; the client also sends `credentials: "include"`.)

### `POST /api/auth/login`
Body: `{ email: string, password: string }`
Returns: `{ token: string, user: User }`

### `GET /api/auth/me`
Returns the current `User`, or 401.

## Roles

Three roles enforced by middleware on the server:
- `owner` — only `/api/owner/**`
- `sales` — only `/api/sales/**`
- `admin` — `/api/admin/**` (out of scope for Phase 1)

Reject with 403 if the JWT role does not match.

## Owner endpoints

All require role `owner` AND the `:ownerId` in the path must match the JWT user.

### `GET /api/owner/:ownerId/properties`
Returns: `Property[]`

### `GET /api/owner/:ownerId/rooms?propertyId=<id>`
Returns: `RoomWithProperty[]` (Room joined with `propertyName`, `propertyLocation`).

### `GET /api/owner/:ownerId/block-requests?status=pending`
Returns: `BlockRequestWithRoom[]` for rooms belonging to this owner.

### `GET /api/owner/:ownerId/effort-feed?limit=20`
Returns: `ActionLogWithRoom[]`, newest first, scoped to this owner's rooms.

## Sales endpoints

Require role `sales`.

### `GET /api/sales/inventory?location=<str>&controlType=<open|requested|dedicated>`
Returns: `RoomWithProperty[]` for **sellable and pipeline-visible** inventory:

- **Included:** `status` is `"vacant"` or `"vacating"`, **or** `status` is `"reserved"`
  while `controlType` is `"dedicated"` **or** `blockStatus` is `"approved"` (rooms
  that reached reserved only through the booking gate stay visible to sales).

**Query filters**

- `location` — case-insensitive substring match against `Property.location` (not
  the joined display string alone).
- `controlType` — when set, only rooms with that `Room.controlType`.

**Sort order**

1. Priority bucket: `controlType = "dedicated"` first, then `blockStatus = "approved"`
   (and not already in the dedicated bucket), then all others.
2. Within the same bucket: `property.name` ascending, then `roomNumber` ascending.

### `POST /api/sales/block-requests`
Body: `{ roomId: string, expiryHours?: number }` (default `6`)  
Creates a pending `BlockRequest`, sets `room.blockStatus = "pending"`, sets
`room.controlType = "requested"` when not already `dedicated`, and writes an
`ActionLog` (`pitch` with notes). Returns the created `BlockRequest` wire shape.

### `POST /api/sales/visits`
Body: `{ roomId, customerName, customerPhone?, visitType: "virtual"|"physical", scheduledTime }`  
Creates `Visit` and `ActionLog` (`visit_scheduled`). Returns `Visit`.

### `POST /api/sales/action-logs`
Body: `{ roomId, actionType: "pitch"|"virtual_tour"|"visit_done"|"booking", notes? }`  
Creates `ActionLog`. For `booking`, enforces booking gate; on success sets
`room.status = "reserved"` and returns `{ actionLog, room }`. Otherwise returns
`{ actionLog }`.

## Owner mutations (same auth as other owner routes)

### `GET /api/owner/:ownerId/violations`
Returns `Violation[]` for that owner (newest first, capped).

### `PATCH /api/owner/:ownerId/rooms/:roomId/status`
Body: `{ status: "vacant"|"vacating"|"occupied", vacatingDate?: ISO }`  
Updates room; may append `Violation` on conflicting overrides. Returns
`RoomWithProperty`.

### `PATCH /api/owner/:ownerId/rooms/:roomId/dedicated`
Body: `{ dedicated: boolean }`  
Toggles dedicated control, syncs `Allocation` for the property, may log
`Violation`. Returns `RoomWithProperty`.

### `POST /api/owner/:ownerId/block-requests/:requestId/respond`
Body: `{ action: "approve"|"reject" }`  
Approves/rejects block; updates room lock / block fields per business rules.
Returns `{ blockRequest, room }` (minimal wire shapes).

## System

### `POST /api/system/sweep-locks`
Protected by header `x-internal-key` matching env `INTERNAL_SWEEP_KEY` (min 8
chars). Clears expired approved locks on rooms. Returns `{ updated: number }`.

## Models

See `src/types/models.ts` for the exact wire shapes. Mongoose schemas should
match these field-for-field. All `_id` and reference fields are serialized as
strings.

### Business rules to enforce server-side (not in frontend)

1. **No owner confirmation → no selling.** Sales inventory is primarily
   `vacant` / `vacating`; a narrow `reserved` slice (dedicated or approved-block
   path) is included for pipeline visibility. Other statuses are excluded.
2. **Every visit tied to a room.** Reject `Visit` creation without a valid
   `room` reference.
3. **Every action logged.** Creating a `Visit`, virtual tour, or pitch must
   also create a matching `ActionLog`.
4. **Auto-lock on approval.** Approving a `BlockRequest` sets
   `room.blockStatus = "approved"`, `room.controlType = "requested"` (or
   `"dedicated"` if already so), and `room.lockedUntil = expiryTime`.
5. **Expired locks reset.** Expose `POST /api/system/sweep-locks` (cron-able)
   that resets rooms where `lockedUntil < now` back to `blockStatus = "none"`.
6. **Owner override → Violation.** If owner mutates a room with
   `blockStatus = "approved"` or `controlType = "dedicated"` to break a
   commitment, write a `Violation` record.
7. **Booking gate.** Status can only move to `"reserved"` if
   `controlType = "dedicated"` OR `blockStatus = "approved"`.

## Phase 1 scope (this frontend)

JWT login, role guards, dashboards, and **mutations when `VITE_API_URL` points at
this API**. The in-memory mock remains read-only for owner/sales writes unless
extended later.

## Switching to your real backend

Set `VITE_API_URL=https://your-api.example.com` and rebuild. No code changes.
