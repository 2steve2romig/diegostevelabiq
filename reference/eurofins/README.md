# Eurofins Integration Reference Documents

These are real Eurofins canonical format documents used as the design basis
for the Lab IQ canonical order/result schema (Story 1.7 — Canonical Mapping).

---

## Files

### `eurofins-order-template.json`
Eurofins B2B Canonical JSON v1.0 — Electronic Order schema template.
Shows the structure SureTrend must produce when dispatching an order to Eurofins:

- `TransformVersion` — schema version
- `EurofinsPartnerCode` — identifies the Eurofins trading partner
- `ClientCode` / `ClientOrderCode` — SureTrend's identifiers
- `Batch.Samples[]` — one entry per physical sample
  - `Analyses[]` — one entry per test ordered
    - `AnalysisCode` — maps to our `TestCode.Code`
    - `Parameters[]` — one entry per analyte
      - `ParameterCode` — maps to our `ParameterCode.Code`
      - `LimitMax` / `LimitMin` — spec limits if applicable

### `eurofins-results-template.json`
Eurofins B2B Canonical JSON v1.0 — Electronic Results schema template.
Shows the structure Eurofins returns when delivering results:

- `ReportCode` — Eurofins' COA identifier
- `LabsiteCode` / `LabsiteName` — maps to our `LabLocation`
- `BatchCode` — Eurofins' internal batch reference
- `ValidatedBy` / `ValidatedOn` — who released the result and when
- `AnalysisResults[]` — flat array, one row per parameter result
  - `SampleCode` / `ClientSampleCode` — for order-result correlation
  - `TestCode` / `TestName` — maps to our `TestCode.Code`
  - `ParameterCode` / `ParameterName` — maps to our `ParameterCode.Code`
  - `Value` / `Unit` — the actual result
  - `StandardReference` — the analytical method
  - `AccreditationName` — A2LA or similar accreditation reference
  - `AdditionalFields[]` — extensible metadata (e.g., RecAir, RecCond)

### `eurofins-sample-order.json`
A complete, filled-in sample order for a Salmonella PCR test on a chocolate lot.
Use this as the reference when building the test order payload generator in
`TestOrderEndpoints.cs`. Key fields populated:

- `EurofinsPartnerCode`: "EUUSHQ"
- `ClientCode`: "HYGIENA01"
- `AnalysisCode`: "SALM-PCR"
- `ParameterCode`: "SALMONELLA"
- `AdditionalFields`: Matrix = "Chocolate", Storage = "Ambient"

### `eurofins-sarf-ecal.pdf`
Eurofins Sample Analysis Request Form (SARF) — the human-readable paper form
used when placing orders manually. The canonical JSON order format is the
electronic equivalent of this form. Use this when building the SARF template
mapping for Story 1.8.

---

## How this maps to Lab IQ entities

| Eurofins field | Lab IQ entity / field |
|---|---|
| `EurofinsPartnerCode` | `Lab.LabCompanyCode` |
| `ClientCode` | SureTrend account code |
| `AnalysisCode` | `TestCode.Code` |
| `ParameterCode` | `ParameterCode.Code` |
| `LabsiteCode` | `LabLocation.LabLocationCode` |
| `ReportCode` | `TestResult` / COA reference |
| `ValidatedBy` / `ValidatedOn` | `TestResult` validation metadata |
| `StandardReference` | `ParameterCode.MethodCode` |
| `AccreditationName` | `Lab.AccreditationBody` + `AccreditationNumber` |

The `CanonicalMappingSnapshot` entity (Sprint 2 backlog) will store the explicit
field-by-field crosswalk from a lab's native codes to these Eurofins canonical fields.
