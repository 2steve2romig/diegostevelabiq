import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LabDetail, LabLocationSummary, LabSummary, OfferingRow } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

export function LabOfferingsPage() {
  const { toast } = useToast();
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [selectedLabId, setSelectedLabId] = useState(0);
  const [labDetail, setLabDetail] = useState<LabDetail | null>(null);
  const [selectedLocId, setSelectedLocId] = useState(0);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => { api.labs.list().then(l => { setLabs(l); if (l.length) setSelectedLabId(l[0].labId); }); }, []);
  useEffect(() => {
    if (!selectedLabId) return;
    api.labs.get(selectedLabId).then(d => { setLabDetail(d); if (d.locations.length) setSelectedLocId(d.locations[0].locationId); });
  }, [selectedLabId]);
  useEffect(() => { if (selectedLabId && selectedLocId) api.offerings.list(selectedLabId, selectedLocId).then(setOfferings); }, [selectedLabId, selectedLocId]);

  const toggle = async (o: OfferingRow) => {
    setSaving(o.testCodeId);
    try {
      if (o.offered) { await api.offerings.remove(selectedLabId, selectedLocId, o.testCodeId); toast(`${o.code} removed`, 'warning'); }
      else           { await api.offerings.add(selectedLabId, selectedLocId, o.testCodeId);    toast(`${o.code} added`, 'success'); }
      setOfferings(await api.offerings.list(selectedLabId, selectedLocId));
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Error', 'danger'); }
    finally { setSaving(null); }
  };

  const filtered = offerings.filter(o => !search || o.code.toLowerCase().includes(search.toLowerCase()) || o.currentDescription.toLowerCase().includes(search.toLowerCase()));
  const offeredCount = offerings.filter(o => o.offered).length;
  const pct = offerings.length > 0 ? Math.round((offeredCount / offerings.length) * 100) : 0;
  const selectedLoc = labDetail?.locations.find((l: LabLocationSummary) => l.locationId === selectedLocId);

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader title="Lab Offerings" subtitle="Configure which tests each lab location offers" />

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label>Lab</label>
            <select value={selectedLabId} onChange={e => setSelectedLabId(+e.target.value)}>
              {labs.map(l => <option key={l.labId} value={l.labId}>{l.legalName} ({l.labCompanyCode})</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label>Location</label>
            <select value={selectedLocId} onChange={e => setSelectedLocId(+e.target.value)} disabled={!labDetail}>
              {labDetail?.locations.map((l: LabLocationSummary) => <option key={l.locationId} value={l.locationId}>{l.labLocationCode} — {l.address}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 200, marginBottom: 0 }}>
            <label>Filter tests</label>
            <input placeholder="Search code or description…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedLoc && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{selectedLoc.labLocationCode}</span>
              <span style={{ color: 'var(--st-text-muted)', marginLeft: 8, fontSize: 12 }}>{selectedLoc.address} · {selectedLoc.timeZone}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? 'var(--st-success)' : 'var(--st-text-muted)' }}>
              Showing {filtered.length} · {offeredCount}/{offerings.length} offered ({pct}%)
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--st-grey-bg)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--st-success)' : 'var(--st-cyan)', borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn-secondary" style={{ fontSize: 11 }} onClick={async () => {
          for (const o of offerings.filter(o => !o.offered)) await api.offerings.add(selectedLabId, selectedLocId, o.testCodeId);
          setOfferings(await api.offerings.list(selectedLabId, selectedLocId)); toast('All tests offered', 'success');
        }}>Select all tests</button>
        <button className="btn-secondary" style={{ fontSize: 11 }} onClick={async () => {
          for (const o of offerings.filter(o => o.offered)) await api.offerings.remove(selectedLabId, selectedLocId, o.testCodeId);
          setOfferings(await api.offerings.list(selectedLabId, selectedLocId)); toast('All tests cleared', 'warning');
        }}>Clear all tests</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead><tr>
            <th style={{ width: 40 }}>Offered</th>
            <th>Test Code</th><th>Description</th><th>Matrix</th><th>Sample Size</th><th>Category</th><th>Active</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.testCodeId} onClick={() => toggle(o)} style={{ cursor: 'pointer', background: o.offered ? 'var(--st-cyan-pale)' : undefined }}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={o.offered} readOnly style={{ accentColor: 'var(--st-cyan)', cursor: 'pointer' }} disabled={saving === o.testCodeId} />
                </td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{o.code}</span></td>
                <td style={{ fontSize: 12 }}>{o.currentDescription}</td>
                <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{o.matrix || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--st-text-muted)' }}>{o.sampleSize || '—'}</td>
                <td style={{ fontSize: 11 }}>
                  {o.testCategory ? <span className="badge" style={{ background: 'var(--st-grey-bg)', color: 'var(--st-text-muted)' }}>{o.testCategory}</span> : '—'}
                </td>
                <td>{o.activeFlag ? <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>Active</span> : null}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No tests found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
