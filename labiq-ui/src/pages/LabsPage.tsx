import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateLabRequest, LabSummary } from '../api/types';
import { Callout } from '../components/Callout';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

function CreateLabModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<CreateLabRequest>({
    labCompanyCode: '', legalName: '', primaryAddress: '', primaryContact: '',
    accreditationBody: '', accreditationNumber: '', sourceLims: '', reason: 'New lab onboarding',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof CreateLabRequest, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.labCompanyCode || !form.legalName || !form.primaryAddress || !form.primaryContact) {
      setError('Lab code, legal name, address, and contact are required'); return;
    }
    setSaving(true); setError('');
    try { await api.labs.create(form); toast('Lab registered', 'success'); onCreated(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Register New Lab</div>
        {error && <Callout type="danger" style={{ marginBottom: 16 }}>{error}</Callout>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Lab Company Code *</label>
            <input placeholder="e.g. EUROFINS" value={form.labCompanyCode} onChange={e => set('labCompanyCode', e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--st-text-soft)', marginTop: 3 }}>Immutable once saved.</div>
          </div>
          <div className="form-group">
            <label>Source LIMS</label>
            <input placeholder="e.g. LabWare LIMS 7" value={form.sourceLims} onChange={e => set('sourceLims', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Legal Name *</label>
          <input value={form.legalName} onChange={e => set('legalName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Primary Address *</label>
          <input value={form.primaryAddress} onChange={e => set('primaryAddress', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Primary Contact (email) *</label>
          <input type="email" value={form.primaryContact} onChange={e => set('primaryContact', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Accreditation Body</label><input placeholder="e.g. A2LA" value={form.accreditationBody} onChange={e => set('accreditationBody', e.target.value)} /></div>
          <div className="form-group"><label>Accreditation Number</label><input placeholder="e.g. 2501.01" value={form.accreditationNumber} onChange={e => set('accreditationNumber', e.target.value)} /></div>
        </div>
        <div className="form-group"><label>Reason *</label><input value={form.reason} onChange={e => set('reason', e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Register Lab'}</button>
        </div>
      </div>
    </div>
  );
}

export function LabsPage() {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const load = () => { setLoading(true); api.labs.list().then(setLabs).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const filtered = labs.filter(l => !search || l.legalName.toLowerCase().includes(search.toLowerCase()) || l.labCompanyCode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader
        title="Labs"
        subtitle="Registered laboratory partners and their onboarding status"
        action={<button className="btn-primary" onClick={() => setShowModal(true)}>+ Register Lab</button>}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <span style={{ color: 'var(--st-text-muted)', fontSize: 12, alignSelf: 'center' }}>{filtered.length} lab{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--st-text-muted)' }}>No labs registered yet.</div>
        ) : (
          <table>
            <thead><tr>
              <th>Code</th><th>Lab</th><th>Address</th><th>Contact</th>
              <th>Locations</th><th>Status</th><th>Registered</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(lab => (
                <tr key={lab.labId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/labs/${lab.labId}`)}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{lab.labCompanyCode}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{lab.legalName}</div>
                    <div style={{ fontSize: 11, color: 'var(--st-text-muted)', marginTop: 1 }}>
                      {lab.sourceLims && <span style={{ marginRight: 8 }}>🖥 {lab.sourceLims}</span>}
                      {lab.accreditationBody && <span className="badge" style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)', fontSize: 9 }}>
                        {lab.accreditationBody} {lab.accreditationNumber}
                      </span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{lab.primaryContact}</td>
                  <td style={{ color: 'var(--st-text-muted)', fontSize: 12 }}>{lab.primaryContact}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>{lab.locationCount}</span>
                  </td>
                  <td><LifecycleBadge status={lab.primaryStatus} /></td>
                  <td style={{ fontSize: 12, color: 'var(--st-text-muted)' }}>{fmt(lab.createdAtUtc)}</td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => navigate(`/labs/${lab.labId}`)}>Edit</button>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => navigate('/offerings')}>Offerings</button>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate(`/labs/${lab.labId}`)}>Add Tests</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <CreateLabModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
