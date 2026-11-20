import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import i18n from '../../i18n';
import { AdminSearchView } from '../AdminSearch/AdminSearchView';
import { buildFixtureIndex } from '../AdminSearch/searchFixtures';
import { AdminMobileNav, type AdminMobileNavLabels, type AdminMobileNavSection } from './AdminMobileNav';
import { ADMIN_ACCOUNT_ITEMS, ADMIN_SECTIONS, capabilitiesFor } from './adminSections.fixture';

const LABELS: AdminMobileNavLabels = {
    navigation: 'Navigation',
    more: 'Mehr',
    globalSearch: 'Überall suchen',
    close: 'Schließen',
    back: 'Zurück',
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

/**
 * A phone-sized page with the bar pinned to its bottom edge — the same
 * relationship the layout wrapper creates in the app. The active section and
 * subsection come from Storybook's router, exactly like in the app.
 */
const PhoneFrame = ({ withBack = false }: { withBack?: boolean }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [, firstSegment, subsectionKey] = pathname.split('/');
    const sectionKey = firstSegment || 'home';
    const caps = capabilitiesFor(sectionKey, subsectionKey);
    const activeSubsection = useMemo(() => (subsectionKey ? pathname : undefined), [pathname, subsectionKey]);
    // The bar's labels are German, so the search view that grows out of the button is too.
    useEffect(() => {
        i18n.changeLanguage('de').catch(() => undefined);
    }, []);
    // The round button hands its position to the real search view, which grows out of it.
    const [search, setSearch] = useState<{ x: number; y: number } | null>(null);
    const searchIndex = useMemo(() => buildFixtureIndex({ role: 'platform', language: 'de', singleDomain: false }), []);

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
                    Tippen Sie auf <b>Mehr</b> für das Menü oder auf die Lupe: Die Suche wächst als Kreis aus dem Knopf
                    (z. B. „Emial“, „privacy“, „Berater“).
                </p>
            </div>
            <div style={{ position: 'absolute', right: 6, bottom: 6, left: 6 }}>
                <AdminMobileNav
                    sections={SECTIONS}
                    accountItems={ADMIN_ACCOUNT_ITEMS}
                    activeSectionKey={sectionKey}
                    activeSubsectionKey={activeSubsection}
                    onOpenGlobalSearch={(trigger) => {
                        const rect = trigger.getBoundingClientRect();

                        setSearch({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                    }}
                    tabKeys={['home', 'settings', 'links']}
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
            {search && (
                <AdminSearchView
                    index={searchIndex}
                    origin={search}
                    onOpen={fn()}
                    onClose={() => setSearch(null)}
                    recent={['Impressum', 'smtp']}
                />
            )}
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
 * subsections; the last expanded one is remembered. The search button opens the
 * app-wide search (`AdminSearch`), which grows out of it — the bar has no
 * search of its own.
 */
export const Interactive: Story = {
    render: () => <PhoneFrame />,
};

/** Same bar on a page you can leave — the back button sits in the page row. */
export const WithBackButton: Story = {
    render: () => <PhoneFrame withBack />,
};
