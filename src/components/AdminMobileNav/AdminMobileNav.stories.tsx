import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavGlyph } from '../NavGlyph';
import { AdminMobileNav, type AdminMobileNavSection } from './AdminMobileNav';

/**
 * The real section tree of the admin panel: the settings subsections are the
 * ones `constants/settingsTabs.ts` produces, and the sections that have none
 * are the list pages, which offer search and create instead.
 */
const sections: AdminMobileNavSection[] = [
    {
        key: 'settings',
        label: 'Einstellungen',
        icon: <NavGlyph name="displaySettings" />,
        subsections: [
            { key: 'globalConfig', label: 'Globale Konfigurationen' },
            { key: 'masterData', label: 'Stammdaten & Mehr' },
            { key: 'view', label: 'Erscheinungsbild' },
            { key: 'legal', label: 'Rechtliches' },
            { key: 'smtp', label: 'Email Server' },
            { key: 'functionAccess', label: 'Funktionszugriff' },
        ],
    },
    { key: 'tenants', label: 'Träger', icon: <NavGlyph name="tenants" /> },
    { key: 'agencies', label: 'Beratungstellen', icon: <NavGlyph name="counseling" /> },
    { key: 'users', label: 'Nutzende', icon: <NavGlyph name="users" /> },
    { key: 'statistics', label: 'Stastiken', icon: <NavGlyph name="statistics" /> },
    {
        key: 'links',
        label: 'Links',
        icon: <NavGlyph name="links" />,
        subsections: [
            { key: 'invites', label: 'Einladungen' },
            { key: 'inbounds', label: 'Externe Inbounds' },
        ],
    },
];

const accountItems = [
    { key: 'profile', label: 'Konto', icon: <NavGlyph name="profile" /> },
    { key: 'logout', label: 'Abmelden', icon: <NavGlyph name="logout" /> },
];

const firstSubsection = (key: string) => sections.find((s) => s.key === key)?.subsections?.[0]?.key;

/**
 * A phone-sized page with the bar pinned to its bottom edge — the same
 * relationship the layout wrapper will create in the app.
 */
const PhoneFrame = ({ withBack = false }: { withBack?: boolean }) => {
    const [sectionKey, setSectionKey] = useState('settings');
    const [subsectionKey, setSubsectionKey] = useState<string | undefined>(firstSubsection('settings'));
    const section = sections.find((s) => s.key === sectionKey);
    const subsection = section?.subsections?.find((s) => s.key === subsectionKey);

    return (
        <div
            style={{
                position: 'relative',
                width: 390,
                height: 650,
                background: 'var(--schemes-background, #f3eeee)',
                overflow: 'hidden',
            }}
        >
            <div style={{ padding: '24px 24px 80px', fontFamily: 'inherit' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{section?.label}</p>
                <p style={{ margin: '4px 0 0', color: '#444748' }}>
                    {subsection ? subsection.label : 'Keine Unterbereiche — Suche und Anlegen rechts unten.'}
                </p>
            </div>
            <div style={{ position: 'absolute', right: 0, bottom: 0, left: 0 }}>
                <AdminMobileNav
                    sections={sections}
                    accountItems={accountItems}
                    activeSectionKey={sectionKey}
                    activeSubsectionKey={subsectionKey}
                    onSectionSelect={(key) => {
                        setSectionKey(key);
                        setSubsectionKey(firstSubsection(key));
                    }}
                    onSubsectionSelect={setSubsectionKey}
                    onBack={withBack ? () => undefined : undefined}
                    backLabel="Zurück"
                    onSearch={() => undefined}
                    searchLabel="Suchen"
                    onAdd={() => undefined}
                    addLabel="Neu anlegen"
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                />
            </div>
        </div>
    );
};

const meta = {
    title: 'Organisms/AdminMobileNav',
    component: AdminMobileNav,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1683-39455',
        },
    },
} satisfies Meta<typeof AdminMobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click it: open the menu, pick **Träger** — it turns brown, its icon moves
 * into the FAB, and the row next to the FAB swaps from the settings
 * subsections to search and create, because Träger has none.
 */
export const Interactive: Story = {
    render: () => <PhoneFrame />,
};

/** Same bar on a page you can leave — back button, icon only (A2). */
export const WithBackButton: Story = {
    render: () => <PhoneFrame withBack />,
};
