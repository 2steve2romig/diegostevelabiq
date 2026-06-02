import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LabSummary, MasterAnalyte } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

function AnalyteModal({ analyte, labs, onClose, onSaved }: {
  analyte: MasterAnalyte | null; labs: LabSummary[]; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ labId: labs[0]?.labId ?? 0, code: '', description: '', methodCode: '', defaultUnit: '', defaultResultType: 'Qualitative', reason: 'New analyte' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (analyte) setForm({ labId: analyte.labId, code: analyte.code, description: analyte.currentDescription, methodCode: analyte.methodCode ?? '', defaultUnit: analyte.defaultUnit ?? '', defaultResultType: analyte.defaultResultType ?? 'Qualitative', reason: 'Description update' });
  }, [analyte]);

  const submit = async () => {
    setSaving(true);
    try {
      if (analyte) {
        await api.analytes.update(analyte.parameterCodeId, { description: form.description, reason: form.reason });
        toast('Analyte updated', 'success');
      } else {
        await api.analytes.create({ labId: form.labId, code: form.code, description: form.description, methodCode: form.methodCode, defaultUnit: form.defaultUnit, defaultResultType: form.defaultResultType });
        toast('Analyte created', 'success');
      }
      onSaved();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Error', 'danger');
    } finally { setSaving(false); }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{analyte ? `Edit Analyte — ${analyte.code}` : 'Add New Analyte'}</div>
        {!analyte && (
          <>
            <div className="form-group">
              <label>Lab *</label>
              <select value={form.labId} onChange={e => set('labId', e.target.value)}>
                {labs.map(l => <option key={l.labId} value={l.labId}>{l.legalName} ({l.labCompanyCode})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Analyte Code *</label>
              <input placeholder="e.g. P014" value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
          </>
        )}
        <div className="form-group">
          <label>Analyte Description *</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        {!analyte && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Method Code</label>
              <input placeholder="e.g. FDA BAM Ch. 5" value={form.methodCode} onChange={e => set('methodCode', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Default Unit</label>
              <input placeholder="e.g. CFU/g" value={form.defaultUnit} onChange={e => set('defaultUnit', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Result Type</label>
              <select value={form.defaultResultType} onChange={e => set('defaultResultType', e.target.value)}>
                <option>Qualitative</option><option>Quantitative</option><option>Semi-quantitative</option><option>MPN</option>
              </select>
            </div>
          </div>
        )}
        <div className="form-group">
          <label>Reason *</label>
          <input value={form.reason} onChange={e => set('reason', e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !form.description}>{saving ? 'Saving…' : analyte ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

export function MasterAnalytesPage() {
  const { toast } = useToast();
  const [analytes, setAnalytes] = useState<MasterAnalyte[]>([]);
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [labFilter, setLabFilter] = useState(0);
  const [editAnalyte, setEditAnalyte] = useState<MasterAnalyte | null | 'none'>('none');

  const load = () => {
    setLoading(true);
    Promise.all([api.analytes.list(labFilter || undefined, search || undefined), api.labs.list()])
      .then(([a, l]) => { setAnalytes(a); setLabs(l); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, labFilter]);

  const handleDelete = async (pc: MasterAnalyte) => {
    if (!window.confirm(`Delete analyte ${pc.code}?`)) return;
    await api.analytes.delete(pc.parameterCodeId);
    toast(`Analyte ${pc.code} deleted`, 'warning');
    load();
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader
        title="Master Analytes"
        subtitle={`${analytes.length} analyte${analytes.length !== 1 ? 's' : ''} across all labs`}
        action={<button className="btn-primary" onClick={() => setEditAnalyte(null)}>+ Add Analyte</button>}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Search by code or description…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <select value={labFilter} onChange={e => setLabFilter(+e.target.value)} style={{ width: 200 }}>
          <option value={0}>All labs</option>
          {labs.map(l => <option key={l.labId} value={l.labId}>{l.labCompanyCode} — {l.legalName}</option>)}
        </select>
        <span style={{ color: 'var(--st-text-muted)', fontSize: 12, alignSelf: 'center' }}>{analytes.length} result{analytes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div> : (
          <table>
            <thead><tr>
              <th>Analyte Code</th><th>Description</th><th>Method</th><th>Unit</th><th>Type</th><th>Used In Tests</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {analytes.map(pc => (
                <tr key={pc.parameterCodeId}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{pc.code}</span></td>
                  <td>{pc.currentDescription}</td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{pc.methodCode || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{pc.defaultUnit || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    <span className="badge" style={{ background: pc.defaultResultType === 'Quantitative' ? '#E3F2FD' : 'var(--st-cyan-light)', color: pc.defaultResultType === 'Quantitative' ? '#1565C0' : 'var(--st-cyan-dark)' }}>
                      {pc.defaultResultType || 'Qualitative'}
                    </span>
                  </td>
                  <td>
                    {pc.usedInTests.slice(0, 5).map(code => (
                      <span key={code} className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)', marginRight: 3, fontFamily: 'monospace', fontSize: 10 }}>{code}</span>
                    ))}
                    {pc.usedInTests.length > 5 && <span style={{ fontSize: 11, color: 'var(--st-text-soft)' }}>+{pc.usedInTests.length - 5}</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => setEditAnalyte(pc)}>Edit</button>
                    <button style={{ fontSize: 11, padding: '3px 8px', background: 'var(--st-danger-bg)', color: 'var(--st-danger)', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleDelete(pc)}>Delete</button>
                  </td>
                </tr>
              ))}
              {analytes.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No analytes found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editAnalyte !== 'none' && (
        <AnalyteModal analyte={editAnalyte as MasterAnalyte | null} labs={labs} onClose={() => setEditAnalyte('none')} onSaved={() => { setEditAnalyte('none'); load(); }} />
      )}
    </div>
  );
}
