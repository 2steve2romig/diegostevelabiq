import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backTo, action }: Props) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {backTo && (
          <button
            className="btn-secondary"
            onClick={() => navigate(backTo)}
            style={{ padding: '5px 10px', fontSize: 12 }}
          >
            ← Back
          </button>
        )}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--st-text)' }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--st-text-muted)', fontSize: 12, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
