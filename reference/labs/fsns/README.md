# FSNS — Canonical Integration Reference

**Lab Code:** FSNS
**Canonical Type:** TBD (pending FSNS integration documents)
**LIMS:** LabWare LIMS 7
**Transport:** TBD
**Accreditation:** A2LA #2501.01

---

## Status

Integration documents not yet received from FSNS. This folder is a placeholder.

## Documents needed

To complete this integration reference, obtain from FSNS:

- [ ] Electronic order JSON schema or template
- [ ] Electronic results JSON schema or template
- [ ] SARF (Sample Analysis Request Form) template
- [ ] API documentation (if REST-based)
- [ ] SFTP specification (host, folder paths, file naming convention)
- [ ] Test catalog export (CSV or XLSX) — for canonical mapping

## Known fields (from FSNS test catalogs on file)

FSNS test codes use the `QM###` / `QC###` prefix convention.
Sample FSNS test codes in the prototype:
- `QM103` — Listeria monocytogenes detection
- `QM117` — Salmonella spp. detection
- `QM201` — Aerobic plate count
- `QC089` — Cronobacter sakazakii powdered formula

FSNS locations on file: Bloomsburg PA (FSNS-BLM), Meadville PA (FSNS-MDV), Visalia CA (FSNS-VIS).

## Anticipated canonical type

LabWare LIMS 7 commonly exports results in a proprietary CSV or XML format.
REST API support depends on LabWare version and configuration.
Update this README and add a `LabCanonicalProfile` record once documents are received.
