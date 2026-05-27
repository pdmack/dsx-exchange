import { useState } from 'react';
import { GetStaticProps } from 'next';
import SpecViewer from '../components/SpecViewer';

interface Spec {
  key: string;
  label: string;
  yaml: string;
}

interface Props {
  specs: Spec[];
}

const SPEC_LABELS: Record<string, string> = {
  bms: 'BMS Event Bus',
  'power-management': 'Power Management',
  nico: 'NICo Host State',
  'spiffe-exchange': 'SPIFFE Exchange',
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  const fs = require('fs');
  const path = require('path');
  const specsDir = path.join(process.cwd(), 'specs');
  const specFiles = ['bms', 'power-management', 'nico', 'spiffe-exchange'];

  const specs = specFiles.map((key: string) => ({
    key,
    label: SPEC_LABELS[key] || key,
    yaml: fs.readFileSync(path.join(specsDir, `${key}.yaml`), 'utf-8'),
  }));

  return { props: { specs } };
};

export default function Home({ specs }: Props) {
  const [activeSpec, setActiveSpec] = useState(specs[0]?.key || '');
  const currentSpec = specs.find((s) => s.key === activeSpec);

  return (
    <div>
      <div className="spec-tabs">
        {specs.map((spec) => (
          <button
            key={spec.key}
            className={activeSpec === spec.key ? 'active' : ''}
            onClick={() => setActiveSpec(spec.key)}
            title={spec.label}
          >
            {spec.label}
          </button>
        ))}
      </div>
      {currentSpec && <SpecViewer schema={currentSpec.yaml} />}
    </div>
  );
}
