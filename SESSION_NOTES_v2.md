# Lab IQ — Complete Session Notes v2
**Date:** June 3–5, 2026
**Participants:** Steve Romig (Product Owner), Claude (AI Architect/Developer)
**Repository:** https://github.com/2steve2romig/diegostevelabiq
**Live UI:** https://diegostevelabiq.vercel.app
**Live API:** https://diegostevelabiq-production.up.railway.app

---

## 1. Session Overview

A full-day working session that took the Lab IQ concept from a single-file HTML prototype and SRS document to a fully deployed, full-stack prototype application with EF Core migrations, user stories, reference documents, multi-canonical data architecture, and comprehensive delete capability across all modules.

---

## 2. Starting Point

Assets in `C:\Users\sromig\LABIQ` at session start:
- `Lab_IQ_Onboarding_Portal_Functional_edited.html` — 164KB single-file HTML/JS prototype
- `Labs_text_extracts/` — SRS v0.1, user stories, PM agent doc, Eurofins canonical reference
- `sample_lab_catalog.csv` — 8-row sample test catalog

---

## 3. Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Stack | ASP.NET Core 7 + EF Core 7 + SQLite → SQL Server + React 18 + TypeScript + Vite | 21 CFR Part 11 compliance, mature .NET integration libraries, enterprise fit |
| API style | Minimal API, one file per feature area in `Endpoints/` | Clean, testable, and easy to hand off |
| Schema management | EF Core migrations (not EnsureDeleted/EnsureCreated) | Persistent database across deploys; SQL Server swap = 2 line change |
| Test code uniqueness | Per-lab (not account-global) | Eurofins QM103 ≠ FSNS QM103; different labs can share codes |
| Description history | Effective-dated (EffectiveStart/EffectiveEnd/IsCurrent) | 21 CFR Part 11 point-in-time record reproduction |
| Soft delete | TestCode and ParameterCode use ActiveFlag, never physically deleted | Code immutability per SRS FR-10 |
| Multi-canonical | LabCanonicalProfile + CanonicalFieldMapping + CanonicalMappingSnapshot (Sprint 2) | Each lab has its own native JSON format (Eurofins, LabWare, STARLIMS, etc.) |
| Deployment | Railway (API) + Vercel (UI) + GitHub auto-deploy | Fast iteration, free tier, zero-config CI/CD |

---

## 4. Complete Entity Model

| Entity | Key fields | Purpose |
|--------|-----------|---------|
| `Lab` | LabCompanyCode (immutable), LegalName, SourceLims, AccreditationBody/Number | Lab company profile |
| `LabLocation` | LabLocationCode (immutable), Address, TimeZone, Status (lifecycle) | Physical lab site |
| `LabLifecycleState` | Draft → CatalogLoaded → MappingConfirmed → TestTransactionsConfirmed → Live → Suspended | Onboarding state machine |
| `TestCode` | Code (immutable), Matrix, SampleSize, TestCategory, ActiveFlag | Lab-native test definition |
| `TestDescription` | Description, EffectiveStart, EffectiveEnd, IsCurrent | Effective-dated test name history |
| `ParameterCode` | Code (immutable), MethodCode, DefaultUnit, DefaultResultType, ActiveFlag | Lab-native analyte/parameter |
| `ParameterDescription` | Description, EffectiveStart, EffectiveEnd, IsCurrent | Effective-dated analyte name history |
| `TestParameterAssociation` | TestCodeId + ParameterCodeId (composite PK) | 1..* test-to-parameter cardinality |
| `LocationTestAvailability` | LocationId + TestCodeId | Which tests are offered at which location |
| `AuditEvent` | EventType, TimestampUtc, ActorId, ActorRole, BeforeStateHash, AfterStateHash, Reason | Append-only 21 CFR Part 11 audit record |
| `TestOrder` | SureTrendOrderId, Mode (Test/Production), Status, PayloadJson | Dispatched integration test order |
| `TestResult` | AnalyteCodesMatch, ValidationNotes, CorrelationMetadata | Round-trip result validation |
| `TransportChannel` | ChannelType (SFTP/REST/Email/PDF), HostingMode, Host, Port, Paths | Persisted integration channel config |
| `InboundFileAcknowledgment` | OriginalFileName, ReceivedAtUtc, FileSizeBytes, Sha256Checksum | Immutable 21 CFR Part 11 receipt |

**EF Migrations:**
- `InitialCreate` — full baseline schema
- `AddTestOrdersAndTransportChannels` — Sprint 1 additions

---

## 5. All Backend Endpoints

| Feature | Endpoints |
|---------|-----------|
| Labs | GET/POST /api/labs, GET/PUT /api/labs/{id}, **DELETE /api/labs/{id}** |
| Locations | POST /api/labs/{id}/locations, **DELETE .../locations/{locId}**, POST .../lifecycle |
| Catalog | POST upload (CSV/XLSX), GET list, GET history, GET point-in-time |
| Master Tests | GET/POST/PUT/**DELETE** /api/tests, POST/DELETE analyte links |
| Master Analytes | GET/POST/PUT/**DELETE** /api/analytes |
| Dashboard | GET /api/dashboard |
| Offerings | GET/POST/DELETE .../offerings/{testId} |
| Audit Trail | GET /api/audit, GET event-types, GET export.csv |
| Test Orders | GET/POST .../test-orders, POST simulate-result, **DELETE .../test-orders/{id}** |
| Channels | GET/PUT/DELETE .../channels/{type}, GET/POST acknowledgments |

---

## 6. Frontend — All Pages and Components

| Page / Component | Features |
|---|---|
| DashboardPage | 5 stat cards, 9-step onboarding journey (aligned circles, descriptions), lab coverage bars, recent activity, quick actions |
| LabsPage | Create/search/view labs; LIMS badge, accreditation; Edit / Offerings / Add Tests / **Delete** |
| LabDetailPage | 5 tabs: Catalog, Locations, Test Transactions, Integration Channels, Audit Log |
| — Catalog tab | Upload wizard, test table with Matrix/Size/Category, expandable parameters, description history |
| — Locations tab | Lifecycle transitions + **Delete** per location |
| — Test Transactions tab | Dispatch order, simulate result, validation display, readiness callout, **Delete** per order |
| — Integration Channels tab | SFTP / REST / Email / PDF config forms, persisted to DB |
| — Audit Log tab | Before/After/Justification columns |
| MasterTestsPage | Matrix/Size/Category columns, expand rows (analyte sub-table + bridge key), Edit / + Analyte / **Delete** |
| MasterAnalytesPage | Method/Unit/Type columns, used-in-tests pills, Edit / **Delete** |
| LabOfferingsPage | Coverage bar, time zone, metadata columns, checkbox toggle, bulk select/clear |
| TransportsPage | REST API emulator, SFTP debug log mock, Email ciphertext, PDF hidden payload |
| AuditTrailPage | Filter by event type, free-text search, Before/After/Justification, Export CSV |
| CatalogUploadWizard | 4 steps: drag-drop → column mapping + preview → lab select → confirm/commit |
| Callout | info / warning / success / danger inline alerts |
| Toast | Auto-dismiss notifications, 4 variants |
| LifecycleBadge | Color-coded status badge |
| Sidebar | 7-item navigation with SureTrend cyan brand |

---

## 7. Delete Capability — Full Coverage

Added across all modules with confirmation dialogs, toast feedback, and audit events.

| Module | Delete behavior | Blocked when |
|--------|----------------|-------------|
| Labs | Cascade-deletes locations, catalog, associations | Location is Live or Suspended |
| Lab Locations | Removes location + availability | Location is Live or Suspended |
| Master Tests | Hard delete with analyte unlink | — |
| Master Analytes | Hard delete | — |
| Lab Offerings | Remove offering (checkbox) | — |
| Integration Channels | Soft deactivate | — |
| Test Orders | Hard delete with result | — |
| Audit Events | Never deletable | 21 CFR Part 11 — intentional |

---

## 8. Deployment Pipeline

| Layer | Platform | Key config |
|-------|----------|------------|
| API | Railway | Dockerfile (multi-stage .NET 7), `PORT` env var, `DB_PATH=/tmp/labiq.db`, `ALLOWED_ORIGINS` |
| UI | Vercel | Root: `labiq-ui`, `VITE_API_URL` → Railway, `vercel.json` SPA rewrite rule |
| DB | SQLite | EF Core migrations — persists on Railway; swap to SQL Server = 2 lines |
| CI/CD | GitHub `master` | Both platforms auto-deploy on push |

**Note:** `vercel.json` rewrite rule added to fix Vercel 404 on direct route navigation (React SPA routing fix).

---

## 9. Issues Found and Fixed

| Issue | Fix | Commit |
|-------|-----|--------|
| EF Core v10 package mismatch | Pinned to v7.x | Initial build |
| AuditEvent, LabLocation PKs not detected by EF convention | Explicit `HasKey()` in DbContext | Initial build |
| API on port 8080 but Vite proxy on 5000 | Updated `vite.config.ts` to 8080 | Bug fix pass |
| `EnsureDeleted + EnsureCreated` wiping Railway DB on every restart | Replaced with `db.Database.Migrate()` + EF migrations | Migration commit |
| Labs list: address column showing contact twice | Added `primaryAddress` to API list response | Bug fix pass |
| `primaryStatus` ordering alphabetical | Changed to `Max(enum)` — evaluates as int | Bug fix pass |
| `sourceLims` + accreditation missing from API responses | Added to both list and detail endpoints | Bug fix pass |
| Offerings missing Matrix/SampleSize/Category | Added to OfferingsEndpoints response | Bug fix pass |
| React Fragment key warnings | Replaced `<>` with `<Fragment key={id}>` | Bug fix pass |
| Dashboard journey circles different sizes | Consistent `32×32px` with `border` on all, `marginTop` connector fix | UI fix |
| Vercel 404 on direct URL navigation | Added `vercel.json` with SPA rewrite rule | Deployment fix |

### Known remaining issues

| Severity | Issue |
|----------|-------|
| 🔴 | No authentication — X-User-Id header trusted without verification |
| 🔴 | Cross-tenant: `GET /api/tests` returns all labs' data |
| 🔴 | Lifecycle transitions have no role enforcement |
| 🟠 | Soft-delete not enforced — TestCode/ParameterCode still hard-deletable |
| 🟠 | Mid-loop `SaveChangesAsync` in catalog ingestion (atomicity risk) |
| 🟡 | XLSX preview reads binary as text (upload itself works correctly) |

---

## 10. User Stories

Produced `LabIQ_User_Stories_v2.txt` (v2.1) — 9 stories in the same format as the original rough stories, correcting inaccuracies and adding two missing stories:

| Story | Title | Key changes from original |
|-------|-------|--------------------------|
| 1.1 | Feature Flag & Access Control | Minor enhancement |
| 1.2 | Manage Laboratories & Locations | Added locations, LIMS, immutable codes, deactivation |
| 1.3 | Manage Master Tests | Added Matrix/Sample Size, effective-dating, soft delete |
| 1.4 | Manage Master Analytes | Added Method/Unit/Result Type, inline create |
| 1.5 | Import Catalog Data | Full 4-step wizard, column mapping, all-or-nothing, AI mapping note |
| 1.6 | Manage Lab Offerings | Per-location vs per-lab distinction, coverage % |
| **1.7** | **Lab Onboarding Lifecycle & Canonical Mapping** | **New** — lifecycle, mapping approval, test transactions, prerequisite gates |
| 1.8 | Manage Lab Transport & Integration Channels | Digital channels + SFTP infrastructure detail + immutable acknowledgment receipts |
| 1.9 | View and Search Lab IQ Audit Trail | Date range filter, Previous/New Value, CSV export, point-in-time reproduction |

---

## 11. Eurofins Integration Reference

Documents added to `reference/labs/eurofins/`:

| File | Contents |
|------|---------|
| `eurofins-canonical-order-schema.json` | Eurofins B2B v1.0 order template |
| `eurofins-canonical-result-schema.json` | Eurofins B2B v1.0 result template |
| `eurofins-sample-order.json` | Real order: Salmonella PCR on chocolate lot |
| `eurofins-sarf-ecal.pdf` | Paper SARF form — electronic equivalent is the JSON order |
| `README.md` | Field-by-field mapping: Eurofins fields → Lab IQ entities |

Placeholders created: `reference/labs/fsns/` (LabWare LIMS 7), `reference/labs/certified/` (STARLIMS v12)

### Gaps found in Eurofins documents vs. data model

| Priority | Gap |
|----------|-----|
| 🔴 | `EurofinsPartnerCode` routing key not stored on `TransportChannel` |
| 🔴 | `OrderSample` child entity missing — results correlate at sample level, not order level |
| 🔴 | Timestamp normalizer needed (Eurofins: MM/DD/YYYY → UTC ISO 8601) |
| 🟠 | `FractionCode`/`FractionName`, `LOQ`, `Uncertainty`, `Deficiency` not in `TestResult` |
| 🟡 | `QuotationCode` missing from order template; chemistry-only result example |

### Multi-canonical data architecture (`reference/README.md`)

Three entities proposed for Sprint 2:
- **`LabCanonicalProfile`** — stores canonical format type + JSON schema templates per lab (effective-dated)
- **`CanonicalFieldMapping`** — field-level crosswalk (lab path → SureTrend path), AI-suggested vs. human-confirmed
- **`CanonicalMappingSnapshot`** — point-in-time approval record, the 21 CFR Part 11 electronic signature for Story 1.7

---

## 12. Seed Data

Current seed (single test lab, imaginary values):

| Entity | Value |
|--------|-------|
| Lab code | TESTLAB1 |
| Legal name | Test Lab 1 |
| Address | 123 Imaginary Lane, Springfield, IL 62701 |
| LIMS | TestLIMS v1.0 |
| Accreditation | ISO 99999.01 |
| Location | TL1-MAIN — America/Chicago — CatalogLoaded |
| Tests | TC001 (2 analytes), TC002 (1 analyte), TC003 (0 analytes) |
| Analytes | A001, A002, A003 |

---

## 13. Repository Contents

```
diegostevelabiq/
  CLAUDE.md                   ← auto-loaded project context
  ONBOARDING.md               ← co-worker getting started guide
  CHANGELOG.md                ← sprint-by-sprint technical history
  SESSION_NOTES.md            ← session summary v1
  SESSION_NOTES_v2.md         ← this file
  LabIQ_Release_Notes_v1.md   ← stakeholder-facing summary + roadmap
  LabIQ_User_Stories_v2.txt   ← 9 user stories v2.1
  sample_lab_catalog.csv      ← test upload file
  Dockerfile                  ← Railway multi-stage .NET 7 build
  labiq-api/                  ← ASP.NET Core 7 backend
  labiq-ui/                   ← React 18 + TypeScript + Vite frontend
    vercel.json               ← SPA routing rewrite rule
  reference/
    README.md                 ← multi-canonical data architecture
    labs/eurofins/            ← complete (4 files + README)
    labs/fsns/                ← placeholder (LabWare)
    labs/certified/           ← placeholder (STARLIMS)
```

---

## 14. Sprint 2 Backlog (prioritized)

| Priority | Item | Blocks |
|----------|------|--------|
| 1 | `EurofinsPartnerCode` on `TransportChannel` + `OrderSample` entity | Real Eurofins order dispatch and result correlation |
| 2 | `LabCanonicalProfile` + `CanonicalFieldMapping` | Multi-canonical crosswalk engine |
| 3 | Timestamp normalizer for Eurofins result ingest | Result processing pipeline |
| 4 | `CanonicalMappingSnapshot` | Story 1.7 mapping approval gate |
| 5 | `PortalUser` + `LabUserTenantRole` | Authentication and multi-tenant isolation |
| 6 | `CatalogUploadBatch` | Import history log and downloadable error report |
| 7 | `SampleTransport` entity | Physical sample transport options (Story 1.8) |
| 8 | Soft-delete enforcement on TestCode/ParameterCode | 21 CFR Part 11 code immutability |
| 9 | Fix mid-loop `SaveChangesAsync` in catalog ingestion | All-or-nothing atomicity |
| 10 | Eurofins microbiology result example | Reference documentation completeness |

---

## 15. Developer Quick Reference

```bash
# Clone
git clone https://github.com/2steve2romig/diegostevelabiq.git

# Run locally
cd labiq-api/LabIQ.Api && dotnet run --no-launch-profile   # API: http://localhost:8080
cd labiq-ui && npm install && npm run dev                   # UI:  http://localhost:5173

# Schema change workflow
dotnet ef migrations add <DescriptiveName>     # generate migration
git add Migrations/ && git push                # Railway applies on deploy

# Fresh local database
Remove-Item labiq-api/LabIQ.Api/labiq.db*
# Then restart API — Migrate() + SeedData runs automatically
```

**Conventions:**
- Code fields (`lab_code`, `test_code`, `parameter_code`) — immutable once saved, reject edits with 400
- Every write endpoint appends an `AuditEvent` before returning 200
- All timestamps stored and returned UTC ISO 8601
- TestCode and ParameterCode — soft deactivate only (`ActiveFlag = false`), never hard-delete
- EF migrations only — never use `EnsureDeleted` or `EnsureCreated`

---

*Session conducted June 3–5, 2026 — all work product at https://github.com/2steve2romig/diegostevelabiq*
*No external customer or confidential information in this document or repository.*
