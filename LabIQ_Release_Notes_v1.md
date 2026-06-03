# Lab IQ — Prototype Release 1
### SureTrend Lab Onboarding & Integration Portal
**Date:** June 3, 2026
**Status:** Prototype — deployed and functional

---

## What this is

Lab IQ is the SureTrend module responsible for onboarding external food and beverage testing
laboratories and managing the digital integration between SureTrend and those labs. This
prototype demonstrates the core onboarding workflows, master catalog management, and the
data model that will support production-grade lab integration.

The prototype is live at:
- **UI:** https://diegostevelabiq.vercel.app
- **API:** https://diegostevelabiq-production.up.railway.app
- **Source:** https://github.com/2steve2romig/diegostevelabiq

---

## What's working

### Laboratory Management
Register and manage laboratory companies and their physical locations. Each lab supports
a Source LIMS field (LabWare, Eurofins eLIMS, STARLIMS, etc.), ISO/A2LA accreditation
details, and one or more lab locations each with their own time zone, address, and
integration status.

### Master Test & Analyte Catalog
Create, edit, search, and manage the master list of tests and analytes. Test descriptions
are **effective-dated** — every description change is versioned with a start and end date
so historical records remain interpretable at any past point in time. The 1-to-many
relationship between tests and analytes is fully preserved (e.g., Listeria detection maps
to both *L. monocytogenes* and *Listeria spp.*).

### Catalog Import Wizard
Upload a lab's test catalog from CSV or XLSX using a 4-step guided wizard:
1. Drag-and-drop file selection
2. Auto-detected column mapping with manual override and 10-row preview
3. Lab selection
4. Confirm with plain-language "what will happen" summary

Uploads are all-or-nothing — if any row fails validation, no data is written.

### Lab Offerings
Configure which tests each lab location offers. Toggle individual tests on or off per
location, view coverage as a percentage, and bulk-assign or clear all tests. Matrix,
Sample Size, and Test Category are displayed for each test.

### Onboarding Lifecycle
Every lab location progresses through a structured onboarding workflow:

```
Draft → Catalog Loaded → Mapping Confirmed → Test Transactions Confirmed → Live → Suspended
```

Each transition requires a written justification and is recorded in the immutable audit trail.
Only a SureTrend Admin can advance a location past Mapping Confirmed.

**New in this release:** The system now enforces real prerequisites:
- A location cannot advance to **Test Transactions Confirmed** until at least one validated
  round-trip test transaction is on record
- A location cannot go **Live** until at least one integration channel is configured

### Test Transactions
From the Lab Detail page, admins can:
- Generate a test order built from the location's actual test offerings
- Simulate the lab returning a result (prototype feature)
- See analyte code validation results and correlation confirmation
- Track progress toward the Test Transactions Confirmed gate

### Integration Channel Configuration
Configure and persist how digital orders and results will flow between SureTrend and the lab:
- **SFTP** — SureTrend-hosted or lab-hosted, with full path configuration (inbox/outbox/archive)
- **REST API** — endpoint URL and auth type (OAuth 2.0, mTLS, API Key)
- **Encrypted Email** — S/MIME or OpenPGP, recipient address
- **Self-Describing PDF** — Hygiena Open COA Framework (canonical payload embedded in COA PDF)

### Audit Trail
Every configuration change, catalog import, lifecycle transition, and test transaction
produces an immutable audit event with:
- Actor identity and role
- UTC timestamp
- Before and after state
- Written justification

The Audit Trail page supports filtering by event type, free-text search, and CSV export.

### Dashboard
Overview of the master catalog and lab connectivity status, including:
- Master test and analyte counts
- Test-analyte bridge count (1..* associations)
- Lab coverage progress bars (per lab)
- 9-step onboarding journey visualization
- Recent activity feed

---

## What's seeded for demo

The prototype ships with three pre-configured labs:

| Lab | Code | Locations | Status |
|-----|------|-----------|--------|
| Food Safety Net Services | FSNS | BLM, MDV, VIS | BLM: Catalog Loaded / MDV: Mapping Confirmed / VIS: Live |
| Eurofins Scientific | EUROFINS | MAD, DSM, NBL | MAD+DSM: Live / NBL: Test Txn Confirmed |
| Certified Laboratories | CERTIFIED | PLV | Draft |

13 test codes and 13 analytes are loaded under FSNS, covering pathogens (Listeria,
Salmonella, E. coli O157:H7, Cronobacter), indicators (APC, coliforms, Enterobacteriaceae),
and enumerations (Yeast & Mold, Lactic Acid Bacteria).

---

## Known limitations (prototype)

| Limitation | Notes |
|------------|-------|
| No authentication | All endpoints are open. X-User-Id header is trusted without verification. Production will use JWT. |
| SQLite database | Persists across restarts via EF migrations. Will migrate to SQL Server for production with no code changes required. |
| SFTP/Email/PDF are UI-configured only | Channel config is persisted to DB but actual SSH/email connections are not implemented. |
| Test result simulation | "Simulate Result" is a prototype shortcut — production will receive real results from the lab. |
| No user/role management | User and tenant models are planned (see roadmap). |
| Hard DELETE on tests/analytes | Should be soft-deactivation (ActiveFlag = false). Flagged for fix. |
| Cross-tenant data on /api/tests | No caller scoping on the global test list endpoint. Flagged for fix. |

---

## Roadmap — what's next

**Sprint 2 — Core data model additions:**
- Canonical Mapping Snapshot (the crosswalk from lab-native codes to SureTrend codes)
- Portal User + Lab User Tenant Role (authentication and multi-tenant isolation)
- Catalog Upload Batch (import history log with downloadable error report)
- Physical Sample Transport entity (carrier, transit time, temperature requirements)

**Sprint 3 — Integration hardening:**
- Real SFTP connectivity (SSH.NET)
- LabWare and LabVantage REST API adapters
- Encrypted email transport (MailKit + BouncyCastle)
- Hygiena Open COA PDF generation pipeline

**Sprint 4 — Compliance + production readiness:**
- JWT authentication with SureTrend IdP
- Role-based access enforcement on all endpoints
- Soft-delete enforcement on test/analyte codes
- Electronic signature on mapping approval (21 CFR Part 11 §11.200)
- Full state snapshots on AuditEvent for point-in-time record reproduction

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Backend API | ASP.NET Core 7 — minimal API style |
| ORM | Entity Framework Core 7 with SQLite (prototype) → SQL Server (production) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | CSS variables matching SureTrend brand — no Tailwind |
| Hosting | Railway (API) + Vercel (UI) |
| CI/CD | GitHub — auto-deploy on push to `master` |

---

## For developers

Clone the repo and open in Claude Code — `CLAUDE.md` loads automatically with full
project context, entity rules, brand tokens, and the migration workflow.

```bash
git clone https://github.com/2steve2romig/diegostevelabiq.git
cd diegostevelabiq

# API
cd labiq-api/LabIQ.Api
dotnet run --no-launch-profile          # runs on http://localhost:8080

# UI (new terminal)
cd labiq-ui
npm install
npm run dev                             # runs on http://localhost:5173

# Schema change
dotnet ef migrations add <Name>
git add Migrations/ && git push        # Railway applies on next deploy
```

---

*Generated from prototype session — SureTrend Lab IQ, June 2026*
