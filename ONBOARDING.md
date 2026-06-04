# Lab IQ — Developer Onboarding Guide

Welcome to the SureTrend Lab IQ prototype. This guide gives you everything you need to
get up to speed in one session.

---

## What this project is

Lab IQ is the SureTrend module that onboards external food and beverage testing labs and
manages the digital integration between SureTrend and those labs. A lab goes through a
structured workflow — uploading their test catalog, getting the canonical field mapping
approved, validating round-trip test transactions — before going Live and receiving
production orders.

The prototype is fully deployed:
- **UI:** https://diegostevelabiq.vercel.app
- **API:** https://diegostevelabiq-production.up.railway.app
- **Repo:** https://github.com/2steve2romig/diegostevelabiq

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | ASP.NET Core 7 minimal API |
| ORM | EF Core 7 + SQLite → SQL Server (production) |
| Frontend | React 18 + TypeScript + Vite |
| Hosting | Railway (API) + Vercel (UI) — auto-deploy on push to `master` |

---

## Getting started

```bash
git clone https://github.com/2steve2romig/diegostevelabiq.git
cd diegostevelabiq

# API (Terminal 1)
cd labiq-api/LabIQ.Api
dotnet run --no-launch-profile        # http://localhost:8080

# UI (Terminal 2)
cd labiq-ui
npm install
npm run dev                           # http://localhost:5173
```

The database creates and seeds itself on first run via EF Core migrations.

---

## Project structure

```
labiq-api/LabIQ.Api/
  Domain/          Entity classes (Lab, TestCode, TransportChannel, TestOrder, etc.)
  Data/            DbContext + Migrations/ + SeedData
  Endpoints/       One file per feature area (LabEndpoints, CatalogEndpoints, etc.)
  Services/        Business logic (CatalogIngestionService, AuditService)

labiq-ui/src/
  api/             Typed client (client.ts) + TypeScript types (types.ts)
  components/      Sidebar, Toast, Callout, CatalogUploadWizard, LifecycleBadge
  pages/           DashboardPage, LabsPage, LabDetailPage, MasterTestsPage, etc.
  styles/          globals.css with SureTrend brand tokens
```

---

## Key domain concepts

**Labs and Locations**
A `Lab` (e.g., FSNS) has 1..* `LabLocation` entries (e.g., FSNS-BLM, FSNS-MDV).
Lab codes and location codes are **immutable once saved**.

**Test catalog**
`TestCode` → 1..* `ParameterCode` (never collapse on test code alone).
Both have effective-dated description history (`TestDescription`, `ParameterDescription`)
so historical records can be reproduced at any past date.

**Lifecycle state machine**
Each `LabLocation` has a `Status`:
```
Draft → CatalogLoaded → MappingConfirmed → TestTransactionsConfirmed → Live → Suspended
```
Only SureTrend Admin can advance past MappingConfirmed.
`TestTransactionsConfirmed` requires a validated `TestOrder` on record.
`Live` requires at least one active `TransportChannel`.

**Audit trail**
Every write produces an immutable `AuditEvent`. Never delete audit events.

---

## Schema change workflow

```bash
# 1. Modify entity in Domain/
# 2. Generate migration
cd labiq-api/LabIQ.Api
dotnet ef migrations add <DescriptiveName>
# 3. Commit and push — Railway applies the migration on next deploy
git add Migrations/ && git commit -m "Add <DescriptiveName> migration"
git push
```

---

## What's been built (Sprint 1)

See `LabIQ_Release_Notes_v1.md` for a full business-facing summary.

**Working features:**
- Dashboard with stat cards, 9-step onboarding journey, lab coverage bars
- Labs list + Lab Detail (Catalog, Locations, Test Transactions, Integration Channels, Audit Log)
- Master Tests + Master Analytes (full CRUD, effective-dated descriptions, analyte linking)
- Lab Offerings (per-location test toggle, coverage %)
- Catalog Upload Wizard (4-step: file drop → column mapping → lab select → commit)
- Lifecycle state machine with real prerequisite gates
- Test order dispatch + result simulation + validation
- Transport channel configuration (SFTP, REST API, Email, PDF — persisted to DB)
- Audit Trail page (filter, search, Export CSV)
- Transports emulator page

**Key entities added this sprint:**
`TestOrder`, `TestResult`, `TransportChannel`, `InboundFileAcknowledgment`

---

## What's coming (Sprint 2+)

See `CHANGELOG.md` → Unreleased section.

Priority order:
1. `CanonicalMappingSnapshot` — crosswalk from lab-native codes to SureTrend canonical
2. `PortalUser` + `LabUserTenantRole` — authentication + multi-tenant isolation
3. `CatalogUploadBatch` — import history log
4. `SampleTransport` — physical sample transport options
5. Real SFTP/email/API connectivity (SSH.NET, MailKit)

---

## Important conventions

- **No hard deletes** on TestCode or ParameterCode — set `ActiveFlag = false`
- **Every write endpoint** must append an `AuditEvent` before returning 200
- **Code fields** (`lab_code`, `test_code`, `parameter_code`) are immutable — reject edits with 400
- **All timestamps** stored and returned in UTC ISO 8601
- **Migrations only** — never use `EnsureDeleted` or `EnsureCreated` in production code

---

## Brand tokens

```css
--st-cyan: #1FB7E8       /* Primary blue */
--st-cyan-dark: #0095CC  /* Hover state */
--st-text: #2C3E50       /* Body text */
--st-border: #E1E8ED     /* Card borders */
--st-page-bg: #F4F6F8    /* Page background */
--st-success: #2BA84A
--st-warning: #E89015
--st-danger: #C0392B
```

Font: `'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif`, 13px base.

---

## Reference documents in this repo

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Auto-loaded by Claude Code — project rules and conventions |
| `CHANGELOG.md` | Technical change log by sprint |
| `LabIQ_Release_Notes_v1.md` | Stakeholder-facing feature summary + roadmap |
| `LabIQ_User_Stories_v2.txt` | 9 user stories (v2.1) — authoritative requirements |
| `sample_lab_catalog.csv` | Sample catalog file for testing the catalog upload wizard |
| `reference/eurofins/` | **Real Eurofins integration documents** (see README inside) |
| `reference/eurofins/eurofins-order-template.json` | Eurofins B2B canonical order schema — what SureTrend sends |
| `reference/eurofins/eurofins-results-template.json` | Eurofins B2B canonical results schema — what SureTrend receives |
| `reference/eurofins/eurofins-sample-order.json` | Filled-in sample order (Salmonella PCR on chocolate) |
| `reference/eurofins/eurofins-sarf-ecal.pdf` | Eurofins SARF paper form — electronic equivalent is the JSON order |
| `Labs_text_extracts/` | Source SRS, user stories, PM agent docs (read-only, not in git) |
