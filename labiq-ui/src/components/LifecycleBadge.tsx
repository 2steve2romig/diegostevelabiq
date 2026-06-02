const STATE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  Draft:                    { bg: 'var(--st-grey-bg)',      color: 'var(--st-text-muted)', label: 'Draft' },
  CatalogLoaded:            { bg: '#E3F2FD',               color: '#1565C0',              label: 'Catalog Loaded' },
  MappingConfirmed:         { bg: '#EDE7F6',               color: '#4527A0',              label: 'Mapping Confirmed' },
  TestTransactionsConfirmed:{ bg: '#FFF8E1',               color: '#E65100',              label: 'Test Txn Confirmed' },
  Live:                     { bg: 'var(--st-success-bg)',  color: 'var(--st-success)',    label: 'Live' },
  Suspended:                { bg: 'var(--st-danger-bg)',   color: 'var(--st-danger)',     label: 'Suspended' },
};

interface Props {
  status: string;
}

export function LifecycleBadge({ status }: Props) {
  const style = STATE_STYLES[status] ?? STATE_STYLES['Draft'];
  return (
    <span className="badge" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}
