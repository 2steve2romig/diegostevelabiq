# Eurofins — Canonical Integration Reference

**Lab Code:** EUROFINS
**Canonical Type:** `Eurofins_B2B_v1`
**LIMS:** Eurofins eLIMS
**Transport:** REST API + SFTP
**Accreditation:** A2LA ISO/IEC 17025:2005 #2927.01

---

## Documents

| File | Description |
|------|-------------|
| `eurofins-canonical-order-schema.json` | Eurofins B2B Canonical JSON v1.0 — electronic order schema template |
| `eurofins-canonical-result-schema.json` | Eurofins B2B Canonical JSON v1.0 — electronic results schema template |
| `eurofins-sample-order.json` | Fully populated sample order (Salmonella PCR on chocolate lot) |
| `eurofins-sarf-ecal.pdf` | Eurofins SARF (Sample Analysis Request Form) — eCal version |

---

## Canonical order structure

```
TransformVersion          → schema version ("1.0")
EurofinsPartnerCode       → Eurofins facility code (e.g., "EUUSHQ")
ClientCode                → SureTrend account code (e.g., "HYGIENA01")
ClientOrderCode           → SureTrend order ID
TransportedBy             → physical carrier (e.g., "UPS")
ClientPurchaseOrderReference
Batch
  └── Samples[]
        ├── SamplePartnerReference   → lab's internal sample ref
        ├── ClientSampleCode         → SureTrend sample code / lot code
        ├── SampleDescription        → product description
        ├── PriorityLevel            → "STD" | "RUSH"
        ├── Analyses[]
        │     ├── AnalysisCode       → maps to TestCode.Code
        │     ├── Parameters[]
        │     │     ├── ParameterCode  → maps to ParameterCode.Code
        │     │     ├── LimitMax / LimitMin / LimitUnit
        │     │     └── EstimatedValue / EstimatedUnit
        │     └── FractionCode / PackageCode / PriorityLevel
        └── AdditionalFields[]
              ├── AdditionalFieldCode  → "Matrix", "Storage", etc.
              └── TextValue
```

## Canonical result structure

```
ReportCode                → Eurofins COA identifier
LabsiteCode               → maps to LabLocation.LabLocationCode
BatchCode                 → Eurofins internal batch reference
ClientName                → SureTrend account name
ValidatedBy / ValidatedOn → COA release signature (21 CFR Part 11)
AnalysisResults[]         → FLAT array, one row per parameter result
  ├── SampleCode          → Eurofins sample ID (for correlation)
  ├── ClientSampleCode    → SureTrend sample code (primary correlation key)
  ├── TestCode / TestName → maps to TestCode.Code / TestDescription
  ├── ParameterCode / ParameterName → maps to ParameterCode.Code
  ├── Value / Unit        → the analytical result
  ├── StandardReference   → maps to ParameterCode.MethodCode
  ├── AccreditationName   → maps to Lab.AccreditationBody + Number
  ├── Uncertainty         → measurement uncertainty
  └── AdditionalFields[]  → extensible metadata (RecAir, RecCond, etc.)
```

## Lab IQ field mapping

| Eurofins field | Lab IQ entity.field |
|---|---|
| `EurofinsPartnerCode` | `Lab.LabCompanyCode` |
| `ClientCode` | SureTrend account code (external) |
| `AnalysisCode` | `TestCode.Code` |
| `ParameterCode` | `ParameterCode.Code` |
| `FractionCode` | `ParameterCode.DefaultResultType` context |
| `LabsiteCode` | `LabLocation.LabLocationCode` |
| `ReportCode` | COA reference on `TestResult` |
| `ClientSampleCode` | `TestOrder.SureTrendOrderId` (correlation) |
| `ValidatedBy` | `TestResult.ValidationNotes` |
| `StandardReference` | `ParameterCode.MethodCode` |
| `AccreditationName` | `Lab.AccreditationBody` + `Lab.AccreditationNumber` |
| `AdditionalFields[Matrix]` | `TestCode.Matrix` |
| `LimitMax` / `LimitMin` | Future: spec limit fields on `ParameterCode` |
