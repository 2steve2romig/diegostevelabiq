import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

type Transport = 'rest' | 'sftp' | 'email' | 'pdf';

const SAMPLE_ORDER_JSON = `{
  "descriptor": {
    "purpose": "LabOrder",
    "version": "1.0",
    "originator": "SureTrend",
    "createdAt": "${new Date().toISOString()}"
  },
  "labLocationCode": "FSNS-BLM",
  "order": {
    "orderId": "ST-2026-004421",
    "samples": [{
      "sampleId": "S-10042",
      "matrix": "RTE food",
      "tests": ["QM103", "QM117"]
    }]
  }
}`;

const SAMPLE_RESULT_JSON = `{
  "orderId": "ST-2026-004421",
  "status": "Final",
  "results": [{
    "sampleId": "S-10042",
    "testCode": "QM103",
    "parameterCode": "P001",
    "result": "Not detected",
    "unit": "per 25 g",
    "method": "AOAC RI 070902",
    "releasedAt": "${new Date().toISOString()}"
  }],
  "coaReference": "https://fsns.com/coa/ST-2026-004421.pdf"
}`;

function JsonDisplay({ json }: { json: string }) {
  const colored = json
    .replace(/("[\w]+")\s*:/g, '<span style="color:#0095CC">$1</span>:')
    .replace(/:\s*(".*?")/g, ': <span style="color:#2BA84A">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#E89015">$1</span>')
    .replace(/:\s*(\d+)/g, ': <span style="color:#7B1FA2">$1</span>');
  return (
    <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 16, borderRadius: 6, fontSize: 11, lineHeight: 1.6, overflow: 'auto', margin: 0 }}
      dangerouslySetInnerHTML={{ __html: colored }} />
  );
}

function RestTab() {
  const { toast } = useToast();
  const [endpoint, setEndpoint] = useState('https://diegostevelabiq-production.up.railway.app/api/labs');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [response, setResponse] = useState('');

  const send = async () => {
    setStatus('sending');
    setResponse('');
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
      setStatus('done');
      toast(`${res.status} ${res.statusText}`, res.ok ? 'success' : 'danger');
    } catch {
      setResponse('Connection error');
      setStatus('done');
      toast('Request failed', 'danger');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Request</div>
        <div className="form-group"><label>Endpoint</label><input value={endpoint} onChange={e => setEndpoint(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select style={{ width: 100 }}><option>GET</option><option>POST</option></select>
          <select style={{ flex: 1 }}><option>OAuth 2.0 + mTLS</option><option>API Key</option></select>
        </div>
        <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--st-text-muted)', marginBottom: 6 }}>Order Payload</div><JsonDisplay json={SAMPLE_ORDER_JSON} /></div>
        <button className="btn-primary" onClick={send} disabled={status === 'sending'} style={{ width: '100%' }}>
          {status === 'sending' ? 'Sending…' : 'Send Request'}
        </button>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Response</div>
          <span className="badge" style={{ background: status === 'done' ? 'var(--st-success-bg)' : 'var(--st-grey-bg)', color: status === 'done' ? 'var(--st-success)' : 'var(--st-text-muted)' }}>
            {status === 'idle' ? 'Idle' : status === 'sending' ? 'Sending…' : '200 OK'}
          </span>
        </div>
        {response ? <JsonDisplay json={response} /> : <div style={{ color: 'var(--st-text-soft)', fontSize: 12, padding: 16 }}>Send a request to see the response here.</div>}
      </div>
    </div>
  );
}

function SftpTab() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const connect = () => {
    setLog(l => [...l, '$ ssh-keyscan -H sftp.fsns.com >> ~/.ssh/known_hosts', '> Host key fingerprint verified', '$ sftp -i ~/.ssh/labiq_ed25519 labiq@sftp.fsns.com', '> Connected to sftp.fsns.com.', 'sftp> ']);
    setConnected(true);
    toast('SFTP connected', 'success');
  };

  const uploadFile = () => {
    setLog(l => [...l, 'sftp> put ST-2026-004421.json /SureTrend/orders/', '> Uploading ST-2026-004421.json to /SureTrend/orders/ST-2026-004421.json', '> 100% 1.2KB   1.2KB/s   00:00', '> File uploaded successfully.']);
    toast('File uploaded to SFTP', 'success');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Connection Settings</div>
        <div className="form-group"><label>Host</label><input defaultValue="sftp.fsns.com" /></div>
        <div className="form-group"><label>Authentication</label><select><option>SSH Key (ed25519)</option><option>RSA ≥ 3072</option></select></div>
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--st-cyan-light)', borderRadius: 4, fontSize: 11, color: 'var(--st-cyan-dark)' }}>
          🔑 Key: <code>~/.ssh/labiq_ed25519.pub</code> — fingerprint SHA256:xK9m…
        </div>
        <button className={connected ? 'btn-secondary' : 'btn-primary'} onClick={connect} style={{ width: '100%' }}>{connected ? '✓ Connected' : 'Connect'}</button>
        {connected && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Outbox — SureTrend Orders</div>
            <div style={{ border: '1px solid var(--st-border)', borderRadius: 4, padding: 8, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>📄 ST-2026-004421.json</span>
                <button className="btn-primary" style={{ fontSize: 10, padding: '2px 8px' }} onClick={uploadFile}>Upload</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>SSH Debug Log</div>
        <pre style={{ background: '#0d1117', color: '#58a6ff', padding: 12, borderRadius: 6, fontSize: 11, lineHeight: 1.7, minHeight: 200, overflow: 'auto' }}>
          {log.join('\n') || '# Waiting for connection…'}
        </pre>
      </div>
    </div>
  );
}

function EmailTab() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [encryption, setEncryption] = useState('S/MIME');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Compose — {encryption}</div>
        <div className="form-group"><label>From</label><input value="labiq-transport@suretrend.com" readOnly style={{ background: 'var(--st-grey-bg)' }} /></div>
        <div className="form-group"><label>To</label><input defaultValue="results-intake@fsns.com" /></div>
        <div className="form-group"><label>Subject</label><input defaultValue="[SureTrend] Lab Order ST-2026-004421" /></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={encryption} onChange={e => setEncryption(e.target.value)} style={{ flex: 1 }}><option>S/MIME</option><option>OpenPGP</option></select>
          <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)', alignSelf: 'center' }}>🔑 Key verified</span>
        </div>
        <div style={{ marginBottom: 12, padding: 8, background: 'var(--st-grey-bg)', borderRadius: 4, fontSize: 11, color: 'var(--st-text-muted)' }}>📎 ST-2026-004421.json (1.2 KB)</div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSent(true); toast('Encrypted email sent', 'success'); }}>
          🔒 Encrypt &amp; Send
        </button>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>On-Wire (Ciphertext)</div>
        {sent ? (
          <pre style={{ background: '#1e1e2e', color: '#a6e3a1', padding: 12, borderRadius: 6, fontSize: 10, lineHeight: 1.5, overflow: 'auto' }}>
{`MIME-Version: 1.0
Content-Type: application/pkcs7-mime;
  smime-type=enveloped-data; name="smime.p7m"
Content-Transfer-Encoding: base64

MIIBkgYJKoZIhvcNAQcDoIIBgzCCAX8CAQAxggFAMIIBPAIB
ADCBpTCBnjELMAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBZ
b3JrMQ8wDQYDVQQHEwZBcm1vbmsxFjAUBgNVBAoTDVN1cmVU
...
[delivery receipt: 202 Accepted — ${new Date().toLocaleTimeString()}]`}
          </pre>
        ) : <div style={{ color: 'var(--st-text-soft)', fontSize: 12, padding: 16 }}>Compose and send to see ciphertext here.</div>}
      </div>
    </div>
  );
}

function PdfTab() {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>COA Preview</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginBottom: 0 }}>
            <input type="checkbox" checked={showPayload} onChange={e => setShowPayload(e.target.checked)} />
            Show hidden payload
          </label>
        </div>
        <div style={{ border: '1px solid var(--st-border)', borderRadius: 4, padding: 20, background: 'white' }}>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>CERTIFICATE OF ANALYSIS</div>
          <div style={{ textAlign: 'center', color: 'var(--st-text-muted)', fontSize: 11, marginBottom: 16 }}>Food Safety Net Services — Bloomsburg, PA</div>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Order ID</td><td>ST-2026-004421</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Sample ID</td><td>S-10042</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Matrix</td><td>RTE food</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Test</td><td>Listeria monocytogenes</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Result</td><td style={{ color: 'var(--st-success)', fontWeight: 700 }}>Not detected per 25 g</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Method</td><td>AOAC RI 070902</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16, fontSize: 10, color: 'var(--st-text-muted)', borderTop: '1px solid var(--st-border)', paddingTop: 8 }}>
            Authorized By: J. Martinez, QA Director — {new Date().toLocaleDateString()}
          </div>
          {showPayload && (
            <div style={{ marginTop: 8, padding: 6, background: '#fffde7', border: '1px dashed #E89015', borderRadius: 3, fontSize: 9, fontFamily: 'monospace', color: '#5D4037', wordBreak: 'break-all' }}>
              [HIDDEN PAYLOAD — 1pt white-on-white in production]<br />
              {btoa(SAMPLE_RESULT_JSON).slice(0, 120)}…
            </div>
          )}
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>SHA-256 Manifest Sidecar</div>
        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['File name', 'ST-2026-004421-COA.pdf'],
            ['Pages', '2 (1 visible, 1 payload)'],
            ['SHA-256 (PDF)', 'a3f2c8...d9b1e4'],
            ['SHA-256 (payload)', 'b7e1a2...3f8c09'],
            ['Size', '84.2 KB'],
            ['Signed by', 'labiq-transport@suretrend.com'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--st-border)' }}>
              <span style={{ fontWeight: 600, color: 'var(--st-text-muted)' }}>{k}</span>
              <span style={{ fontFamily: k.includes('SHA') ? 'monospace' : 'inherit', fontSize: k.includes('SHA') ? 10 : 11 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)' }}>✓ 21 CFR Part 11 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransportsPage() {
  const [transport, setTransport] = useState<Transport>('rest');
  const TABS: { key: Transport; label: string }[] = [
    { key: 'rest', label: 'REST API' }, { key: 'sftp', label: 'SFTP' },
    { key: 'email', label: 'Encrypted Email' }, { key: 'pdf', label: 'Self-Describing PDF' },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader title="Transports" subtitle="Live emulator — configure and test order/result exchange channels" />

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ width: 260, marginBottom: 0 }}>
            <label>Lab / Location</label>
            <select><option>FSNS — FSNS-BLM (Bloomsburg)</option><option>FSNS — FSNS-MDV (Meadville)</option><option>Eurofins — EF-MAD (Madison)</option></select>
          </div>
          <div className="form-group" style={{ width: 200, marginBottom: 0 }}>
            <label>SARF Template</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge" style={{ background: 'var(--st-success-bg)', color: 'var(--st-success)', alignSelf: 'center' }}>v2.1 loaded</span>
              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Replace</button>
            </div>
          </div>
          <div className="form-group" style={{ width: 200, marginBottom: 0 }}>
            <label>COA Template</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge" style={{ background: 'var(--st-warning-bg)', color: 'var(--st-warning)', alignSelf: 'center' }}>Not uploaded</span>
              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Upload</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--st-border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTransport(t.key)} style={{
            background: 'none', border: 'none', borderBottom: `2px solid ${transport === t.key ? 'var(--st-cyan)' : 'transparent'}`,
            borderRadius: 0, padding: '8px 20px', color: transport === t.key ? 'var(--st-cyan-dark)' : 'var(--st-text-muted)',
            fontWeight: transport === t.key ? 700 : 400, cursor: 'pointer', marginBottom: -2, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {transport === 'rest'  && <RestTab  />}
      {transport === 'sftp'  && <SftpTab  />}
      {transport === 'email' && <EmailTab />}
      {transport === 'pdf'   && <PdfTab   />}
    </div>
  );
}
