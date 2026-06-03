# Changelog — SureTrend Lab IQ

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned (backlog from data model analysis)
- `CanonicalMappingSnapshot` entity — stores the crosswalk from lab-native codes to SureTrend canonical fields; required for Story 1.7 mapping approval workflow
- `PortalUser` + `LabUserTenantRole` entities — authentication, multi-tenant isolation, role enforcement
- `LabRegistrationRequest` entity — self-service lab onboarding workflow
- `CatalogUploadBatch` entity — ties import history records to specific upload events
- `SampleTransport` entity — physical sample transport options (carrier, transit time, temperature)
- AI-assisted column mapping suggestions in catalog import wizard
- Date-range filter on Audit Trail page
- JWT authentication middleware
- Soft-delete enforcement on TestCode and ParameterCode (replace hard DELETE)

---

## [Sprint 1] — 2026-06-03

### Added — Test Transactions & Integration Channels (Stories 1.7 + 1.8)
- **`TestOrder` entity** — tracks dispatched test orders with mode (Test/Production),
  status (Dispatched → Validated/Failed), SureTrend order ID, and canonical payload JSON
- **`TestResult` entity** — 1:1 with TestOrder; records received result, analyte code
  match validation, correlation metadata, and validation notes
- **`TransportChannel` entity** — persists SFTP, REST API, Encrypted Email, and
  Self-Describing PDF channel configuration per lab location; survives server restarts
- **`InboundFileAcknowledgment` entity** — immutable 21 CFR Part 11 receipt record per
  inbound file (original file name, size, SHA-256 checksum, received-by identity, UTC timestamp)
- **EF migration** `AddTestOrdersAndTransportChannels` — schema applied on Railway restart
- **`TestOrderEndpoints`** — `GET/POST .../test-orders`, `POST .../simulate-result`
- **`TransportChannelEndpoints`** — `GET/PUT/DELETE .../channels/{type}`,
  `GET/POST .../channels/{id}/acknowledgments`
- **Lab Detail — Test Transactions tab** — dispatch test order from location's active offerings,
  simulate lab result return, analyte code validation display, readiness callout
- **Lab Detail — Integration Channels tab** — configure and persist SFTP (SureTrend-hosted
  or lab-hosted with path config), REST API (endpoint + auth type), Encrypted Email
  (S/MIME or OpenPGP), Self-Describing PDF

### Changed — Lifecycle gate enforcement
- `TestTransactionsConfirmed` transition now **blocked** unless at least one `Validated`
  test order exists for the location
- `Live` transition now **blocked** unless at least one active `TransportChannel` is configured

### Added — User stories
- `LabIQ_User_Stories_v2.txt` (v2.1) — 9 consolidated user stories replacing original 7
  - Stories 1.5, 1.7, 1.8 updated with AI mapping note, test order/result acceptance
    criteria, SFTP infrastructure detail, acknowledgment immutability requirement

---

## [Prototype Release 1] — 2026-06-02 (build parity + stability)

### Fixed — 8 bugs from verify pass
- Labs list: `primaryAddress` missing from API response (address column showed contact twice)
- `primaryStatus` ordering wrong — alphabetical string sort replaced with `Max(enum)`,
  FSNS now correctly shows "Live" instead of "Mapping Confirmed"
- `sourceLims` and accreditation missing from both list and detail API responses
- Offerings endpoint missing `Matrix`, `SampleSize`, `TestCategory` fields (all showed "—")
- "Catalog (3)" tab label showed location count — changed to plain "Catalog"
- React Fragment key warnings in `MasterTestsPage` and `LabDetailPage`
- Vite proxy corrected from port 5000 to port 8080

### Added — EF Core migrations
- Installed `dotnet-ef` 7.0.20 global tool + `Microsoft.EntityFrameworkCore.Design`
- Generated `Migrations/InitialCreate` from full domain model
- Replaced `EnsureDeleted + EnsureCreated` with `db.Database.Migrate()` —
  **database now persists across Railway restarts**
- Documented migration workflow in `CLAUDE.md`

### Added — Feature parity with HTML prototype
- **Dashboard** — stat cards (5), 9-step onboarding journey with descriptions, lab coverage
  progress bars, recent activity feed, quick actions
- **Catalog Upload Wizard** — 4-step modal: drag-drop, column mapping with 10-row preview
  and manual override, lab selection, confirm with "what will happen" list, done state
  with verification table
- **Audit Trail page** — standalone filterable/searchable page with event type dropdown,
  Before/After/Justification columns, Export CSV button
- **Master Tests page** — Matrix/Sample Size/Category columns, expandable analyte sub-table
  with bridge key display, full add/edit modal, inline analyte creation in link modal
- **Master Analytes page** — full CRUD, method/unit/result type columns
- **Lab Offerings page** — coverage bar, time zone, metadata columns, checkbox toggle,
  bulk select/clear
- **Transports page** — REST API (live fetch emulator), SFTP (SSH debug log mock),
  Encrypted Email (ciphertext preview), Self-Describing PDF (hidden payload toggle)
- **Toast notifications** — auto-dismiss, 4 color variants, fires on all write operations
- **Callout component** — info/warning/success/danger inline callouts
- **Expanded seed data** — 3 labs, 7 locations, 13 test codes, 13 analytes, 22 offerings
- **Source LIMS field** on Lab entity
- **Test metadata fields** (Matrix, SampleSize, TestCategory) on TestCode entity
- **Sidebar** — all 7 nav items wired with routes

---

## [Prototype Release 0] — 2026-06-02 (initial build)

### Added — Full-stack scaffold
- **ASP.NET Core 7 minimal API** + Entity Framework Core 7 + SQLite
- **React 18 + TypeScript + Vite** SPA with SureTrend brand (cyan #1FB7E8)
- **Domain model** — Lab, LabLocation, TestCode, TestDescription (effective-dated),
  ParameterCode, ParameterDescription (effective-dated), TestParameterAssociation,
  LocationTestAvailability, AuditEvent, LabLifecycleState enum
- **Labs list page** — create, search, view with lifecycle status badge
- **Lab detail page** — Catalog tab with expand-to-parameters, Locations tab with
  lifecycle transitions, Audit Log tab
- **Lifecycle state machine** — Draft → CatalogLoaded → MappingConfirmed →
  TestTransactionsConfirmed → Live → Suspended
- **Catalog ingestion** — CSV/XLSX upload with all-or-nothing validation, effective-dated
  description history, 1..* cardinality preservation
- **Point-in-time query** — `GET .../catalog/point-in-time?asOf=` returns catalog as
  it appeared on any past date
- **Audit trail** — append-only `AuditEvent` with actor identity, timestamps UTC, reason
- **Seed data** — FSNS lab with Bloomsburg + Meadville locations and sample catalog
- **Deployment** — Dockerfile (multi-stage .NET 7), Railway (API), Vercel (UI)
- **CORS** — configurable via `ALLOWED_ORIGINS` env var
- **Port binding** — reads `PORT` env var at runtime (Railway compatible)
- **`CLAUDE.md`** — project documentation for Claude Code context

---

## Development conventions

```bash
# Schema change workflow
dotnet ef migrations add <DescriptiveName>   # generates migration
git add Migrations/                          # commit it
git push                                     # Railway applies on deploy

# Run locally
cd labiq-api/LabIQ.Api && dotnet run --no-launch-profile   # API on :8080
cd labiq-ui && npm run dev                                  # UI on :5173
```

See `CLAUDE.md` for full conventions, brand tokens, and entity rules.
