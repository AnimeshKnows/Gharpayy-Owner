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
Returns: `RoomWithProperty[]` containing **only** rooms with status
`"vacant"` or `"vacating"` (the "no owner confirmation → no selling" rule).
Sort priority: `dedicated` first, then `blockStatus = "approved"`, then the rest.

## Models

See `src/types/models.ts` for the exact wire shapes. Mongoose schemas should
match these field-for-field. All `_id` and reference fields are serialized as
strings.

### Business rules to enforce server-side (not in frontend)

1. **No owner confirmation → no selling.** Sales inventory only returns rooms
   in `vacant` / `vacating` status.
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

Read-only owner + sales dashboards, JWT login, role guards, seeded mock data.
Mutation endpoints (block requests, visits, pitches, approvals) are documented
above for Phase 2 but not yet wired into the UI.

## Switching to your real backend

Set `VITE_API_URL=https://your-api.example.com` and rebuild. No code changes.
