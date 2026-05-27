import yaml from 'js-yaml';

interface NavItem {
  label: string;
  anchor: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function buildNav(specYaml: string): NavSection[] {
  const spec = yaml.load(specYaml) as any;
  if (!spec) return [];

  const sections: NavSection[] = [];

  const servers = spec.servers || {};
  sections.push({
    title: 'Servers',
    items: Object.keys(servers).map((name) => ({
      label: name,
      anchor: `server-${name}`,
    })),
  });

  const operations = spec.operations || {};
  sections.push({
    title: 'Operations',
    items: Object.entries(operations).map(([name, op]: [string, any]) => ({
      label: `${op.action === 'send' ? 'SEND' : 'RECV'} ${name}`,
      anchor: `operation-${op.action}-${name}`,
    })),
  });

  const channels = spec.channels || {};
  if (Object.keys(channels).length > 0) {
    sections.push({
      title: 'Channels',
      items: Object.keys(channels).map((name) => ({
        label: name,
        anchor: `channel-${name}`,
      })),
    });
  }

  const messages = spec.components?.messages || {};
  sections.push({
    title: 'Messages',
    items: Object.entries(messages).map(([name, msg]: [string, any]) => ({
      label: msg.title || msg.name || name,
      anchor: `message-${name}`,
    })),
  });

  const schemas = spec.components?.schemas || {};
  sections.push({
    title: 'Schemas',
    items: Object.keys(schemas).map((name) => ({
      label: name,
      anchor: `schema-${name}`,
    })),
  });

  return sections;
}
