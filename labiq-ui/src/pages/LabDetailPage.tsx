import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { AuditRecord, DescriptionHistoryEntry, LabDetail, LabLocationSummary, TestCodeSummary, TestOrder, TransitionRequest, TransportChannel, UpsertChannelRequest } from '../api/types';
import { Callout } from '../components/Callout';
import { CatalogUploadWizard } from '../components/CatalogUploadWizard';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

type Tab = 'catalog' | 'locations' | 'transactions' | 'channels' | 'audit';

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
              {catalog.map(tc => (<Fragment key={tc.testCodeId}>
                <tr onClick={() => toggle(tc.testCodeId)} style={{ cursor: 'pointer' }}>
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
                  <tr key={`param-${p.parameterCodeId}`} style={{ background: 'var(--st-cyan-pale)' }}>
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
              </Fragment>))}
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

function TransactionsTab({ labId, locationId, locationCode, locationStatus }: { labId: number; locationId: number; locationCode: string; locationStatus: string; onLifecycleChanged?: () => void }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [simulating, setSimulating] = useState<number | null>(null);

  const load = () => { setLoading(true); api.testOrders.list(labId, locationId).then(setOrders).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [locationId]);

  const dispatch = async () => {
    setDispatching(true);
    try { await api.testOrders.dispatch(labId, locationId); toast('Test order dispatched', 'success'); load(); }
    catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setDispatching(false); }
  };

  const simulate = async (orderId: number) => {
    setSimulating(orderId);
    try { const r = await api.testOrders.simulateResult(labId, locationId, orderId); toast(`Result ${r.status}: ${r.validationNotes}`, r.analyteCodesMatch ? 'success' : 'warning'); load(); }
    catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setSimulating(null); }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const validatedCount = orders.filter(o => o.status === 'Validated').length;
  const canConfirm = validatedCount > 0 && locationStatus === 'MappingConfirmed';

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    Dispatched:    { bg: '#E3F2FD', color: '#1565C0' },
    Validated:     { bg: 'var(--st-success-bg)', color: 'var(--st-success)' },
    Failed:        { bg: 'var(--st-danger-bg)',  color: 'var(--st-danger)' },
    ResultReceived:{ bg: 'var(--st-warning-bg)', color: 'var(--st-warning)' },
    NoResponse:    { bg: 'var(--st-grey-bg)',     color: 'var(--st-text-muted)' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Test Transactions — {locationCode}</div>
          <div style={{ fontSize: 12, color: 'var(--st-text-muted)' }}>
            Generate test orders and validate round-trip connectivity before going Live.
            {validatedCount > 0 && <span style={{ color: 'var(--st-success)', marginLeft: 8, fontWeight: 600 }}>✓ {validatedCount} validated</span>}
          </div>
        </div>
        <button className="btn-primary" onClick={dispatch} disabled={dispatching}>
          {dispatching ? 'Dispatching…' : '▶ Generate Test Order'}
        </button>
      </div>

      {orders.length === 0 && !loading && (
        <Callout type="info" style={{ marginBottom: 16 }}>
          No test orders yet. Click "Generate Test Order" to dispatch a test order over the configured integration channel.
          The system will build the order from this location's current test offerings.
        </Callout>
      )}

      {canConfirm && (
        <Callout type="success" style={{ marginBottom: 16 }}>
          <strong>{validatedCount} validated test transaction{validatedCount !== 1 ? 's' : ''}.</strong> You can now advance this location to Test Transactions Confirmed from the Locations tab.
        </Callout>
      )}

      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => {
            const st = STATUS_STYLE[order.status] ?? STATUS_STYLE['Dispatched'];
            return (
              <div key={order.testOrderId} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{order.sureTrendOrderId}</span>
                    <span className="badge" style={{ background: '#E8F4FD', color: '#0078A8', marginLeft: 8, fontSize: 10 }}>Test Mode</span>
                  </div>
                  <span className="badge" style={{ background: st.bg, color: st.color }}>{order.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--st-text-muted)', marginBottom: 10 }}>
                  <div>Dispatched: <strong style={{ color: 'var(--st-text)' }}>{fmt(order.dispatchedAtUtc)}</strong></div>
                  <div>By: <strong style={{ color: 'var(--st-text)' }}>{order.dispatchedBy ?? '—'}</strong></div>
                </div>

                {order.result ? (
                  <div style={{ background: order.result.analyteCodesMatch ? 'var(--st-success-bg)' : 'var(--st-danger-bg)', borderRadius: 6, padding: '10px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: order.result.analyteCodesMatch ? 'var(--st-success)' : 'var(--st-danger)', marginBottom: 4 }}>
                      {order.result.analyteCodesMatch ? '✓ Result validated' : '✗ Validation failed'}
                    </div>
                    <div style={{ color: 'var(--st-text)' }}>{order.result.validationNotes}</div>
                    <div style={{ color: 'var(--st-text-muted)', marginTop: 4 }}>Received: {fmt(order.result.receivedAtUtc)}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }}
                      onClick={() => simulate(order.testOrderId)} disabled={simulating === order.testOrderId}>
                      {simulating === order.testOrderId ? 'Simulating…' : '⟳ Simulate Result'}
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--st-text-muted)', alignSelf: 'center' }}>
                      Waiting for lab to return a result
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChannelsTab({ labId, locationId }: { labId: number; locationId: number }) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<TransportChannel[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<UpsertChannelRequest>({});
  const [saving, setSaving] = useState(false);

  const CHANNEL_TYPES = ['Sftp', 'RestApi', 'EncryptedEmail', 'SelfDescribingPdf'];
  const CHANNEL_LABELS: Record<string, string> = { Sftp: 'SFTP', RestApi: 'REST API', EncryptedEmail: 'Encrypted Email', SelfDescribingPdf: 'Self-Describing PDF' };

  useEffect(() => { api.channels.list(labId, locationId).then(setChannels); }, [locationId]);

  const startEdit = (type: string) => {
    const existing = channels.find(c => c.channelType === type);
    setForm(existing ? {
      hostingMode: existing.hostingMode ?? '', host: existing.host ?? '', port: existing.port ?? undefined,
      inboxPath: existing.inboxPath ?? '', outboxPath: existing.outboxPath ?? '',
      endpointUrl: existing.endpointUrl ?? '', authType: existing.authType ?? '',
      encryptionType: existing.encryptionType ?? '', recipientAddress: existing.recipientAddress ?? '',
      fileNamingTemplate: existing.fileNamingTemplate ?? '', isActive: existing.isActive,
    } : { isActive: true });
    setEditing(type);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.channels.upsert(labId, locationId, editing, { ...form, reason: `${editing} channel configured` });
      toast(`${CHANNEL_LABELS[editing]} configured`, 'success');
      const updated = await api.channels.list(labId, locationId);
      setChannels(updated);
      setEditing(null);
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setSaving(false); }
  };

  const set = (k: keyof UpsertChannelRequest, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));
  const existing = (type: string) => channels.find(c => c.channelType === type);

  return (
    <div>
      <Callout type="info" style={{ marginBottom: 16 }}>
        At least one active channel is required before a location can go Live.
        Configure the channel type that matches your lab's integration capability.
      </Callout>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {CHANNEL_TYPES.map(type => {
          const ch = existing(type);
          return (
            <div key={type} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>{CHANNEL_LABELS[type]}</span>
                {ch ? (
                  <span className="badge" style={{ background: ch.isActive ? 'var(--st-success-bg)' : 'var(--st-grey-bg)', color: ch.isActive ? 'var(--st-success)' : 'var(--st-text-muted)' }}>
                    {ch.isActive ? 'Active' : 'Inactive'}
                  </span>
                ) : <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>Not configured</span>}
              </div>
              {ch && (
                <div style={{ fontSize: 11, color: 'var(--st-text-muted)', marginBottom: 10 }}>
                  {type === 'Sftp' && ch.host && <div>Host: <strong>{ch.host}</strong>{ch.port ? `:${ch.port}` : ''} · {ch.hostingMode}</div>}
                  {type === 'RestApi' && ch.endpointUrl && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Endpoint: <strong>{ch.endpointUrl}</strong></div>}
                  {type === 'EncryptedEmail' && ch.recipientAddress && <div>To: <strong>{ch.recipientAddress}</strong> · {ch.encryptionType}</div>}
                  {ch.fileNamingTemplate && <div>Naming: <code style={{ fontSize: 10 }}>{ch.fileNamingTemplate}</code></div>}
                </div>
              )}
              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', width: '100%' }} onClick={() => startEdit(type)}>
                {ch ? 'Edit' : 'Configure'}
              </button>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Configure {CHANNEL_LABELS[editing]}</div>

            {editing === 'Sftp' && (<>
              <div className="form-group"><label>Hosting Mode</label>
                <select value={form.hostingMode ?? ''} onChange={e => set('hostingMode', e.target.value)}>
                  <option value="">Select…</option>
                  <option value="SureTrendHosted">SureTrend-hosted SFTP</option>
                  <option value="LabHosted">Lab-hosted SFTP</option>
                </select>
              </div>
              {form.hostingMode === 'LabHosted' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div className="form-group"><label>Host</label><input placeholder="sftp.lab.example.com" value={form.host ?? ''} onChange={e => set('host', e.target.value)} /></div>
                  <div className="form-group"><label>Port</label><input type="number" placeholder="22" value={form.port ?? ''} onChange={e => set('port', +e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label>Inbox Path</label><input placeholder="/SureTrend/orders" value={form.inboxPath ?? ''} onChange={e => set('inboxPath', e.target.value)} /></div>
                  <div className="form-group"><label>Outbox Path</label><input placeholder="/SureTrend/results" value={form.outboxPath ?? ''} onChange={e => set('outboxPath', e.target.value)} /></div>
                  <div className="form-group"><label>Archive Path</label><input placeholder="/SureTrend/archive" value={form.archivePath ?? ''} onChange={e => set('archivePath', e.target.value)} /></div>
                </div>
                <div className="form-group"><label>Public Key Fingerprint</label><input placeholder="SHA256:xK9m…" value={form.publicKeyFingerprint ?? ''} onChange={e => set('publicKeyFingerprint', e.target.value)} /></div>
              </>)}
            </>)}

            {editing === 'RestApi' && (<>
              <div className="form-group"><label>Endpoint URL</label><input placeholder="https://api.lab.example.com/orders" value={form.endpointUrl ?? ''} onChange={e => set('endpointUrl', e.target.value)} /></div>
              <div className="form-group"><label>Auth Type</label>
                <select value={form.authType ?? ''} onChange={e => set('authType', e.target.value)}>
                  <option value="">Select…</option>
                  <option value="OAuth2">OAuth 2.0</option>
                  <option value="mTLS">Mutual TLS</option>
                  <option value="ApiKey">API Key</option>
                </select>
              </div>
            </>)}

            {editing === 'EncryptedEmail' && (<>
              <div className="form-group"><label>Recipient Address</label><input placeholder="results@lab.example.com" value={form.recipientAddress ?? ''} onChange={e => set('recipientAddress', e.target.value)} /></div>
              <div className="form-group"><label>Encryption Type</label>
                <select value={form.encryptionType ?? ''} onChange={e => set('encryptionType', e.target.value)}>
                  <option value="">Select…</option>
                  <option value="SMIME">S/MIME</option>
                  <option value="PGP">OpenPGP</option>
                </select>
              </div>
            </>)}

            <div className="form-group">
              <label>File Naming Template <span style={{ fontSize: 10, color: 'var(--st-text-soft)' }}>(optional override)</span></label>
              <input placeholder="YYYYMMDD_CustomerCode_LabCode_Random.ext" value={form.fileNamingTemplate ?? ''} onChange={e => set('fileNamingTemplate', e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Channel'}</button>
            </div>
          </div>
        </div>
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
    { key: 'catalog',      label: 'Catalog' },
    { key: 'locations',    label: 'Locations' },
    { key: 'transactions', label: 'Test Transactions' },
    { key: 'channels',     label: 'Integration Channels' },
    { key: 'audit',        label: 'Audit Log' },
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

      {tab === 'catalog'      && <CatalogTab labId={labId} labs={labs} />}
      {tab === 'locations'   && <LocationsTab lab={lab} onRefresh={load} />}
      {tab === 'transactions' && (
        <TransactionsTab
          labId={labId}
          locationId={lab.locations[0]?.locationId ?? 0}
          locationCode={lab.locations[0]?.labLocationCode ?? ''}
          locationStatus={lab.locations[0]?.status ?? 'Draft'}
          onLifecycleChanged={load}
        />
      )}
      {tab === 'channels'  && <ChannelsTab labId={labId} locationId={lab.locations[0]?.locationId ?? 0} />}
      {tab === 'audit'     && <AuditTab labId={labId} />}
    </div>
  );
}
