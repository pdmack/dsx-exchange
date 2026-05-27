import { useState } from 'react';

interface NavSection {
  title: string;
  items: { label: string; anchor: string }[];
}

interface SchemaNavProps {
  sections: NavSection[];
  onNavigate: (anchor: string) => void;
}

export default function SchemaNav({ sections, onNavigate }: SchemaNavProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s) => [s.title, true]))
  );

  const toggle = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <nav className="viewer-sidebar">
      {sections.map((section) => (
        <div key={section.title} className="nav-section">
          <button
            className={`nav-section-btn ${openSections[section.title] ? 'open' : ''}`}
            onClick={() => toggle(section.title)}
          >
            <span>{section.title}</span>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M4.5 2L8.5 6L4.5 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {openSections[section.title] && section.items.length > 0 && (
            <ul className="nav-items">
              {section.items.map((item) => (
                <li key={item.anchor}>
                  <a
                    href={`#${item.anchor}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.anchor);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
