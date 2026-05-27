import { useState } from 'react';
import dynamic from 'next/dynamic';

const AsyncApiComponent = dynamic(
  () => import('@asyncapi/react-component').then((mod) => mod.default),
  { ssr: false, loading: () => <div style={{ padding: '2rem' }}>Loading schema...</div> }
);

interface SpecViewerProps {
  schema: string;
}

type Tab = 'overview' | 'operations' | 'messages' | 'schemas' | 'raw';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'operations', label: 'Operations' },
  { key: 'messages', label: 'Messages' },
  { key: 'schemas', label: 'Schemas' },
  { key: 'raw', label: 'Raw YAML' },
];

const showConfig: Record<Tab, Record<string, boolean>> = {
  overview:   { sidebar: false, info: true, servers: false, operations: true, messages: true, schemas: true },
  operations: { sidebar: false, info: false, servers: false, operations: true, messages: false, schemas: false },
  messages:   { sidebar: false, info: false, servers: false, operations: false, messages: true, schemas: false },
  schemas:    { sidebar: false, info: false, servers: false, operations: false, messages: false, schemas: true },
  raw:        { sidebar: false },
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  border: 'none',
  borderBottom: active ? '2px solid #76B900' : '2px solid transparent',
  background: 'none',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '14px',
  color: active ? '#76B900' : '#666',
});

export default function SpecViewer({ schema }: SpecViewerProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(schema).then(done).catch(() => {
        fallbackCopy(schema);
        done();
      });
    } else {
      fallbackCopy(schema);
      done();
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: '16px', display: 'flex', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'raw' ? (
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '4px 12px',
              background: copied ? '#76B900' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <pre style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '16px',
            borderRadius: '8px',
            overflowY: 'auto',
            overflowX: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '13px',
            lineHeight: 1.5,
            maxHeight: 'calc(100vh - 200px)',
          }}>
            <code>{schema}</code>
          </pre>
        </div>
      ) : (
        <AsyncApiComponent
          schema={schema}
          config={{ show: showConfig[tab] }}
        />
      )}
    </div>
  );
}
