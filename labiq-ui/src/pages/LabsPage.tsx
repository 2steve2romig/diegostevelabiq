import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateLabRequest, LabSummary } from '../api/types';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { PageHeader } from '../components/PageHeader';

function CreateLabModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateLabRequest>({
    labCompanyCode: '',
    legalName: '',
    primaryAddress: '',
    primaryContact: '',
    accreditationBody: '',
    accreditationNumber: '',
    reason: 'New lab onboarding',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof CreateLabRequest, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.labCompanyCode || !form.legalName || !form.primaryAddress || !form.primaryContact) {
      setError('All required fields must be filled');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.labs.create(form);
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Register New Lab</div>
        {error && <div style={{ color: 'var(--st-danger)', background: 'var(--st-danger-bg)', padding: '8px 12px', borderRadius: 4, marginBottom: 16, fontSize: 12 }}>{error}</div>}
        <div className="form-group">
          <label>Lab Company Code *</label>
          <input placeholder="e.g. EUROFINS" value={form.labCompanyCode} onChange={e => set('labCompanyCode', e.target.value)} />
          <div style={{ fontSize: 11, color: 'var(--st-text-soft)', marginTop: 3 }}>Immutable once saved. Use uppercase, no spaces.</div>
        </div>
        <div className="form-group">
          <label>Legal Name *</label>
          <input placeholder="e.g. Eurofins Scientific Inc." value={form.legalName} onChange={e => set('legalName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Primary Address *</label>
          <input placeholder="e.g. 2200 Rittenhouse Sq, Philadelphia, PA" value={form.primaryAddress} onChange={e => set('primaryAddress', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Primary Contact (email) *</label>
          <input type="email" placeholder="e.g. integration@lab.com" value={form.primaryContact} onChange={e => set('primaryContact', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Accreditation Body</label>
            <input placeholder="e.g. A2LA" value={form.accreditationBody} onChange={e => set('accreditationBody', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Accreditation Number</label>
            <input placeholder="e.g. 2501.01" value={form.accreditationNumber} onChange={e => set('accreditationNumber', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Reason for Registration *</label>
          <input value={form.reason} onChange={e => set('reason', e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Register Lab'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LabsPage() {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.labs.list()
      .then(setLabs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader
        title="Labs"
        subtitle="Registered laboratory partners and their onboarding status"
        action={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Register Lab
          </button>
        }
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading…</div>
        ) : labs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--st-text-muted)' }}>
            No labs registered yet. Click "Register Lab" to get started.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Legal Name</th>
                <th>Contact</th>
                <th>Locations</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {labs.map(lab => (
                <tr key={lab.labId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/labs/${lab.labId}`)}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>
                      {lab.labCompanyCode}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{lab.legalName}</td>
                  <td style={{ color: 'var(--st-text-muted)' }}>{lab.primaryContact}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ background: 'var(--st-cyan-light)', color: 'var(--st-cyan-dark)', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                      {lab.locationCount}
                    </span>
                  </td>
                  <td><LifecycleBadge status={lab.primaryStatus} /></td>
                  <td style={{ color: 'var(--st-text-muted)' }}>{fmt(lab.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CreateLabModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
