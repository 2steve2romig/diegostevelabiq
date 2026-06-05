# Lab IQ — Session Notes
**Date:** June 3, 2026
**Participants:** Steve Romig (Product Owner), Claude (AI Architect/Developer)
**Duration:** Full day session
**Session goal:** Build, deploy, and evaluate a working prototype of the SureTrend Lab IQ Onboarding & Integration Portal

---

## 1. Session Overview

This session took a Lab IQ concept — defined in an existing SRS v0.1, a set of source documents, and a single-file HTML prototype — and produced a fully deployed, full-stack prototype application. The session covered architecture decisions, full-stack development, deployment, code review, user story development, data model analysis, and reference document organization.

The session did not include any external customer data. All work product is in the GitHub repository:
**https://github.com/2steve2romig/diegostevelabiq**

---

## 2. Starting Point

The session began with the following assets in `C:\Users\sromig\LABIQ`:

- `Lab_IQ_Onboarding_Portal_Functional_edited.html` — a 164KB single-file HTML/JS functional prototype with SureTrend branding
- `Labs_text_extracts/` — plain-text extracts of the SRS, user stories, PM agent document, Eurofins canonical JSON reference, and FSNS test catalogs
- `sample_lab_catalog.csv` — 8-row sample test catalog with Listeria, Salmonella, Yeast/Mold, and Cronobacter tests

**Key reference documents read at session start:**
- SRS v0.1 (54K tokens) — full functional requirements including FR-1 through FR-52, lifecycle state machine, transport channels, 21 CFR Part 11 requirements
- PM Agent document — domain model for lab-native vs. SureTrend canonical data
- Eurofins B2B Canonical JSON reference — the canonical format the SRS is built on

---

## 3. Key Architectural Decisions

### 3.1 Stack selection
**Decision:** ASP.NET Core 7 Minimal API + Entity Framework Core 7 + SQLite (prototype → SQL Server) + React 18 + TypeScript + Vite

**Rationale:**
- .NET is the right fit for 21 CFR Part 11 compliance (mature audit trail patterns, EF append-only tables)
- SFTP, S/MIME, PGP, mTLS all have mature .NET libraries (SSH.NET, MailKit, BouncyCastle)
- Enterprise food/pharma ISVs and lab partners expect .NET
- React/Vite for fast UI development matching SureTrend brand

### 3.2 API-first discipline
**Decision:** React frontend never touches state directly — everything goes through typed API endpoints

**Rationale:** Keeps the frontend as a thin skin over the real data contract. When the production backend lands, the frontend doesn't change.

### 3.3 Code-first EF Core (not database-first)
**Decision:** Define C# entity classes → generate migrations → never edit migrations manually

**Rationale:** SQL Server migration is a package swap (`UseSqlite` → `UseSqlServer` + connection string). All migration files remain valid.

### 3.4 SQLite → SQL Server path
**Decision:** Start with SQLite for prototype simplicity, stay ready for SQL Server

**Key moment:** Early deployment used `EnsureDeleted + EnsureCreated` which wiped the database on every Railway restart. This was identified as a critical bug and replaced with proper EF Core migrations during the session.

### 3.5 Per-lab test codes (not account-global)
**Decision:** `TestCode.LabId` FK — test codes are unique per lab, not per account

**Rationale:** Eurofins `QM103` and FSNS `QM103` can be completely different tests. Account-global uniqueness (as suggested in the original rough user stories) would force renaming collisions on every new lab onboarded.

### 3.6 Soft delete only
**Decision:** TestCode and ParameterCode are never physically deleted — `ActiveFlag = false` only

**Rationale:** 21 CFR Part 11 requires codes to be immutable once persisted. Hard DELETE destroys audit traceability. (Note: this convention was established but not yet enforced in code — flagged as a known issue.)

### 3.7 Effective-dated description history
**Decision:** `TestDescription` and `ParameterDescription` entities with `EffectiveStart`, `EffectiveEnd`, `IsCurrent` — never overwrite descriptions

**Rationale:** SRS FR-20 to FR-24 require point-in-time reproduction of any historical record. A lab can rename `QM103` from "Listeria detection" to "Listeria monocytogenes detection" and historical reports must show the name that was active at the time of the test.

### 3.8 Multi-canonical architecture
**Decision:** Design for multiple lab-specific canonical formats via `LabCanonicalProfile` + `CanonicalFieldMapping` + `CanonicalMappingSnapshot` entities (Sprint 2)

**Rationale:** Eurofins uses their B2B JSON v1.0. FSNS (LabWare) uses a different format. STARLIMS (Certified) uses another. A single transformation pipeline with per-lab configuration is required for scale.

---

## 4. What Was Built

### 4.1 Domain model (EF Core entities)

| Entity | Purpose |
|--------|---------|
| `Lab` | Lab company with LabCompanyCode (immutable), LIMS, accreditation |
| `LabLocation` | Physical location with LabLocationCode (immutable), time zone, lifecycle status |
| `LabLifecycleState` | Enum: Draft → CatalogLoaded → MappingConfirmed → TestTransactionsConfirmed → Live → Suspended |
| `TestCode` | Lab-native test code with Matrix, SampleSize, TestCategory |
| `TestDescription` | Effective-dated description history for test codes |
| `ParameterCode` | Lab-native analyte/parameter code with method, unit, result type |
| `ParameterDescription` | Effective-dated description history for parameters |
| `TestParameterAssociation` | 1..* test-to-parameter bridge (composite key) |
| `LocationTestAvailability` | Which tests are offered at which location |
| `AuditEvent` | Append-only 21 CFR Part 11 audit record |
| `TestOrder` | Dispatched test order (Test or Production mode) |
| `TestResult` | Inbound result with analyte code validation and correlation metadata |
| `TransportChannel` | Persisted channel config: SFTP, REST API, Encrypted Email, Self-Describing PDF |
| `InboundFileAcknowledgment` | Immutable receipt per inbound file (name, size, SHA-256, identity, UTC) |

### 4.2 EF Core migrations

Two migrations generated:
- `InitialCreate` — full domain model at switch from EnsureDeleted to Migrate()
- `AddTestOrdersAndTransportChannels` — new entities from Sprint 1

### 4.3 Backend endpoints

| Feature area | Key endpoints |
|---|---|
| Labs | GET/POST /api/labs, GET /api/labs/{id}, POST locations, POST lifecycle |
| Catalog | POST upload (CSV/XLSX), GET list, GET test/param history, GET point-in-time |
| Master Tests | GET/POST/PUT/DELETE /api/tests, POST/DELETE analyte links |
| Master Analytes | GET/POST/PUT/DELETE /api/analytes |
| Dashboard | GET /api/dashboard (stats, coverage, recent activity) |
| Offerings | GET/POST/DELETE /api/labs/{id}/locations/{locId}/offerings |
| Audit Trail | GET /api/audit, GET event-types, GET export.csv |
| Test Orders | GET/POST test-orders, POST simulate-result |
| Channels | GET/PUT/DELETE channels/{type}, GET/POST acknowledgments |

**Lifecycle gates enforced:**
- `TestTransactionsConfirmed` blocked unless ≥1 `Validated` test order exists
- `Live` blocked unless ≥1 active `TransportChannel` configured

### 4.4 Frontend pages and components

| Page / Component | What it does |
|---|---|
| DashboardPage | Stat cards, 9-step onboarding journey with descriptions, lab coverage bars, recent activity, quick actions |
| LabsPage | Create/search/view labs; LIMS badge, accreditation badge, Offerings/Add Tests action buttons |
| LabDetailPage | 5 tabs: Catalog (with upload wizard), Locations, Test Transactions, Integration Channels, Audit Log |
| MasterTestsPage | Full table with Matrix/Size/Category columns, expandable analyte sub-table with bridge key, add/edit/link modals |
| MasterAnalytesPage | Full CRUD, method/unit/result type columns, "Used In Tests" pill badges |
| LabOfferingsPage | Per-location test offering toggle, coverage bar, time zone, metadata columns |
| TransportsPage | REST API emulator (live fetch), SFTP mock, Encrypted Email with ciphertext preview, Self-Describing PDF |
| AuditTrailPage | Filter by event type, free-text search, Before/After/Justification columns, Export CSV |
| CatalogUploadWizard | 4-step: drag-drop → column mapping with 10-row preview → lab selection → confirm + commit → done |
| Callout | Info/warning/success/danger inline callout component |
| Toast | Auto-dismiss toast notifications (4 variants) |
| LifecycleBadge | Color-coded lifecycle state badge |
| Sidebar | 7-item navigation with SureTrend branding |

### 4.5 Deployment pipeline

| Layer | Platform | Config |
|---|---|---|
| API | Railway | Dockerfile (multi-stage .NET 7), `PORT` env var, `DB_PATH` env var, `ALLOWED_ORIGINS` env var |
| UI | Vercel | Root directory: `labiq-ui`, `VITE_API_URL` env var pointing to Railway |
| CI/CD | GitHub `master` | Both platforms auto-deploy on push |

---

## 5. Issues Found and Resolved During Session

### 5.1 Resolved

| Issue | Fix |
|-------|-----|
| EF Core v10 packages resolved (incompatible with .NET 7) | Pinned to v7.x |
| `AuditEvent.EventId` not detected as PK by EF convention | Added explicit `HasKey(e => e.EventId)` |
| `LabLocation.LocationId` not detected as PK | Added explicit `HasKey(l => l.LocationId)` |
| API defaulted to port 8080, Vite proxy pointed to 5000 | Updated `vite.config.ts` to proxy port 8080 |
| `EnsureDeleted + EnsureCreated` wiping Railway DB on every restart | Replaced with `db.Database.Migrate()` + EF migrations |
| Labs list: address column showing contact twice | Added `PrimaryAddress` to list API response |
| `PrimaryStatus` ordering alphabetical (wrong) | Changed to `Max(enum)` — evaluates as int |
| `sourceLims` + accreditation missing from list and detail API | Added to both API responses |
| Offerings endpoint missing Matrix/SampleSize/Category | Added to `OfferingsEndpoints` response |
| "Catalog (3)" tab label showed location count | Changed to plain "Catalog" |
| React Fragment key warnings in MasterTestsPage + LabDetailPage | Replaced `<>` with `<Fragment key={id}>` |
| `EnsureDeleted` no environment check — critical data loss risk | Added `db.Database.Migrate()` replacing both lines |

### 5.2 Known remaining issues (not yet fixed)

| Severity | Issue |
|----------|-------|
| 🔴 | No authentication — X-User-Id header trusted without verification |
| 🔴 | Cross-tenant: `GET /api/tests` returns all labs' data without caller scoping |
| 🔴 | Lifecycle transitions have no role enforcement |
| 🟠 | Hard DELETE on TestCode/ParameterCode (should be soft deactivation) |
| 🟠 | Mid-loop `SaveChangesAsync` in catalog ingestion breaks all-or-nothing atomicity |
| 🟡 | XLSX preview reads binary as UTF-8 text — preview garbled (actual upload works) |
| 🟡 | Missing audit events on analyte unlink and offerings changes |

---

## 6. User Stories

### 6.1 Original user stories (provided, 9 stories)

The original rough user stories had several issues:
- "Test Codes shall be unique within the account" — **wrong** (should be per-lab; different labs can have the same code)
- "Transport" in Story 1.6 described **physical sample transport** (FedEx, temperature), not digital integration channels
- Roles mapped to existing SureTrend roles rather than Lab IQ-specific roles
- Missing two critical areas: lifecycle/canonical mapping workflow and digital integration channels

### 6.2 User stories v2.1 (produced in session)

9 stories in the same format, correcting all inaccuracies and adding missing coverage:

| Story | Title | Key additions vs. original |
|-------|-------|---------------------------|
| 1.1 | Feature Flag & Access Control | Unchanged, minor enhancement |
| 1.2 | Manage Laboratories & Locations | Added locations section, LIMS, immutable codes, deactivation |
| 1.3 | Manage Master Tests | Added Matrix/Sample Size, effective-dating, soft delete |
| 1.4 | Manage Master Analytes | Added Method/Unit/Result Type, inline create |
| 1.5 | Import Catalog Data | Full 4-step wizard, column mapping, all-or-nothing, AI mapping note |
| 1.6 | Manage Lab Offerings | Per-location vs. per-lab distinction, coverage % |
| **1.7** | **Lab Onboarding Lifecycle & Canonical Mapping** | **New story** — lifecycle state machine, mapping approval, test transactions |
| 1.8 | Manage Lab Transport & Integration Channels | Added digital channels + SFTP infrastructure detail + immutable acknowledgment receipts |
| 1.9 | View and Search Lab IQ Audit Trail | Added date range filter, Previous/New Value, CSV export, point-in-time reproduction |

---

## 7. Data Model Analysis

A systematic analysis was run comparing the user stories against the current entity model. Results:

| Process area | Coverage | Key missing entities |
|---|---|---|
| Lab Identity & Locations | Partial | `Lab.ContactPhone`, deactivation toggle, user-tenant binding |
| Catalog Ingestion | Partial | `CatalogUploadBatch`, `TestCode.DefaultMethodCode` |
| Description Versioning | Covered | Actor/reason on history rows missing |
| **Canonical Mapping & Approval** | **Blocking** | `CanonicalMappingSnapshot`, `CanonicalFieldMapping`, `MappingRule` |
| Lifecycle & Promotion | Partial | Transition history, suspension metadata |
| **Transport Configuration** | **Blocking** | `TransportChannel` built this session; actual connectivity not implemented |
| **Production Order & Result Exchange** | **Blocking** | `ProductionOrder`, `InboundResult`, `CoaAttachment` |
| Audit & Compliance | Partial | Electronic signature meaning, full state snapshots |
| **User Identity & Access** | **Blocking** | `PortalUser`, `LabUserTenantRole`, `UserSession` |
| COA PDF Handling | Blocking | `CoaAttachment` |

---

## 8. Eurofins Integration Reference

### 8.1 Documents added to repo

```
reference/labs/eurofins/
  eurofins-canonical-order-schema.json  ← Eurofins B2B v1.0 order template
  eurofins-canonical-result-schema.json ← Eurofins B2B v1.0 result template
  eurofins-sample-order.json            ← Real order: Salmonella PCR on chocolate
  eurofins-sarf-ecal.pdf                ← SARF paper form
  README.md                             ← Field-by-field mapping to Lab IQ entities
```

Placeholders created for `reference/labs/fsns/` and `reference/labs/certified/`.

### 8.2 Issues found in Eurofins documents

After detailed review, the following gaps were identified between the Eurofins schema and our current data model:

| Priority | Issue |
|----------|-------|
| 🔴 | `EurofinsPartnerCode` routing key not stored on `TransportChannel` |
| 🔴 | `OrderSample` child entity missing — results correlate at sample level, not order level |
| 🔴 | Timestamp normalizer needed — Eurofins uses MM/DD/YYYY, we require UTC ISO 8601 |
| 🟠 | `FractionCode`/`FractionName` not in `ParameterCode` model |
| 🟠 | `LOQ`, `Uncertainty`, `Deficiency` not in `TestResult` model |
| 🟠 | `LimitStringValue`/`SpecificLimitStringValue` not stored on results |
| 🟡 | `QuotationCode` missing from order template (present in real example) |
| 🟡 | Result template uses chemistry examples — needs microbiology example for UTZ profile |

### 8.3 Multi-canonical data architecture

`reference/README.md` documents the proposed architecture for supporting multiple labs with different canonical formats:

- `LabCanonicalProfile` — canonical type + JSON schema templates per lab, effective-dated
- `CanonicalFieldMapping` — field-level crosswalk (lab field path → SureTrend field path), AI-suggested vs. human-confirmed
- `CanonicalMappingSnapshot` — point-in-time approval record (the 21 CFR Part 11 electronic signature for Story 1.7)

---

## 9. Collaboration Setup

### 9.1 For the co-worker

To get started with full project context:

```bash
git clone https://github.com/2steve2romig/diegostevelabiq.git
cd diegostevelabiq

# API
cd labiq-api/LabIQ.Api
dotnet run --no-launch-profile          # http://localhost:8080

# UI
cd labiq-ui
npm install && npm run dev              # http://localhost:5173
```

Opening the folder in Claude Code auto-loads `CLAUDE.md` with full project context.

### 9.2 Documents for immediate reference

| File | Use for |
|------|---------|
| `ONBOARDING.md` | First thing a new developer reads |
| `CLAUDE.md` | Auto-loaded by Claude Code — conventions and entity rules |
| `CHANGELOG.md` | Understanding what changed and when |
| `LabIQ_Release_Notes_v1.md` | Stakeholder and leadership briefing |
| `LabIQ_User_Stories_v2.txt` | Authoritative requirements |
| `reference/README.md` | Multi-canonical data architecture |
| `reference/labs/eurofins/README.md` | Eurofins field mapping reference |

---

## 10. Sprint 2 Backlog (prioritized)

Based on data model analysis, Eurofins document review, and user story gaps:

| Priority | Item | Blocks |
|----------|------|--------|
| 1 | `EurofinsPartnerCode` on `TransportChannel` | Real order dispatch |
| 2 | `OrderSample` child entity | Result-to-order correlation |
| 3 | Timestamp normalizer for Eurofins ingest | Result processing |
| 4 | `LabCanonicalProfile` + `CanonicalFieldMapping` entities | Multi-canonical crosswalk engine |
| 5 | `CanonicalMappingSnapshot` entity | Story 1.7 mapping approval gate |
| 6 | `PortalUser` + `LabUserTenantRole` | Authentication, multi-tenant isolation |
| 7 | `CatalogUploadBatch` entity | Import history log, downloadable error report |
| 8 | `SampleTransport` entity | Physical transport options (Story 1.8) |
| 9 | Soft-delete enforcement on TestCode/ParameterCode | 21 CFR Part 11 compliance |
| 10 | Fix mid-loop `SaveChangesAsync` in catalog ingestion | All-or-nothing atomicity |
| 11 | Eurofins microbiology result example file | Reference completeness |

---

## 11. Technology notes for future sessions

- **Port:** API runs on `http://localhost:8080` (reads `PORT` env var, defaults to 8080)
- **Proxy:** Vite proxies `/api` → `http://localhost:8080`
- **Migrations:** `dotnet ef migrations add <Name>` in `labiq-api/LabIQ.Api/` — commit `Migrations/` folder
- **Railway:** `DB_PATH=/tmp/labiq.db`, `ALLOWED_ORIGINS=http://localhost:5173,https://diegostevelabiq.vercel.app`
- **Schema swap to SQL Server:** Change `UseSqlite` → `UseSqlServer`, update connection string — migration files unchanged
- **Seeding:** `SeedData.Initialize(db)` guards with `if (db.Labs.Any()) return;` — safe to call on every startup

---

*Session conducted June 3, 2026. Work product committed to https://github.com/2steve2romig/diegostevelabiq*
