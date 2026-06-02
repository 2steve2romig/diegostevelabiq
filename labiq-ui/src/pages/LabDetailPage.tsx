import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type {
  AuditEventRecord,
  CatalogUploadResult,
  DescriptionHistoryEntry,
  LabDetail,
  LabLocationSummary,
  TestCodeSummary,
  TransitionRequest,
} from '../api/types';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { PageHeader } from '../components/PageHeader';

type Tab = 'locations' | 'catalog' | 'audit';

const LIFECYCLE_NEXT: Record<string, string> = {
  Draft: 'CatalogLoaded',
  CatalogLoaded: 'MappingConfirmed',
  MappingConfirmed: 'TestTransactionsConfirmed',
  TestTransactionsConfirmed: 'Live',
  Live: 'Suspended',
  Suspended: 'Live',
};

const LIFECYCLE_LABEL: Record<string, string> = {
  CatalogLoaded: 'Mark Catalog Loaded',
  MappingConfirmed: 'Approve Mapping',
  TestTransactionsConfirmed: 'Confirm Test Transactions',
  Live: 'Promote to Live',
  Suspended: 'Suspend',
};

function HistoryPanel({ labId, code, type, onClose }: { labId: number; code: string; type: 'test' | 'param'; onClose: () => void }) {
  const [history, setHistory] = useState<DescriptionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = type === 'test'
      ? api.catalog.testHistory(labId, code)
      : api.catalog.paramHistory(labId, code);
    fn.then(r => setHistory(r.history)).finally(() => setLoading(false));
  }, [labId, code, type]);

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
        <div className="modal-title">Description History — <span style={{ fontFamily: 'monospace' }}>{code}</span></div>
        {loading ? (
          <div style={{ color: 'var(--st-text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((h, i) => (
              <div key={i} style={{ padding: '10px 14px', border: '1px solid var(--st-border)', borderRadius: 6, background: h.isCurrent ? 'var(--st-cyan-pale)' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{h.description}</span>
                  {h.isCurrent && <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)', fontSize: 10 }}>Current</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>
                  Effective: {fmt(h.effectiveStart)} → {h.effectiveEnd ? fmt(h.effectiveEnd) : 'Present'}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function CatalogTab({ labId }: { labId: number }) {
  const [catalog, setCatalog] = useState<TestCodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CatalogUploadResult | null>(null);
  const [history, setHistory] = useState<{ code: string; type: 'test' | 'param' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.catalog.list(labId).then(setCatalog).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [labId]);

  const toggleExpand = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.catalog.upload(labId, file);
      setUploadResult(result);
      if (result.success) load();
    } catch (e: unknown) {
      setUploadResult({ success: false, totalRows: 0, acceptedRows: 0, rejectedRows: [{ rowNumber: 0, field: 'file', rule: e instanceof Error ? e.message : 'Unknown error' }], testCodesAdded: 0, testCodesUpdated: 0, parametersAdded: 0, parametersUpdated: 0, associationsAdded: 0 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--st-text-muted)' }}>
          {catalog.length} test code{catalog.length !== 1 ? 's' : ''} · {catalog.reduce((n, t) => n + t.parameterCount, 0)} parameters
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : '↑ Upload CSV / XLSX'}
          </button>
        </div>
      </div>

      {uploadResult && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 6,
          border: `1px solid ${uploadResult.success ? 'var(--st-success)' : 'var(--st-danger)'}`,
          background: uploadResult.success ? 'var(--st-success-bg)' : 'var(--st-danger-bg)',
          marginBottom: 16,
          fontSize: 12,
        }}>
          {uploadResult.success ? (
            <div>
              <strong style={{ color: 'var(--st-success)' }}>Upload successful</strong>
              {' — '}
              {uploadResult.testCodesAdded} tests added, {uploadResult.testCodesUpdated} updated,{' '}
              {uploadResult.parametersAdded} params added, {uploadResult.associationsAdded} associations added
            </div>
          ) : (
            <div>
              <strong style={{ color: 'var(--st-danger)' }}>Upload rejected — {uploadResult.rejectedRows.length} error{uploadResult.rejectedRows.length !== 1 ? 's' : ''}</strong>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {uploadResult.rejectedRows.map((r, i) => (
                  <div key={i}>Row {r.rowNumber}: <strong>{r.field}</strong> — {r.rule}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div>
      ) : catalog.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--st-text-muted)' }}>
          No catalog loaded yet. Upload a CSV or XLSX to get started.
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Test Code</th>
                <th>Description</th>
                <th>Parameters</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map(tc => (
                <>
                  <tr key={tc.testCodeId} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(tc.testCodeId)}>
                    <td style={{ textAlign: 'center', color: 'var(--st-text-soft)', fontSize: 11 }}>
                      {expanded.has(tc.testCodeId) ? '▾' : '▸'}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>
                        {tc.code}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{ cursor: 'help', borderBottom: '1px dashed var(--st-border)' }}
                        onClick={e => { e.stopPropagation(); setHistory({ code: tc.code, type: 'test' }); }}
                        title="View description history"
                      >
                        {tc.currentDescription}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{tc.parameterCount} param{tc.parameterCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                      {tc.activeFlag
                        ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>Active</span>
                        : <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>Inactive</span>}
                    </td>
                  </tr>
                  {expanded.has(tc.testCodeId) && tc.parameters.map(p => (
                    <tr key={p.parameterCodeId} style={{ background: 'var(--st-cyan-pale)' }}>
                      <td></td>
                      <td style={{ paddingLeft: 28 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--st-text-muted)' }}>{p.code}</span>
                      </td>
                      <td>
                        <span
                          style={{ fontSize: 12, cursor: 'help', borderBottom: '1px dashed var(--st-border)' }}
                          onClick={() => setHistory({ code: p.code, type: 'param' })}
                          title="View description history"
                        >
                          {p.currentDescription}
                        </span>
                      </td>
                      <td colSpan={2}>
                        <div style={{ fontSize: 11, color: 'var(--st-text-muted)', display: 'flex', gap: 12 }}>
                          <span>Method: <strong>{p.methodCode || '—'}</strong></span>
                          <span>Unit: <strong>{p.defaultUnit || '—'}</strong></span>
                          <span>Type: <strong>{p.defaultResultType || '—'}</strong></span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history && (
        <HistoryPanel
          labId={labId}
          code={history.code}
          type={history.type}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}

function LocationsTab({ lab, onRefresh }: { lab: LabDetail; onRefresh: () => void }) {
  const [transitioning, setTransitioning] = useState<number | null>(null);

  const handleTransition = async (loc: LabLocationSummary) => {
    const next = LIFECYCLE_NEXT[loc.status];
    if (!next) return;
    const reason = window.prompt(`Reason for transitioning to ${next}?`);
    if (!reason) return;
    setTransitioning(loc.locationId);
    try {
      await api.labs.transition(lab.labId, loc.locationId, { targetState: next, reason } as TransitionRequest);
      onRefresh();
    } finally {
      setTransitioning(null);
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table>
        <thead>
          <tr>
            <th>Location Code</th>
            <th>Address</th>
            <th>Time Zone</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {lab.locations.map(loc => {
            const next = LIFECYCLE_NEXT[loc.status];
            return (
              <tr key={loc.locationId}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>
                    {loc.labLocationCode}
                  </span>
                </td>
                <td style={{ color: 'var(--st-text-muted)' }}>{loc.address}</td>
                <td style={{ color: 'var(--st-text-muted)' }}>{loc.timeZone}</td>
                <td><LifecycleBadge status={loc.status} /></td>
                <td>
                  {next && (
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      disabled={transitioning === loc.locationId}
                      onClick={() => handleTransition(loc)}
                    >
                      {LIFECYCLE_LABEL[next] ?? `→ ${next}`}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ labId }: { labId: number }) {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.labs.audit(labId).then(setEvents).finally(() => setLoading(false));
  }, [labId]);

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const EVENT_COLORS: Record<string, string> = {
    LAB_CREATED: 'var(--st-cyan)',
    LOCATION_CREATED: 'var(--st-cyan-dark)',
    CATALOG_UPLOADED: 'var(--st-success)',
    LIFECYCLE_TRANSITION: 'var(--st-warning)',
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Event</th>
              <th>Actor</th>
              <th>Object</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.eventId}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--st-text-muted)', whiteSpace: 'nowrap' }}>
                  {fmt(e.timestampUtc)}
                </td>
                <td>
                  <span className="badge" style={{ background: `${EVENT_COLORS[e.eventType] ?? 'var(--st-grey-bg)'}22`, color: EVENT_COLORS[e.eventType] ?? 'var(--st-text)' }}>
                    {e.eventType}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{e.actorId} <span style={{ color: 'var(--st-text-soft)' }}>({e.actorRole})</span></td>
                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.objectType}{e.objectId ? `#${e.objectId}` : ''}</td>
                <td style={{ fontSize: 12, color: 'var(--st-text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function LabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const labId = Number(id);
  const [lab, setLab] = useState<LabDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('catalog');

  const load = () => {
    setLoading(true);
    api.labs.get(labId).then(setLab).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [labId]);

  if (loading) return <div style={{ padding: 32, color: 'var(--st-text-muted)' }}>Loading…</div>;
  if (!lab) return <div style={{ padding: 32, color: 'var(--st-danger)' }}>Lab not found.</div>;

  const allStatuses = lab.locations.map(l => l.status);
  const primaryStatus = allStatuses.includes('Live') ? 'Live'
    : allStatuses.includes('Suspended') ? 'Suspended'
    : allStatuses[0] ?? 'Draft';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'catalog', label: `Catalog (${lab.locations.length})` },
    { key: 'locations', label: 'Locations' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader
        title={lab.legalName}
        subtitle={`${lab.labCompanyCode}  ·  ${lab.primaryContact}${lab.accreditationBody ? `  ·  ${lab.accreditationBody} ${lab.accreditationNumber ?? ''}` : ''}`}
        backTo="/labs"
        action={<LifecycleBadge status={primaryStatus} />}
      />

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--st-border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--st-cyan)' : 'transparent'}`,
              borderRadius: 0,
              padding: '8px 20px',
              color: tab === t.key ? 'var(--st-cyan-dark)' : 'var(--st-text-muted)',
              fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer',
              marginBottom: -2,
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && <CatalogTab labId={labId} />}
      {tab === 'locations' && <LocationsTab lab={lab} onRefresh={load} />}
      {tab === 'audit' && <AuditTab labId={labId} />}
    </div>
  );
}
