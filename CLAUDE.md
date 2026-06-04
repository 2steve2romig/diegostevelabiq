# LabIQ — SureTrend Lab Onboarding & Integration Portal

## Project overview

Multi-tenant web portal that manages digital integration between the SureTrend food-safety platform and external food/beverage testing laboratories. Part of the **Lab IQ** module of SureTrend.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend API | ASP.NET Core 7 Web API (minimal API style) |
| ORM | Entity Framework Core 7 + SQLite (prototype) → SQL Server (production) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | CSS variables matching SureTrend brand (no Tailwind) |

## Project structure

```
LABIQ/
  labiq-api/          # ASP.NET Core 7 Web API
    LabIQ.Api/
      Domain/         # Entity classes
      Data/           # DbContext, migrations
      Endpoints/      # Minimal API endpoint files
      Services/       # Business logic
  labiq-ui/           # React + TypeScript + Vite SPA
    src/
      components/     # Shared UI components
      pages/          # Page-level components
      api/            # Typed API client (fetch wrappers)
      styles/         # Global CSS variables (SureTrend brand)
  Labs_extracted/     # Source documents (read-only reference)
  sample_lab_catalog.csv  # Sample test catalog data
```

## Domain model (core entities)

- **Lab** → has 1..* **LabLocation** (each with a stable `LabLocationCode`)
- **TestCode** → has 1..* **Parameter** (never collapse on TestCode alone)
- **TestDescription** / **ParameterDescription** — effective-dated history (`effective_start`, `effective_end`, `is_current`)
- **LocationTestAvailability** — which TestCodes are offered at which LabLocation
- **AuditEvent** — append-only, never deleted, required for 21 CFR Part 11

## Lifecycle states (LabLocation)

`Draft` → `CatalogLoaded` → `MappingConfirmed` → `TestTransactionsConfirmed` → `Live` → `Suspended`

Only SureTrend Admin can advance past `MappingConfirmed`.

## Brand tokens (match existing HTML prototype)

```css
--st-cyan: #1FB7E8
--st-cyan-dark: #0095CC
--st-text: #2C3E50
--st-border: #E1E8ED
--st-page-bg: #F4F6F8
--st-card: #FFFFFF
--st-success: #2BA84A
--st-warning: #E89015
--st-danger: #C0392B
```

Font: `'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif`, 13px base.

## Key requirements (must-have v1)

- 21 CFR Part 11: every config change, mapping decision, and lifecycle transition creates an immutable audit event
- Effective-dated description history for all TestCode and ParameterCode descriptions
- Bulk catalog upload (CSV, XLSX) with validation report — never partially apply a bad upload
- 1..* test-to-parameter cardinality must be preserved (never deduplicate on TestCode alone)
- Multi-tenant isolation: no lab user can see another lab's data
- All timestamps UTC (ISO 8601)

## Reference documents

- `Labs_text_extracts/*_Lab_Onboarding_Portal_SRS.docx.txt` — full SRS v0.1
- `Labs_text_extracts/*_Lab_Onboarding_Portal_Stories.docx.txt` — user stories
- `Labs_text_extracts/*_lab-iq-product-manager-agent.md.txt` — PM agent / domain model
- `Labs_text_extracts/Eurofins_US-Foods_Business-to-Business_Canonical_JSON.pdf.txt` — canonical JSON reference
- `sample_lab_catalog.csv` — sample test catalog
- `reference/eurofins/eurofins-order-template.json` — Eurofins B2B canonical order schema
- `reference/eurofins/eurofins-results-template.json` — Eurofins B2B canonical results schema
- `reference/eurofins/eurofins-sample-order.json` — filled-in sample order (Salmonella PCR)
- `reference/eurofins/eurofins-sarf-ecal.pdf` — Eurofins SARF paper form
- `reference/eurofins/README.md` — field-by-field mapping to Lab IQ entities

## Running the project

```bash
# API (from labiq-api/LabIQ.Api)
dotnet run

# UI (from labiq-ui)
npm install
npm run dev
```

API runs on http://localhost:8080 (`dotnet run --no-launch-profile`), UI on http://localhost:5173 (proxy configured in vite.config.ts).

## Conventions

- Minimal API: one file per feature area in `Endpoints/`
- EF migrations: always use `dotnet ef migrations add <Name>` — never edit migrations manually
- Schema changes: add/modify entities → `dotnet ef migrations add <DescriptiveName>` → commit the Migrations/ folder
- Startup: `db.Database.Migrate()` applies all pending migrations and creates the DB if missing — never use EnsureDeleted/EnsureCreated
- Audit events: every write endpoint must append an AuditEvent before returning 200
- No shared accounts: every API call must carry a user identity header (prototype uses a simple X-User-Id header; production will use JWT)
- Code fields (`lab_code`, `test_code`, `parameter_code`) are immutable once persisted — reject edits with 400
- Soft delete only: never DELETE TestCode or ParameterCode rows — set ActiveFlag = false instead
