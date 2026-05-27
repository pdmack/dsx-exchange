import { GetStaticPaths, GetStaticProps } from 'next';
import SpecViewer from '../components/SpecViewer';

const SPECS = ['bms', 'power-management', 'nico', 'spiffe-exchange'];

interface Props {
  yaml: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: SPECS.map((spec) => ({ params: { spec } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const fs = require('fs');
  const path = require('path');
  const specKey = params?.spec as string;
  const specsDir = path.join(process.cwd(), 'specs');
  const yaml = fs.readFileSync(path.join(specsDir, `${specKey}.yaml`), 'utf-8');
  return { props: { yaml } };
};

export default function SpecPage({ yaml }: Props) {
  return <SpecViewer schema={yaml} />;
}
