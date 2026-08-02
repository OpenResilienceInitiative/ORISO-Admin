import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import catalog from './iconCatalog.generated.json';
import './iconCatalog.styles.css';

type CatalogEntry = (typeof catalog)[number];
type FilterValue = 'all' | CatalogEntry['kind'] | CatalogEntry['state'] | CatalogEntry['usage'];

const iconUrls = import.meta.glob('../../resources/img/svg/**/*.{svg,png,jpg,jpeg,webp}', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

const assetUrls = new Map(
    Object.entries(iconUrls).map(([globPath, url]) => [`src/${globPath.slice('../../'.length)}`, url]),
);

const figmaReferences = [
    {
        label: '24px icon baseline (431 Figma symbols)',
        href: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=55594-2485&m=dev',
    },
    {
        label: 'Sidebar icons, including 200 / 400 / filled (32 symbols)',
        href: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=61102-6480&m=dev',
    },
    {
        label: 'Default topic icons (shared frontend reference)',
        href: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=61093-22600&m=dev',
    },
];

const aiPrompt = `Use only an asset from the ORISO Admin Storybook icon catalog.

Selection rules:
1. Use the exact catalog ID or sourcePath named in the task; do not substitute a similar MUI icon, emoji, Unicode glyph, or hand-written SVG.
2. For ordinary UI, prefer the 400 variant as the default outline state. Use filled for selected/active. Use 200 only when the linked Figma component or an existing ORISO interaction explicitly calls for the lighter outline.
3. Admin sidebar assets currently use inactive / hover / active filenames. Preserve that three-state behavior and map active to the selected/filled role; do not rename files merely to mimic the frontend convention.
4. Topic icons and client/consultant avatars are shared frontend asset families. Do not create local Admin copies unless the Admin runtime genuinely renders them.
5. Before changing code, confirm the exact sourcePath and inspect the listed usageFiles.
6. After implementation, verify the component in Admin Storybook and, when it affects a real flow, in the running Admin app as a separate evidence step.

Return the chosen catalog ID, sourcePath, state mapping, and verification performed.`;

const kindLabels: Record<CatalogEntry['kind'], string> = {
    'ui-icon': 'UI icon',
    'sidebar-icon': 'Sidebar',
    'statistics-icon': 'Statistics',
    'preview-icon': 'Theme preview',
    'permission-icon': 'Permission',
};

const copyText = async (text: string) => navigator.clipboard.writeText(text);

function IconCatalog() {
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<FilterValue>('all');
    const [state, setState] = useState<FilterValue>('all');
    const [usage, setUsage] = useState<FilterValue>('all');
    const [copied, setCopied] = useState<string | null>(null);

    const visibleEntries = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return catalog.filter((entry) => {
            const matchesQuery =
                !normalizedQuery ||
                [entry.id, entry.family, entry.fileName, entry.sourcePath]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            return (
                matchesQuery &&
                (kind === 'all' || entry.kind === kind) &&
                (state === 'all' || entry.state === state) &&
                (usage === 'all' || entry.usage === usage)
            );
        });
    }, [kind, query, state, usage]);

    const appUsedCount = catalog.filter((entry) => entry.usage === 'app-used').length;

    const handleCopy = async (key: string, value: string) => {
        await copyText(value);
        setCopied(key);
        window.setTimeout(() => setCopied(null), 1600);
    };

    return (
        <main className="adminIconCatalog">
            <header className="adminIconCatalog__header">
                <div>
                    <p className="adminIconCatalog__eyebrow">ORISO Admin · generated from the repository</p>
                    <h1>Admin icon catalog</h1>
                    <p>
                        <strong>400</strong> is the normal outline baseline and <strong>filled</strong> is
                        selected/active. Existing Admin navigation maps inactive / hover / active to its own three-state
                        API.
                    </p>
                </div>
                <button
                    type="button"
                    className="adminIconCatalog__primaryAction"
                    onClick={() => handleCopy('ai-prompt', aiPrompt)}
                >
                    {copied === 'ai-prompt' ? 'Prompt copied' : 'Copy AI selection prompt'}
                </button>
            </header>

            <section className="adminIconCatalog__summary" aria-label="Catalog summary">
                <div>
                    <strong>{catalog.length}</strong>
                    <span>repository assets</span>
                </div>
                <div>
                    <strong>{appUsedCount}</strong>
                    <span>referenced by app source</span>
                </div>
                <div>
                    <strong>{catalog.length - appUsedCount}</strong>
                    <span>catalogued only</span>
                </div>
                <div>
                    <strong>{visibleEntries.length}</strong>
                    <span>currently shown</span>
                </div>
            </section>

            <details className="adminIconCatalog__references">
                <summary>Shared ORISO Figma references</summary>
                <ul>
                    {figmaReferences.map((reference) => (
                        <li key={reference.href}>
                            <a href={reference.href} target="_blank" rel="noreferrer">
                                {reference.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </details>

            <section className="adminIconCatalog__filters" aria-label="Filter icon catalog">
                <label htmlFor="admin-icon-search">
                    Search
                    <input
                        id="admin-icon-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ID, filename or path"
                    />
                </label>
                <label htmlFor="admin-icon-kind">
                    Family
                    <select
                        id="admin-icon-kind"
                        value={kind}
                        onChange={(event) => setKind(event.target.value as FilterValue)}
                    >
                        <option value="all">All</option>
                        {Object.entries(kindLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label htmlFor="admin-icon-state">
                    State
                    <select
                        id="admin-icon-state"
                        value={state}
                        onChange={(event) => setState(event.target.value as FilterValue)}
                    >
                        <option value="all">All</option>
                        {['base', '200', '400', 'filled', 'outline', 'hover'].map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label htmlFor="admin-icon-usage">
                    Usage
                    <select
                        id="admin-icon-usage"
                        value={usage}
                        onChange={(event) => setUsage(event.target.value as FilterValue)}
                    >
                        <option value="all">All</option>
                        <option value="app-used">App-used</option>
                        <option value="catalogued-only">Catalogued only</option>
                    </select>
                </label>
            </section>

            <section className="adminIconCatalog__grid" aria-live="polite">
                {visibleEntries.map((entry) => {
                    const selectionPrompt = `Use ORISO Admin icon ${entry.id} from ${entry.sourcePath}. Treat it as ${entry.role}. Do not substitute or redraw it.`;
                    return (
                        <article className="adminIconCatalog__card" key={entry.sourcePath}>
                            <div className="adminIconCatalog__preview">
                                <img src={assetUrls.get(entry.sourcePath)} alt="" />
                            </div>
                            <div className="adminIconCatalog__badges">
                                <span>{kindLabels[entry.kind]}</span>
                                <span>{entry.state}</span>
                                <span>{entry.usage}</span>
                            </div>
                            <h2>{entry.id}</h2>
                            <code>{entry.sourcePath}</code>
                            <p>
                                {entry.usageFiles.length} app reference{entry.usageFiles.length === 1 ? '' : 's'}
                            </p>
                            <button type="button" onClick={() => handleCopy(entry.sourcePath, selectionPrompt)}>
                                {copied === entry.sourcePath ? 'Copied' : 'Copy selection'}
                            </button>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}

const meta = {
    title: 'Design System/Icons',
    component: IconCatalog,
    parameters: {
        layout: 'fullscreen',
        design: { type: 'figma', url: figmaReferences[0].href },
        docs: {
            description: {
                component:
                    'Searchable, machine-readable catalog generated from ORISO Admin assets. App-used excludes tests and Storybook-only references.',
            },
        },
    },
} satisfies Meta<typeof IconCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = {};
