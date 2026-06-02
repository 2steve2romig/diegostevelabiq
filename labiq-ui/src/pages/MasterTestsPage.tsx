import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LabSummary, MasterTest } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

function TestModal({ test, labId, labs, onClose, onSaved }: {
  test: MasterTest | null; labId: number | null; labs: LabSummary[];
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ labId: labId ?? labs[0]?.labId ?? 0, code: '', description: '', reason: 'New test added' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (test) setForm({ labId: test.labId, code: test.code, description: test.currentDescription, reason: 'Description update' });
  }, [test]);

  const submit = async () => {
    if (!form.description) return;
    setSaving(true);
    try {
      if (test) {
        await api.tests.update(test.testCodeId, { description: form.description, reason: form.reason });
        toast('Test updated', 'success');
      } else {
        await api.tests.create({ labId: form.labId, code: form.code, description: form.description });
        toast('Test created', 'success');
      }
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Error', 'danger');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{test ? `Edit Test — ${test.code}` : 'Add New Test'}</div>
        {!test && (
          <>
            <div className="form-group">
              <label>Lab *</label>
              <select value={form.labId} onChange={e => setForm(f => ({ ...f, labId: +e.target.value }))}>
                {labs.map(l => <option key={l.labId} value={l.labId}>{l.legalName} ({l.labCompanyCode})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Test Code *</label>
              <input placeholder="e.g. QM103" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <div style={{ fontSize: 11, color: 'var(--st-text-soft)', marginTop: 3 }}>Immutable once saved.</div>
            </div>
          </>
        )}
        <div className="form-group">
          <label>Test Description *</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Reason *</label>
          <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !form.description}>{saving ? 'Saving…' : test ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

function LinkAnalyteModal({ test, onClose, onSaved }: { test: MasterTest; labs?: LabSummary[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [analytes, setAnalytes] = useState<{ parameterCodeId: number; code: string; currentDescription: string }[]>([]);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.analytes.list(test.labId).then(a => { setAnalytes(a); if (a.length) setSelected(a[0].parameterCodeId); });
  }, [test.labId]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.tests.linkAnalyte(test.testCodeId, selected);
      toast('Analyte linked', 'success');
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Error', 'danger');
    } finally { setSaving(false); }
  };

  const available = analytes.filter(a => !test.parameters.some(p => p.parameterCodeId === a.parameterCodeId));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Link Analyte to {test.code}</div>
        {available.length === 0 ? (
          <p style={{ color: 'var(--st-text-muted)' }}>All analytes are already linked to this test.</p>
        ) : (
          <div className="form-group">
            <label>Analyte</label>
            <select value={selected} onChange={e => setSelected(+e.target.value)}>
              {available.map(a => <option key={a.parameterCodeId} value={a.parameterCodeId}>{a.code} — {a.currentDescription}</option>)}
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || available.length === 0}>{saving ? 'Linking…' : 'Link'}</button>
        </div>
      </div>
    </div>
  );
}

export function MasterTestsPage() {
  const { toast } = useToast();
  const [tests, setTests] = useState<MasterTest[]>([]);
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [labFilter, setLabFilter] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editTest, setEditTest] = useState<MasterTest | null | 'new'>('none' as unknown as null);
  const [linkTest, setLinkTest] = useState<MasterTest | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.tests.list(labFilter || undefined, search || undefined, filter === 'all' ? undefined : filter),
      api.labs.list()
    ]).then(([t, l]) => { setTests(t); setLabs(l); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, filter, labFilter]);

  const toggleExpand = (id: number) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async (tc: MasterTest) => {
    if (!window.confirm(`Delete test ${tc.code}? This cannot be undone.`)) return;
    await api.tests.delete(tc.testCodeId);
    toast(`Test ${tc.code} deleted`, 'warning');
    load();
  };

  const handleUnlink = async (testId: number, paramId: number) => {
    await api.tests.unlinkAnalyte(testId, paramId);
    toast('Analyte unlinked', 'info');
    load();
  };

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      <PageHeader
        title="Master Tests"
        subtitle={`${tests.length} test code${tests.length !== 1 ? 's' : ''} across all labs`}
        action={<button className="btn-primary" onClick={() => setEditTest(null)}>+ Add Test</button>}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search by code or description…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All tests</option>
          <option value="with">With parameters</option>
          <option value="without">Without parameters</option>
        </select>
        <select value={labFilter} onChange={e => setLabFilter(+e.target.value)} style={{ width: 200 }}>
          <option value={0}>All labs</option>
          {labs.map(l => <option key={l.labId} value={l.labId}>{l.labCompanyCode} — {l.legalName}</option>)}
        </select>
        <span style={{ color: 'var(--st-text-muted)', fontSize: 12, alignSelf: 'center' }}>{tests.length} result{tests.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
          <table>
            <thead><tr>
              <th style={{ width: 28 }}></th>
              <th>Test Code</th>
              <th>Description</th>
              <th>Lab</th>
              <th>Analytes</th>
              <th>Active</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {tests.map(tc => (<>
                <tr key={tc.testCodeId} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(tc.testCodeId)}>
                  <td style={{ textAlign: 'center', color: 'var(--st-text-soft)', fontSize: 11 }}>{expanded.has(tc.testCodeId) ? '▾' : '▸'}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{tc.code}</span></td>
                  <td>{tc.currentDescription}</td>
                  <td><span className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)' }}>{tc.labCode}</span></td>
                  <td>
                    {tc.parameters.map(p => (
                      <span key={p.parameterCodeId} className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)', marginRight: 4 }}>{p.code}</span>
                    ))}
                    {tc.parameters.length === 0 && <span style={{ color: 'var(--st-text-soft)', fontSize: 11 }}>none</span>}
                  </td>
                  <td>{tc.activeFlag ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>Active</span> : <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>Inactive</span>}</td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => setEditTest(tc)}>Edit</button>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => setLinkTest(tc)}>+ Analyte</button>
                    <button style={{ fontSize: 11, padding: '3px 8px', background: 'var(--st-danger-bg)', color: 'var(--st-danger)', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleDelete(tc)}>Delete</button>
                  </td>
                </tr>
                {expanded.has(tc.testCodeId) && (
                  <tr key={`${tc.testCodeId}-exp`}><td colSpan={7} style={{ padding: 0, background: 'var(--st-cyan-pale)' }}>
                    <div style={{ padding: '8px 24px 12px 48px' }}>
                      {tc.parameters.length === 0 ? (
                        <div style={{ color: 'var(--st-text-soft)', fontSize: 12, padding: '8px 0' }}>No analytes linked — click "+ Analyte" to add one.</div>
                      ) : (
                        <table>
                          <thead><tr>
                            <th>Analyte Code</th><th>Description</th><th>Method</th><th>Unit</th><th>Type</th><th>Actions</th>
                          </tr></thead>
                          <tbody>
                            {tc.parameters.map(p => (
                              <tr key={p.parameterCodeId}>
                                <td><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.code}</span></td>
                                <td style={{ fontSize: 12 }}>{p.currentDescription}</td>
                                <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{p.methodCode || '—'}</td>
                                <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{p.defaultUnit || '—'}</td>
                                <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{p.defaultResultType || '—'}</td>
                                <td>
                                  <button style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', color: 'var(--st-danger)', border: '1px solid var(--st-danger)', borderRadius: 3, cursor: 'pointer' }}
                                    onClick={() => handleUnlink(tc.testCodeId, p.parameterCodeId)}>Unlink</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </td></tr>
                )}
              </>))}
              {tests.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No tests found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editTest !== ('none' as unknown as null) && (
        <TestModal test={editTest as MasterTest | null} labId={null} labs={labs} onClose={() => setEditTest('none' as unknown as null)} onSaved={() => { setEditTest('none' as unknown as null); load(); }} />
      )}
      {linkTest && <LinkAnalyteModal test={linkTest} labs={labs} onClose={() => setLinkTest(null)} onSaved={() => { setLinkTest(null); load(); }} />}
    </div>
  );
}
