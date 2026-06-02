import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface DashboardData {
  masterTestCount: number;
  orphanTestCount: number;
  masterAnalyteCount: number;
  connectedLabCount: number;
  testParameterBridges: number;
  labOfferingRows: number;
  recentActivity: { eventType: string; timestampUtc: string; actorId: string; objectType: string; reason: string | null }[];
  labCoverage: { labCompanyCode: string; legalName: string; total: number; covered: number; status: string }[];
}

const JOURNEY_STEPS = [
  { n: 1, label: 'Create Account',     done: true  },
  { n: 2, label: 'Add Users',          done: true  },
  { n: 3, label: 'Create a Lab',       done: true  },
  { n: 4, label: 'Add Test Catalog',   done: true  },
  { n: 5, label: 'Import SARF',        done: true  },
  { n: 6, label: 'Canonical Mapping',  done: true  },
  { n: 7, label: 'Setup Transport',    done: false },
  { n: 8, label: 'Test Transactions',  done: false },
  { n: 9, label: 'Go Live',            done: false },
];

const EVENT_COLORS: Record<string, string> = {
  LAB_CREATED:         'var(--st-cyan)',
  CATALOG_UPLOADED:    'var(--st-success)',
  LIFECYCLE_TRANSITION:'var(--st-warning)',
  TEST_CREATED:        'var(--st-cyan-dark)',
  ANALYTE_CREATED:     'var(--st-cyan-dark)',
};

const STATUS_COLORS: Record<string, string> = {
  Live:                     'var(--st-success)',
  TestTransactionsConfirmed:'var(--st-warning)',
  MappingConfirmed:         '#7B1FA2',
  CatalogLoaded:            '#1565C0',
  Draft:                    'var(--st-text-muted)',
  Suspended:                'var(--st-danger)',
};

function StatCard({ label, value, delta, variant = 'default' }: { label: string; value: number; delta?: string; variant?: 'default'|'success'|'warning'|'danger' }) {
  const bg: Record<string, string> = { default: 'white', success: 'var(--st-success-bg)', warning: 'var(--st-warning-bg)', danger: 'var(--st-danger-bg)' };
  const color: Record<string, string> = { default: 'var(--st-text)', success: 'var(--st-success)', warning: 'var(--st-warning)', danger: 'var(--st-danger)' };
  return (
    <div style={{ background: bg[variant], border: '1px solid var(--st-border)', borderRadius: 8, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--st-text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color[variant], lineHeight: 1 }}>{value.toLocaleString()}</div>
      {delta && <div style={{ fontSize: 11, color: 'var(--st-text-soft)', marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard.stats().then(setData);
  }, []);

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!data) return <div style={{ padding: 32, color: 'var(--st-text-muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Lab IQ Dashboard</h1>
        <p style={{ color: 'var(--st-text-muted)', marginTop: 4 }}>Master catalog, lab connectivity, and onboarding status at a glance</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Master Tests"   value={data.masterTestCount}    delta={data.orphanTestCount > 0 ? `${data.orphanTestCount} without analytes` : 'All linked'} variant={data.orphanTestCount > 0 ? 'warning' : 'default'} />
        <StatCard label="Master Analytes" value={data.masterAnalyteCount} delta="across all labs" />
        <StatCard label="Connected Labs" value={data.connectedLabCount}  delta="registered" />
        <StatCard label="Test–Parameter Bridges" value={data.testParameterBridges} variant="success" delta="associations" />
        <StatCard label="Lab Offering Rows" value={data.labOfferingRows} variant={data.labOfferingRows === 0 ? 'warning' : 'default'} delta="location offerings" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>
        {/* Journey */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Customer Onboarding Journey</div>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {JOURNEY_STEPS.map((step, i) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.done ? 'var(--st-success)' : 'var(--st-grey-bg)',
                    color: step.done ? 'white' : 'var(--st-text-muted)',
                    fontWeight: 700, fontSize: 13, border: step.done ? 'none' : '2px solid var(--st-border)',
                  }}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: step.done ? 'var(--st-text)' : 'var(--st-text-muted)', textAlign: 'center', maxWidth: 70 }}>{step.label}</div>
                </div>
                {i < JOURNEY_STEPS.length - 1 && (
                  <div style={{ height: 2, width: 16, background: step.done ? 'var(--st-success)' : 'var(--st-border)', marginBottom: 20, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Recent Catalog Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recentActivity.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 8, borderBottom: i < data.recentActivity.length - 1 ? '1px solid var(--st-border)' : 'none' }}>
                <span className="badge" style={{ background: `${EVENT_COLORS[e.eventType] ?? 'var(--st-grey-bg)'}22`, color: EVENT_COLORS[e.eventType] ?? 'var(--st-text-muted)', fontSize: 9, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {e.eventType.replace(/_/g, ' ')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--st-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.reason ?? `${e.objectType} updated`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--st-text-soft)' }}>{fmt(e.timestampUtc)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lab Coverage */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Lab Coverage</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.labCoverage.map(lab => {
            const pct = lab.total > 0 ? Math.round((lab.covered / lab.total) * 100) : 0;
            return (
              <div key={lab.labCompanyCode} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, background: 'var(--st-grey-bg)', padding: '2px 6px', borderRadius: 3, width: 90, textAlign: 'center', flexShrink: 0 }}>{lab.labCompanyCode}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--st-text-muted)' }}>{lab.legalName}</span>
                    <span style={{ color: STATUS_COLORS[lab.status] ?? 'var(--st-text-muted)', fontWeight: 600 }}>{lab.covered}/{lab.total} tests</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--st-grey-bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--st-success)' : 'var(--st-cyan)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, width: 36, textAlign: 'right', color: pct === 100 ? 'var(--st-success)' : 'var(--st-text-muted)' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => navigate('/tests')}>+ Add Test</button>
        <button className="btn-secondary" onClick={() => navigate('/analytes')}>+ Add Analyte</button>
        <button className="btn-secondary" onClick={() => navigate('/labs')}>Manage Labs</button>
        <button className="btn-secondary" onClick={() => navigate('/offerings')}>Lab Offerings</button>
      </div>
    </div>
  );
}
