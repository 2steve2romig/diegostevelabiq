import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { AuditRecord, DescriptionHistoryEntry, LabDetail, LabLocationSummary, TestCodeSummary, TransitionRequest } from '../api/types';
import { Callout } from '../components/Callout';
import { CatalogUploadWizard } from '../components/CatalogUploadWizard';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

type Tab = 'catalog' | 'locations' | 'audit';

const LIFECYCLE_NEXT: Record<string, string> = {
  Draft: 'CatalogLoaded', CatalogLoaded: 'MappingConfirmed',
  MappingConfirmed: 'TestTransactionsConfirmed', TestTransactionsConfirmed: 'Live',
  Live: 'Suspended', Suspended: 'Live',
};
const LIFECYCLE_LABEL: Record<string, string> = {
  CatalogLoaded: 'Mark Catalog Loaded', MappingConfirmed: 'Approve Mapping',
  TestTransactionsConfirmed: 'Confirm Test Transactions', Live: 'Promote to Live',
  Suspended: 'Suspend', Draft: 'Reset to Draft',
};

function HistoryPanel({ labId, code, type, onClose }: { labId: number; code: string; type: 'test'|'param'; onClose: () => void }) {
  const [history, setHistory] = useState<DescriptionHistoryEntry[]>([]);
  useEffect(() => {
    const fn = type === 'test' ? api.catalog.testHistory(labId, code) : api.catalog.paramHistory(labId, code);
    fn.then(r => setHistory(r.history));
  }, [labId, code, type]);
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Description History — <span style={{ fontFamily: 'monospace' }}>{code}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '10px 14px', border: '1px solid var(--st-border)', borderRadius: 6, background: h.isCurrent ? 'var(--st-cyan-pale)' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{h.description}</span>
                {h.isCurrent && <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)', fontSize: 10 }}>Current</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>
                Effective: {fmt(h.effectiveStart)} → {h.effectiveEnd ? fmt(h.effectiveEnd) : 'Present'}
              </div>
            </div>
          ))}
          {history.length === 0 && <div style={{ color: 'var(--st-text-muted)' }}>Loading…</div>}
        </div>
        <div className="modal-footer"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function CatalogTab({ labId, labs }: { labId: number; labs: any[] }) {
  const [catalog, setCatalog] = useState<TestCodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const [history, setHistory] = useState<{ code: string; type: 'test'|'param' } | null>(null);

  const load = () => { setLoading(true); api.catalog.list(labId).then(setCatalog).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [labId]);
  const toggle = (id: number) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--st-text-muted)' }}>
          {catalog.length} test code{catalog.length !== 1 ? 's' : ''} · {catalog.reduce((n, t) => n + t.parameterCount, 0)} analytes
        </div>
        <button className="btn-primary" onClick={() => setShowWizard(true)}>↑ Upload Catalog</button>
      </div>

      {catalog.length === 0 && !loading && (
        <Callout type="info" style={{ marginBottom: 16 }}>
          No catalog loaded yet. Upload a CSV or XLSX to get started. Click descriptions (underlined) to view version history.
        </Callout>
      )}

      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead><tr>
              <th style={{ width: 28 }}></th>
              <th>Test Code</th><th>Description</th><th>Matrix</th><th>Sample Size</th><th>Category</th><th>Analytes</th><th>Active</th>
            </tr></thead>
            <tbody>
              {catalog.map(tc => (<>
                <tr key={tc.testCodeId} onClick={() => toggle(tc.testCodeId)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'center', color: 'var(--st-text-soft)', fontSize: 11 }}>{expanded.has(tc.testCodeId) ? '▾' : '▸'}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{tc.code}</span></td>
                  <td>
                    <span style={{ cursor: 'help', borderBottom: '1px dashed var(--st-border)' }} onClick={e => { e.stopPropagation(); setHistory({ code: tc.code, type: 'test' }); }} title="View description history">
                      {tc.currentDescription}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{tc.matrix || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{tc.sampleSize || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {tc.testCategory ? <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>{tc.testCategory}</span> : '—'}
                  </td>
                  <td style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{tc.parameterCount} analyte{tc.parameterCount !== 1 ? 's' : ''}</td>
                  <td>{tc.activeFlag ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>Active</span> : null}</td>
                </tr>
                {expanded.has(tc.testCodeId) && tc.parameters.map(p => (
                  <tr key={p.parameterCodeId} style={{ background: 'var(--st-cyan-pale)' }}>
                    <td></td>
                    <td style={{ paddingLeft: 28 }}><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--st-text-muted)' }}>{p.code}</span></td>
                    <td colSpan={5}>
                      <span style={{ fontSize: 12, cursor: 'help', borderBottom: '1px dashed var(--st-border)' }} onClick={() => setHistory({ code: p.code, type: 'param' })} title="View description history">{p.currentDescription}</span>
                      <span style={{ fontSize: 11, color: 'var(--st-text-muted)', marginLeft: 16 }}>Method: <strong>{p.methodCode || '—'}</strong></span>
                      <span style={{ fontSize: 11, color: 'var(--st-text-muted)', marginLeft: 12 }}>Unit: <strong>{p.defaultUnit || '—'}</strong></span>
                      <span style={{ fontSize: 11, color: 'var(--st-text-muted)', marginLeft: 12 }}>Type: <strong>{p.defaultResultType || '—'}</strong></span>
                    </td>
                    <td></td>
                  </tr>
                ))}
              </>))}
              {catalog.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No catalog loaded.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && <CatalogUploadWizard labId={labId} labs={labs} onClose={() => setShowWizard(false)} onDone={() => { setShowWizard(false); load(); }} />}
      {history && <HistoryPanel labId={labId} code={history.code} type={history.type} onClose={() => setHistory(null)} />}
    </div>
  );
}

function LocationsTab({ lab, onRefresh }: { lab: LabDetail; onRefresh: () => void }) {
  const { toast } = useToast();
  const [transitioning, setTransitioning] = useState<number | null>(null);

  const handleTransition = async (loc: LabLocationSummary) => {
    const next = LIFECYCLE_NEXT[loc.status];
    if (!next) return;
    const reason = window.prompt(`Reason for transitioning to ${next}?`);
    if (!reason) return;
    setTransitioning(loc.locationId);
    try {
      await api.labs.transition(lab.labId, loc.locationId, { targetState: next, reason } as TransitionRequest);
      toast(`${loc.labLocationCode} → ${next}`, 'success');
      onRefresh();
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setTransitioning(null); }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table>
        <thead><tr><th>Location Code</th><th>Address</th><th>Time Zone</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {lab.locations.map(loc => {
            const next = LIFECYCLE_NEXT[loc.status];
            return (
              <tr key={loc.locationId}>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{loc.labLocationCode}</span></td>
                <td style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{loc.address}</td>
                <td style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{loc.timeZone}</td>
                <td><LifecycleBadge status={loc.status} /></td>
                <td>
                  {next && (
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                      disabled={transitioning === loc.locationId} onClick={() => handleTransition(loc)}>
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
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.labs.audit(labId).then(setEvents).finally(() => setLoading(false)); }, [labId]);
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const EVENT_COLORS: Record<string, string> = { LAB_CREATED: 'var(--st-cyan)', CATALOG_UPLOADED: 'var(--st-success)', LIFECYCLE_TRANSITION: 'var(--st-warning)' };
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
        <table>
          <thead><tr><th>Timestamp (UTC)</th><th>Event</th><th>Actor</th><th>Object</th><th>Before</th><th>After</th><th>Justification</th></tr></thead>
          <tbody>
            {events.map(e => (
              <tr key={e.eventId}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--st-text-muted)', whiteSpace: 'nowrap' }}>{fmt(e.timestampUtc)}</td>
                <td><span className="badge" style={{ background: `${EVENT_COLORS[e.eventType] ?? 'var(--st-grey-bg)'}22`, color: EVENT_COLORS[e.eventType] ?? 'var(--st-text-muted)', fontSize: 10 }}>{e.eventType.replace(/_/g, ' ')}</span></td>
                <td style={{ fontSize: 12 }}>{e.actorId} <span style={{ color: 'var(--st-text-soft)', fontSize: 11 }}>({e.actorRole})</span></td>
                <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{e.objectType}{e.objectId ? `#${e.objectId}` : ''}</td>
                <td style={{ fontSize: 11, color: 'var(--st-text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.beforeStateHash ?? '—'}</td>
                <td style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.afterStateHash ?? '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--st-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.reason ?? '—'}</td>
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
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('catalog');

  const load = () => { setLoading(true); Promise.all([api.labs.get(labId), api.labs.list()]).then(([l, all]) => { setLab(l); setLabs(all); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [labId]);

  if (loading) return <div style={{ padding: 32, color: 'var(--st-text-muted)' }}>Loading…</div>;
  if (!lab) return <div style={{ padding: 32, color: 'var(--st-danger)' }}>Lab not found.</div>;

  const allStatuses = lab.locations.map(l => l.status);
  const primaryStatus = allStatuses.includes('Live') ? 'Live' : allStatuses.includes('Suspended') ? 'Suspended' : allStatuses[0] ?? 'Draft';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'catalog',   label: `Catalog (${lab.locations.length})` },
    { key: 'locations', label: 'Locations' },
    { key: 'audit',     label: 'Audit Log' },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      <PageHeader
        title={lab.legalName}
        subtitle={[lab.labCompanyCode, lab.sourceLims, lab.primaryContact, lab.accreditationBody ? `${lab.accreditationBody} ${lab.accreditationNumber ?? ''}` : null].filter(Boolean).join('  ·  ')}
        backTo="/labs"
        action={<LifecycleBadge status={primaryStatus} />}
      />

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--st-border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--st-cyan)' : 'transparent'}`,
            borderRadius: 0, padding: '8px 20px', color: tab === t.key ? 'var(--st-cyan-dark)' : 'var(--st-text-muted)',
            fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', marginBottom: -2, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'catalog'   && <CatalogTab labId={labId} labs={labs} />}
      {tab === 'locations' && <LocationsTab lab={lab} onRefresh={load} />}
      {tab === 'audit'     && <AuditTab labId={labId} />}
    </div>
  );
}
