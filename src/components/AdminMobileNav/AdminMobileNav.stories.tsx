import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminMobileNav, type AdminMobileNavLabels, type AdminMobileNavSection } from './AdminMobileNav';
import { ADMIN_ACCOUNT_ITEMS, ADMIN_SECTIONS, capabilitiesFor } from './adminSections.fixture';
import type { NavSearchEntry } from './navSearch';

const LABELS: AdminMobileNavLabels = {
    navigation: 'Navigation',
    more: 'Mehr',
    globalSearch: 'Überall suchen',
    globalSearchPlaceholder: 'Wohin möchten Sie?',
    globalSearchHint: 'Suchen Sie nach Bereichen und Einstellungen – auf Deutsch oder Englisch.',
    globalSearchEmpty: 'Nichts gefunden. Versuchen Sie ein anderes Wort.',
    close: 'Schließen',
    back: 'Zurück',
};

/** Story-only English words, so the search can be tried in both languages. */
const ENGLISH: Record<string, string[]> = {
    settings: ['settings'],
    smtp: ['mail server', 'email'],
    legal: ['privacy', 'imprint', 'datenschutz'],
    view: ['appearance', 'colour', 'farbe'],
    consultants: ['counsellors', 'berater'],
    'case-handover': ['handover'],
    statistics: ['statistics', 'reports'],
};

/** The fixture with routes, so the rows can navigate inside Storybook's router. */
const SECTIONS: AdminMobileNavSection[] = ADMIN_SECTIONS.map((section) => ({
    ...section,
    to: `/${section.key}${section.subsections?.length ? `/${section.subsections[0].key}` : ''}`,
    subsections: section.subsections?.map((subsection) => ({
        ...subsection,
        to: `/${section.key}/${subsection.key}`,
    })),
}));

const SEARCH_ENTRIES: NavSearchEntry[] = SECTIONS.flatMap((section) => [
    { id: section.key, label: section.label, to: section.to ?? '/', terms: ENGLISH[section.key] ?? [] },
    ...(section.subsections ?? []).map((subsection) => ({
        id: `${section.key}:${subsection.key}`,
        label: subsection.label,
        to: subsection.to ?? '/',
        sectionLabel: section.label,
        terms: ENGLISH[subsection.key] ?? [],
    })),
]);

/**
 * A phone-sized page with the bar pinned to its bottom edge — the same
 * relationship the layout wrapper creates in the app. The active section and
 * subsection come from Storybook's router, exactly like in the app.
 */
const PhoneFrame = ({ withBack = false }: { withBack?: boolean }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [, sectionKey = 'settings', subsectionKey] = pathname.split('/');
    const caps = capabilitiesFor(sectionKey, subsectionKey);
    const activeSubsection = useMemo(() => (subsectionKey ? pathname : undefined), [pathname, subsectionKey]);

    return (
        <div
            style={{
                position: 'relative',
                width: 390,
                height: 760,
                background: 'var(--schemes-background, #f3eeee)',
                overflow: 'hidden',
                transform: 'translateZ(0)',
            }}
        >
            <div style={{ padding: 24, color: '#444748', fontSize: 14 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{pathname}</p>
                <p style={{ margin: '8px 0 0' }}>
                    Tippen Sie auf <b>Mehr</b> für das Menü oder auf die Lupe für die globale Suche (z. B. „Emial“,
                    „privacy“, „Berater“).
                </p>
            </div>
            <div style={{ position: 'absolute', right: 6, bottom: 6, left: 6 }}>
                <AdminMobileNav
                    sections={SECTIONS}
                    accountItems={ADMIN_ACCOUNT_ITEMS}
                    activeSectionKey={sectionKey}
                    activeSubsectionKey={activeSubsection}
                    searchEntries={SEARCH_ENTRIES}
                    onSectionSelect={() => navigate('/settings/globalConfig')}
                    onBack={withBack ? () => navigate(-1) : undefined}
                    onSearch={caps.search ? () => undefined : undefined}
                    searchLabel="Liste durchsuchen"
                    searchPlaceholder="Suchen…"
                    onAdd={caps.add ? () => undefined : undefined}
                    addLabel="Neu anlegen"
                    labels={LABELS}
                />
            </div>
        </div>
    );
};

const meta = {
    title: 'Organisms/AdminMobileNav',
    component: AdminMobileNav,
    parameters: { layout: 'fullscreen' },
    // Required by StoryObj when the component has mandatory props; the stories
    // below render through PhoneFrame and ignore these defaults.
    args: { sections: SECTIONS, activeSectionKey: 'settings', labels: LABELS },
} satisfies Meta<typeof AdminMobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Slack-style navigation (ORISO-Admin#1319): three tabs, **Mehr** and a round
 * search button. **Mehr** opens a card whose sections expand into their
 * subsections; the last expanded one is remembered.
 */
export const Interactive: Story = {
    render: () => <PhoneFrame />,
};

/** Same bar on a page you can leave — the back button sits in the page row. */
export const WithBackButton: Story = {
    render: () => <PhoneFrame withBack />,
};
