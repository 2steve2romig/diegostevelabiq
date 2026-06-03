import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',      icon: '📊' },
  { to: '/labs',       label: 'Labs',            icon: '🏭' },
  { to: '/tests',      label: 'Master Tests',    icon: '🔬' },
  { to: '/analytes',   label: 'Master Analytes', icon: '🧪' },
  { to: '/offerings',  label: 'Lab Offerings',   icon: '📋' },
  { to: '/transports', label: 'Transports',      icon: '📡' },
  { to: '/audit',      label: 'Audit Trail',     icon: '🔏' },
];

export function Sidebar() {
  return (
    <aside style={{
      width: 200, background: 'var(--st-cyan)', color: 'white',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
    }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>SureTrend</div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Lab IQ — Onboarding Portal</div>
      </div>
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
            color: 'white', fontSize: 13, textDecoration: 'none',
            borderLeft: `3px solid ${isActive ? 'white' : 'transparent'}`,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
          })}>
            <span>{icon}</span><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 11, opacity: 0.6 }}>
        Demo User · SureTrend Admin
      </div>
    </aside>
  );
}
