import { useRef, useState } from 'react';
import { api } from '../api/client';
import type { CatalogUploadResult, LabSummary } from '../api/types';
import { Callout } from './Callout';

const CANONICAL_FIELDS = [
  { key: 'test_code',           label: 'Test Code' },
  { key: 'test_description',    label: 'Test Description' },
  { key: 'analyte_code',        label: 'Analyte Code' },
  { key: 'analyte_description', label: 'Analyte Description' },
  { key: 'matrix',              label: 'Matrix' },
  { key: 'reference_method',    label: 'Reference Method' },
  { key: 'sample_size',         label: 'Sample Size' },
  { key: 'test_category',       label: 'Test Category' },
  { key: 'reporting_unit',      label: 'Reporting Unit' },
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false, cur = '';
  for (const c of line) {
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

function autoDetect(headers: string[]): Record<string, number> {
  const patterns: Record<string, string[]> = {
    test_code:           ['test code','testcode','test cd','tcode'],
    test_description:    ['test description','test desc','test name'],
    analyte_code:        ['analyte code','analytecode','parameter code','param code'],
    analyte_description: ['analyte description','analyte desc','parameter description'],
    matrix:              ['matrix','sample type','product type'],
    reference_method:    ['reference method','method','ref method'],
    sample_size:         ['sample size','sample weight','portion size'],
    test_category:       ['test category','category','test type'],
    reporting_unit:      ['reporting unit','unit','result unit'],
  };
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    const lower = h.trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(patterns)) {
      if (!idx[canonical] && aliases.some(a => lower.includes(a))) idx[canonical] = i;
    }
  });
  return idx;
}

interface Props { labId: number; labs: LabSummary[]; onClose: () => void; onDone: () => void; }

export function CatalogUploadWizard({ labId, labs, onClose, onDone }: Props) {
  const [step, setStep] = useState<1|2|3|4|'done'>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [selectedLabId, setSelectedLabId] = useState(labId);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CatalogUploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return;
      const hdrs = parseCSVLine(lines[0]);
      const rows = lines.slice(1, 11).map(parseCSVLine);
      setHeaders(hdrs);
      setPreviewRows(rows);
      setMapping(autoDetect(hdrs));
      setStep(2);
    };
    reader.readAsText(f);
  };

  const effectiveMapping = { ...mapping };
  for (const [canonical, colName] of Object.entries(overrides)) {
    const idx = headers.indexOf(colName);
    if (idx >= 0) effectiveMapping[canonical] = idx;
  }

  const missingRequired = !('test_code' in effectiveMapping) || !('test_description' in effectiveMapping);

  const commit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const colOverrides: Record<string, string> = {};
      for (const [canonical, colName] of Object.entries(overrides)) colOverrides[canonical] = colName;
      const res = await api.catalog.upload(selectedLabId, file, colOverrides);
      setResult(res);
      setStep('done');
      if (res.success) onDone();
    } finally { setUploading(false); }
  };

  const STEP_LABELS = ['Choose File', 'Map Columns', 'Select Lab', 'Confirm'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 780, maxWidth: '96vw' }} onClick={e => e.stopPropagation()}>

        {/* Progress bar */}
        {step !== 'done' && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1|2|3|4;
              const active = step === n;
              const done = typeof step === 'number' && step > n;
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {i > 0 && <div style={{ flex: 1, height: 2, background: done ? 'var(--st-cyan)' : 'var(--st-border)' }} />}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12,
                      background: done ? 'var(--st-cyan)' : active ? 'var(--st-cyan)' : 'var(--st-grey-bg)',
                      color: done || active ? 'white' : 'var(--st-text-muted)', flexShrink: 0 }}>
                      {done ? '✓' : n}
                    </div>
                    {i < 3 && <div style={{ flex: 1, height: 2, background: done ? 'var(--st-cyan)' : 'var(--st-border)' }} />}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--st-cyan-dark)' : 'var(--st-text-muted)' }}>{label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Choose File */}
        {step === 1 && (
          <>
            <div className="modal-title">Upload Test Catalog</div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? 'var(--st-cyan)' : 'var(--st-border)'}`, borderRadius: 8, padding: 40, textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--st-cyan-pale)' : 'var(--st-page-bg)', transition: 'all 0.15s', marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Drag & drop your catalog file here</div>
              <div style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>CSV or XLSX — up to 10,000 rows — column order is flexible</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
            <Callout type="info">Columns can be in any order. In the next step you can override the automatic column detection.</Callout>
            <div className="modal-footer"><button className="btn-secondary" onClick={onClose}>Cancel</button></div>
          </>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <>
            <div className="modal-title">Map Columns — {file?.name}</div>
            <Callout type="info" style={{ marginBottom: 12 }}>
              Auto-detected {Object.keys(mapping).length} of {CANONICAL_FIELDS.length} canonical fields. Override any column below.
            </Callout>
            {missingRequired && <Callout type="warning" style={{ marginBottom: 12 }}>Test Code and Test Description must be mapped before continuing.</Callout>}

            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table>
                <thead><tr><th>Canonical Field</th><th>Auto-detected</th><th>Override</th></tr></thead>
                <tbody>
                  {CANONICAL_FIELDS.map(f => (
                    <tr key={f.key}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>
                        {f.label}
                        {(f.key === 'test_code' || f.key === 'test_description') && <span style={{ color: 'var(--st-danger)', marginLeft: 2 }}>*</span>}
                      </td>
                      <td>
                        {mapping[f.key] !== undefined
                          ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>col {mapping[f.key]}: {headers[mapping[f.key]]}</span>
                          : <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>Not detected</span>}
                      </td>
                      <td>
                        <select style={{ width: 180, fontSize: 11 }} value={overrides[f.key] ?? ''}
                          onChange={e => setOverrides(o => e.target.value ? { ...o, [f.key]: e.target.value } : Object.fromEntries(Object.entries(o).filter(([k]) => k !== f.key)))}>
                          <option value="">— use auto-detected —</option>
                          {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>First {previewRows.length} rows</div>
            <div style={{ overflowX: 'auto', marginBottom: 12, maxHeight: 160, overflowY: 'auto' }}>
              <table style={{ fontSize: 11 }}>
                <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>{previewRows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell || <span style={{ color: 'var(--st-text-soft)', fontStyle: 'italic' }}>—</span>}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" disabled={missingRequired} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </>
        )}

        {/* Step 3: Select Lab */}
        {step === 3 && (
          <>
            <div className="modal-title">Select Lab</div>
            <Callout type="info" style={{ marginBottom: 16 }}>
              Choose which lab this catalog belongs to. The tests will be created under that lab's catalog.
            </Callout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {labs.map(lab => (
                <label key={lab.labId} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px',
                  border: `2px solid ${selectedLabId === lab.labId ? 'var(--st-cyan)' : 'var(--st-border)'}`,
                  borderRadius: 6, cursor: 'pointer', background: selectedLabId === lab.labId ? 'var(--st-cyan-pale)' : 'white', marginBottom: 0 }}>
                  <input type="radio" name="lab" checked={selectedLabId === lab.labId} onChange={() => setSelectedLabId(lab.labId)} style={{ accentColor: 'var(--st-cyan)' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{lab.legalName}</div>
                    <div style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{lab.labCompanyCode} · {lab.locationCount} location{lab.locationCount !== 1 ? 's' : ''} · {lab.primaryStatus}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(4)}>Continue →</button>
            </div>
          </>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <>
            <div className="modal-title">Confirm Upload</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['Data Rows', previewRows.length + '+'], ['Columns Mapped', String(Object.keys(effectiveMapping).length)], ['Target Lab', labs.find(l => l.labId === selectedLabId)?.labCompanyCode ?? '']].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--st-page-bg)', border: '1px solid var(--st-border)', borderRadius: 6, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--st-cyan-dark)' }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--st-text-muted)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>What will happen</div>
            <ol style={{ paddingLeft: 20, color: 'var(--st-text-muted)', fontSize: 12, lineHeight: 2 }}>
              <li>File is parsed and all rows validated — upload is rejected if any row fails</li>
              <li>New test codes are created with description history starting today</li>
              <li>Existing test codes whose descriptions changed are versioned (prior description closed)</li>
              <li>New analytes (parameter codes) are created</li>
              <li>Test–analyte bridges (1..* associations) are created — cardinality preserved</li>
              <li>An immutable audit event is appended (21 CFR Part 11)</li>
              <li>No partial application — the entire file succeeds or is rolled back</li>
            </ol>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setStep(3)}>← Back</button>
              <button className="btn-primary" onClick={commit} disabled={uploading}>{uploading ? 'Uploading…' : 'Commit Upload'}</button>
            </div>
          </>
        )}

        {/* Done */}
        {step === 'done' && result && (
          <>
            {result.success ? (
              <>
                <Callout type="success" style={{ marginBottom: 20 }}>
                  <strong>Upload successful</strong> — {result.testCodesAdded} tests added, {result.testCodesUpdated} updated, {result.parametersAdded} analytes added, {result.associationsAdded} bridges created
                </Callout>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[['Tests Added', result.testCodesAdded], ['Tests Updated', result.testCodesUpdated], ['Analytes Added', result.parametersAdded], ['Bridges Created', result.associationsAdded]].map(([label, val]) => (
                    <div key={String(label)} style={{ background: 'var(--st-success-bg)', border: '1px solid var(--st-success)', borderRadius: 6, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--st-success)' }}>{val}</div>
                      <div style={{ fontSize: 10, color: '#1A6630', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {result.createdTests.length > 0 && (
                  <table style={{ fontSize: 11 }}>
                    <thead><tr><th>Test Code</th><th>Description</th><th>Analytes</th></tr></thead>
                    <tbody>{result.createdTests.map(t => (
                      <tr key={t.code}>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{t.code}</span></td>
                        <td>{t.description}</td>
                        <td><span className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)' }}>{t.analyteCount}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </>
            ) : (
              <Callout type="danger" style={{ marginBottom: 16 }}>
                <strong>Upload rejected — {result.rejectedRows.length} error{result.rejectedRows.length !== 1 ? 's' : ''}</strong>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {result.rejectedRows.map((r, i) => <div key={i}>Row {r.rowNumber}: <strong>{r.field}</strong> — {r.rule}</div>)}
                </div>
              </Callout>
            )}
            <div className="modal-footer">
              {result.success ? (
                <><button className="btn-secondary" onClick={() => { setStep(1); setFile(null); setResult(null); }}>Upload another</button><button className="btn-primary" onClick={onClose}>Done</button></>
              ) : (
                <><button className="btn-secondary" onClick={() => setStep(1)}>← Try again</button><button className="btn-secondary" onClick={onClose}>Close</button></>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
