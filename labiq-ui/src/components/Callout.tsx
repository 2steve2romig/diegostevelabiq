type CalloutType = 'info' | 'warning' | 'success' | 'danger';

const STYLES: Record<CalloutType, { bg: string; border: string; color: string; icon: string }> = {
  info:    { bg: 'var(--st-cyan-light)',   border: 'var(--st-cyan)',    color: 'var(--st-cyan-dark)',  icon: 'ℹ' },
  warning: { bg: 'var(--st-warning-bg)',   border: 'var(--st-warning)', color: '#7A4D00',              icon: '⚠' },
  success: { bg: 'var(--st-success-bg)',   border: 'var(--st-success)', color: '#1A6630',              icon: '✓' },
  danger:  { bg: 'var(--st-danger-bg)',    border: 'var(--st-danger)',  color: 'var(--st-danger)',     icon: '✕' },
};

interface Props {
  type?: CalloutType;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Callout({ type = 'info', children, style }: Props) {
  const s = STYLES[type];
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6,
      padding: '10px 14px', fontSize: 12, color: s.color, ...style,
    }}>
      <span style={{ fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
