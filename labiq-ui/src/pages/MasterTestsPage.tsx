import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LabSummary, MasterAnalyte, MasterTest } from '../api/types';
import { Callout } from '../components/Callout';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

function TestModal({ test, labs, onClose, onSaved }: { test: MasterTest | null; labs: LabSummary[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ labId: labs[0]?.labId ?? 0, code: '', description: '', matrix: '', sampleSize: '', testCategory: '', reason: 'New test added' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (test) setForm({ labId: test.labId, code: test.code, description: test.currentDescription, matrix: test.matrix ?? '', sampleSize: test.sampleSize ?? '', testCategory: test.testCategory ?? '', reason: 'Description update' });
  }, [test]);

  const submit = async () => {
    if (!form.description || (!test && !form.code)) return;
    setSaving(true);
    try {
      if (test) { await api.tests.update(test.testCodeId, { description: form.description, matrix: form.matrix, sampleSize: form.sampleSize, testCategory: form.testCategory, reason: form.reason }); toast('Test updated', 'success'); }
      else { await api.tests.create({ labId: form.labId, code: form.code, description: form.description, matrix: form.matrix, sampleSize: form.sampleSize, testCategory: form.testCategory }); toast('Test created', 'success'); }
      onSaved();
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{test ? `Edit Test — ${test.code}` : 'Add New Test'}</div>
        {!test && (
          <>
            <div className="form-group">
              <label>Lab *</label>
              <select value={form.labId} onChange={e => set('labId', +e.target.value)}>
                {labs.map(l => <option key={l.labId} value={l.labId}>{l.legalName} ({l.labCompanyCode})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Test Code *</label>
              <input placeholder="e.g. QM103 (leave blank to auto-generate)" value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
          </>
        )}
        <div className="form-group"><label>Test Description *</label><input value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Matrix</label><input placeholder="e.g. RTE food" value={form.matrix} onChange={e => set('matrix', e.target.value)} /></div>
          <div className="form-group"><label>Sample Size</label><input placeholder="e.g. 25 g" value={form.sampleSize} onChange={e => set('sampleSize', e.target.value)} /></div>
          <div className="form-group"><label>Test Category</label><input placeholder="e.g. Pathogen detection" value={form.testCategory} onChange={e => set('testCategory', e.target.value)} /></div>
        </div>
        <div className="form-group"><label>Reason *</label><input value={form.reason} onChange={e => set('reason', e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !form.description}>{saving ? 'Saving…' : test ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

function LinkAnalyteModal({ test, onClose, onSaved }: { test: MasterTest; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [analytes, setAnalytes] = useState<MasterAnalyte[]>([]);
  const [selected, setSelected] = useState(0);
  const [newCode, setNewCode] = useState(''); const [newDesc, setNewDesc] = useState('');
  const [mode, setMode] = useState<'existing'|'new'>('existing');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.analytes.list(test.labId).then(a => { const av = a.filter(x => !test.parameters.some(p => p.parameterCodeId === x.parameterCodeId)); setAnalytes(av); if (av.length) setSelected(av[0].parameterCodeId); });
  }, [test.labId, test.parameters]);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === 'new') {
        const res = await api.analytes.create({ labId: test.labId, code: newCode, description: newDesc });
        await api.tests.linkAnalyte(test.testCodeId, res.parameterCodeId);
      } else {
        await api.tests.linkAnalyte(test.testCodeId, selected);
      }
      toast('Analyte linked', 'success'); onSaved();
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Link Analyte to {test.code}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={mode === 'existing' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }} onClick={() => setMode('existing')}>Select existing</button>
          <button className={mode === 'new' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12 }} onClick={() => setMode('new')}>Create new analyte</button>
        </div>
        {mode === 'existing' ? (
          analytes.length === 0
            ? <Callout type="info">All analytes are already linked to this test.</Callout>
            : <div className="form-group"><label>Analyte</label><select value={selected} onChange={e => setSelected(+e.target.value)}>{analytes.map(a => <option key={a.parameterCodeId} value={a.parameterCodeId}>{a.code} — {a.currentDescription}</option>)}</select></div>
        ) : (
          <>
            <div className="form-group"><label>New Analyte Code *</label><input placeholder="e.g. P014" value={newCode} onChange={e => setNewCode(e.target.value)} /></div>
            <div className="form-group"><label>New Analyte Description *</label><input placeholder="e.g. Listeria welshimeri" value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
          </>
        )}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || (mode === 'existing' && analytes.length === 0) || (mode === 'new' && (!newCode || !newDesc))}>{saving ? 'Linking…' : 'Link'}</button>
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
  const [editTest, setEditTest] = useState<MasterTest | null | 'none'>('none');
  const [linkTest, setLinkTest] = useState<MasterTest | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.tests.list(labFilter || undefined, search || undefined, filter === 'all' ? undefined : filter), api.labs.list()])
      .then(([t, l]) => { setTests(t); setLabs(l); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, filter, labFilter]);

  const toggle = (id: number) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async (tc: MasterTest) => {
    if (!window.confirm(`Delete test ${tc.code}?`)) return;
    await api.tests.delete(tc.testCodeId);
    toast(`${tc.code} deleted`, 'warning'); load();
  };

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <PageHeader title="Master Tests" subtitle={`${tests.length} test code${tests.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary" onClick={() => setEditTest(null)}>+ Add Test</button>} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search code or description…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All tests</option><option value="with">With analytes</option><option value="without">Without analytes</option>
        </select>
        <select value={labFilter} onChange={e => setLabFilter(+e.target.value)} style={{ width: 200 }}>
          <option value={0}>All labs</option>
          {labs.map(l => <option key={l.labId} value={l.labId}>{l.labCompanyCode}</option>)}
        </select>
        <span style={{ color: 'var(--st-text-muted)', fontSize: 12, alignSelf: 'center' }}>{tests.length} result{tests.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
          <table>
            <thead><tr>
              <th style={{ width: 28 }}></th>
              <th>Test Code</th><th>Description</th><th>Matrix</th>
              <th>Method / Size</th><th>Category</th><th>Lab</th><th>Analytes</th><th>Active</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {tests.map(tc => (<>
                <tr key={tc.testCodeId} onClick={() => toggle(tc.testCodeId)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'center', color: 'var(--st-text-soft)', fontSize: 11 }}>{expanded.has(tc.testCodeId) ? '▾' : '▸'}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{tc.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{tc.currentDescription}</td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{tc.matrix || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{[tc.sampleSize].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {tc.testCategory
                      ? <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>{tc.testCategory}</span>
                      : <span style={{ color: 'var(--st-text-soft)' }}>—</span>}
                  </td>
                  <td><span className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)' }}>{tc.labCode}</span></td>
                  <td>
                    {tc.parameters.slice(0, 3).map(p => <span key={p.parameterCodeId} className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)', marginRight: 3, fontFamily: 'monospace', fontSize: 10 }}>{p.code}</span>)}
                    {tc.parameters.length > 3 && <span style={{ fontSize: 10, color: 'var(--st-text-soft)' }}>+{tc.parameters.length - 3}</span>}
                    {tc.parameters.length === 0 && <span style={{ color: 'var(--st-text-soft)', fontSize: 11 }}>none</span>}
                  </td>
                  <td>{tc.activeFlag ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>Active</span> : null}</td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => setEditTest(tc)}>Edit</button>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => setLinkTest(tc)}>+ Analyte</button>
                    <button style={{ fontSize: 11, padding: '3px 8px', background: 'var(--st-danger-bg)', color: 'var(--st-danger)', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleDelete(tc)}>Delete</button>
                  </td>
                </tr>
                {expanded.has(tc.testCodeId) && (
                  <tr key={`${tc.testCodeId}-exp`}><td colSpan={10} style={{ padding: 0, background: 'var(--st-cyan-pale)' }}>
                    <div style={{ padding: '8px 16px 12px 56px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--st-text-muted)', marginBottom: 6 }}>
                        Analytes in this test (1..* via bridge)
                      </div>
                      {tc.parameters.length === 0
                        ? <Callout type="info">No analytes linked — click "+ Analyte" to add one.</Callout>
                        : <table><thead><tr><th>Analyte Code</th><th>Description</th><th>Method</th><th>Unit</th><th>Result Type</th><th>Bridge Key</th><th></th></tr></thead>
                          <tbody>{tc.parameters.map(p => (
                            <tr key={p.parameterCodeId}>
                              <td><span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{p.code}</span></td>
                              <td style={{ fontSize: 12 }}>{p.currentDescription}</td>
                              <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{p.methodCode || '—'}</td>
                              <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{p.defaultUnit || '—'}</td>
                              <td style={{ fontSize: 11 }}><span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>{p.defaultResultType || '—'}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--st-text-muted)' }}>{tc.code}+{p.code}</td>
                              <td>
                                <button style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', color: 'var(--st-danger)', border: '1px solid var(--st-danger)', borderRadius: 3, cursor: 'pointer' }}
                                  onClick={() => api.tests.unlinkAnalyte(tc.testCodeId, p.parameterCodeId).then(() => { toast('Analyte unlinked', 'info'); load(); })}>Unlink</button>
                              </td>
                            </tr>
                          ))}</tbody></table>
                      }
                    </div>
                  </td></tr>
                )}
              </>))}
              {tests.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No tests found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editTest !== 'none' && <TestModal test={editTest as MasterTest | null} labs={labs} onClose={() => setEditTest('none')} onSaved={() => { setEditTest('none'); load(); }} />}
      {linkTest && <LinkAnalyteModal test={linkTest} onClose={() => setLinkTest(null)} onSaved={() => { setLinkTest(null); load(); }} />}
    </div>
  );
}
