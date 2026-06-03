import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuditRecord } from '../api/types';
import { PageHeader } from '../components/PageHeader';

const EVENT_COLORS: Record<string, string> = {
  LAB_CREATED:          'var(--st-cyan)',
  LOCATION_CREATED:     'var(--st-cyan-dark)',
  CATALOG_UPLOADED:     'var(--st-success)',
  LIFECYCLE_TRANSITION: 'var(--st-warning)',
  TEST_CREATED:         '#7B1FA2',
  TEST_UPDATED:         '#7B1FA2',
  TEST_DELETED:         'var(--st-danger)',
  ANALYTE_CREATED:      '#1565C0',
  ANALYTE_UPDATED:      '#1565C0',
  ANALYTE_DELETED:      'var(--st-danger)',
};

export function AuditTrailPage() {
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.audit.list({ eventType: filterType || undefined, search: search || undefined })
      .then(setEvents).finally(() => setLoading(false));
  };

  useEffect(() => { api.audit.eventTypes().then(setEventTypes); }, []);
  useEffect(() => { load(); }, [filterType, search]);

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const exportUrl = api.audit.exportUrl({ eventType: filterType || undefined, search: search || undefined });

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable, append-only log of all configuration changes and lifecycle transitions"
        action={
          <a href={exportUrl} download style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">📥 Export CSV</button>
          </a>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 220 }}>
          <option value="">All event types</option>
          {eventTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <input placeholder="Search actor, entity, or reason…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <span style={{ color: 'var(--st-text-muted)', fontSize: 12, alignSelf: 'center' }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

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
                <th>Before</th>
                <th>After</th>
                <th>Justification</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.eventId}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--st-text-muted)', whiteSpace: 'nowrap' }}>
                    {fmt(e.timestampUtc)}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: `${EVENT_COLORS[e.eventType] ?? 'var(--st-grey-bg)'}22`,
                      color: EVENT_COLORS[e.eventType] ?? 'var(--st-text-muted)',
                      fontSize: 10, whiteSpace: 'nowrap',
                    }}>
                      {e.eventType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{e.actorId}</span>
                    <span style={{ color: 'var(--st-text-soft)', fontSize: 11 }}> ({e.actorRole})</span>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {e.objectType}{e.objectId ? <span style={{ color: 'var(--st-text-muted)' }}>#{e.objectId}</span> : ''}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--st-text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.beforeStateHash ?? <span style={{ color: 'var(--st-text-soft)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.afterStateHash ?? <span style={{ color: 'var(--st-text-soft)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--st-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.reason ?? <span style={{ fontStyle: 'italic' }}>—</span>}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--st-text-muted)' }}>No audit events found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
