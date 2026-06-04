# Lab IQ — Integration Reference Documents

This folder contains lab-specific canonical format documents used as the design basis
for the Lab IQ integration data architecture. Each lab has its own subfolder with its
canonical order and result schemas.

---

## Folder structure

```
reference/
  labs/
    eurofins/       ← Eurofins B2B Canonical JSON v1.0 (complete)
    fsns/           ← FSNS / LabWare LIMS 7 (documents pending)
    certified/      ← Certified Labs / STARLIMS v12 (documents pending)
```

**Naming convention for each lab folder:**

```
{lab-code}-canonical-order-schema.json    ← the order format SureTrend sends
{lab-code}-canonical-result-schema.json   ← the result format the lab returns
{lab-code}-sample-order.json              ← a populated real-world order example
{lab-code}-sarf-{variant}.pdf             ← the paper SARF equivalent
README.md                                  ← field mapping table + lab details
```

---

## Why this structure matters — the multi-canonical data architecture

Every lab has a different native format for orders and results:
- **Eurofins** uses their B2B Canonical JSON v1.0 with `AnalysisCode` and `ParameterCode`
- **LabWare labs** (FSNS) typically use LabWare's proprietary XML or CSV export format
- **STARLIMS labs** (Certified) use STARLIMS REST API or SFTP with a different JSON shape
- **LabVantage labs** use LabVantage's own API schema
- **Generic labs** (manual entry) may use a simplified flat CSV or our own default template

SureTrend needs a **single internal canonical model** that can be transformed into any
lab's native format when dispatching orders, and transformed back when receiving results.

---

## Proposed data model (Sprint 2 backlog)

### Entity: `LabCanonicalProfile`
Stores the canonical format specification for each lab.

```
LabCanonicalProfile
  ProfileId            int PK
  LabId                int FK → Lab
  CanonicalType        string  e.g., "Eurofins_B2B_v1", "LabWare_v2",
                                     "STARLIMS_v12", "Generic_v1"
  SchemaVersion        string  e.g., "1.0"
  OrderSchemaJson      string  the JSON template with {tokens}
  ResultSchemaJson     string  the JSON template with {tokens}
  EffectiveFrom        DateTime UTC
  EffectiveEnd         DateTime? UTC (null = current)
  CreatedAtUtc         DateTime UTC
```

One lab can have multiple profiles over time (schema upgrades). Only one is current
at any given moment (effective-dated, same pattern as description history).

### Entity: `CanonicalFieldMapping`
Stores the field-level crosswalk for each lab's canonical profile.

```
CanonicalFieldMapping
  MappingId            int PK
  ProfileId            int FK → LabCanonicalProfile
  LabField             string  e.g., "Batch.Samples[].Analyses[].AnalysisCode"
  SureTrendField       string  e.g., "TestCode.Code"
  TransformExpression  string? optional transformation (e.g., "UPPERCASE", "PREFIX:QM")
  IsRequired           bool
  ConfirmedBy          string? actorId who confirmed the mapping
  ConfirmedAtUtc       DateTime? (null = AI-suggested, not yet confirmed)
  MappingSource        string  "AIsuggested" | "HumanConfirmed" | "ManualEntry"
```

### Entity: `CanonicalMappingSnapshot`
A point-in-time snapshot of the full mapping for a location, created when an admin
approves the mapping (Story 1.7 — Mapping Confirmed lifecycle gate).

```
CanonicalMappingSnapshot
  SnapshotId           int PK
  LocationId           int FK → LabLocation
  ProfileId            int FK → LabCanonicalProfile
  MappingJson          string  serialized field mappings at approval time
  SubmittedAtUtc       DateTime UTC
  SubmittedBy          string actorId
  Status               string  "Pending" | "Approved" | "Rejected"
  ReviewedByAdminId    string?
  ReviewedAtUtc        DateTime?
  ReviewComment        string?
  SignatureMeaning     string? "Approved as canonical mapping for Lab Location {code}"
```

---

## How the transformation pipeline uses these entities

```
Dispatch order:
  SureTrend internal order
    → load CanonicalFieldMapping for lab's active LabCanonicalProfile
    → apply field mappings + transforms
    → populate OrderSchemaJson template
    → send via configured TransportChannel

Receive result:
  Inbound payload (JSON/XML/CSV)
    → identify lab from TransportChannel.LocationId
    → load CanonicalFieldMapping for lab's active LabCanonicalProfile
    → parse LabField paths from inbound payload
    → map to SureTrend internal fields via SureTrendField paths
    → create/update TestResult
    → correlate to originating TestOrder
```

---

## Adding a new lab's canonical format

1. Create `reference/labs/{lab-code}/` folder
2. Add the lab's canonical schemas and sample files following the naming convention above
3. Write the README with the field mapping table
4. Create a `LabCanonicalProfile` record for the lab (Sprint 2)
5. Populate `CanonicalFieldMapping` records — AI-suggested first, then human-confirmed
6. Proceed with catalog import and mapping approval workflow (Story 1.7)

---

## Current status by lab

| Lab | Canonical Type | Documents | Profile Entity | Mappings |
|-----|---------------|-----------|----------------|----------|
| EUROFINS | `Eurofins_B2B_v1` | ✅ Complete | ⏳ Sprint 2 | ⏳ Sprint 2 |
| FSNS | `LabWare_v2` (TBD) | ⏳ Pending | ⏳ Sprint 2 | ⏳ Sprint 2 |
| CERTIFIED | `STARLIMS_v12` (TBD) | ⏳ Pending | ⏳ Sprint 2 | ⏳ Sprint 2 |
