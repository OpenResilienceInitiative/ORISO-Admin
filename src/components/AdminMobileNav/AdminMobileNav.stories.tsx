import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminMobileNav } from './AdminMobileNav';
import { ADMIN_ACCOUNT_ITEMS, ADMIN_SECTIONS, capabilitiesFor } from './adminSections.fixture';

/** Stand-ins for the real filter controls of a page (Figma 1683:41718). */
const FilterChips = () => (
    <>
        {['Rolle', 'Zeitraum'].map((label) => (
            <span
                key={label}
                style={{
                    display: 'inline-flex',
                    height: 56,
                    alignItems: 'center',
                    padding: '0 24px',
                    border: '1px solid var(--m3-outline-variant, #c4c7c8)',
                    borderRadius: '28px 4px 4px 28px',
                    color: 'var(--m3-on-surface-variant, #444748)',
                    fontSize: 16,
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </span>
        ))}
    </>
);

const firstSubsection = (key: string) => ADMIN_SECTIONS.find((s) => s.key === key)?.subsections?.[0]?.key;

/**
 * A phone-sized page with the bar pinned to its bottom edge — the same
 * relationship the layout wrapper will create in the app.
 */
const PhoneFrame = ({ withBack = false, startSection = 'settings' }: { withBack?: boolean; startSection?: string }) => {
    const [sectionKey, setSectionKey] = useState(startSection);
    const [subsectionKey, setSubsectionKey] = useState<string | undefined>(firstSubsection(startSection));
    const caps = capabilitiesFor(sectionKey, subsectionKey);

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
            {/* No page header on mobile: the bar already says which section and
                subsection you are in (Frank, 2026-08-07). What stays is content. */}
            <div style={{ padding: '24px 24px 80px', color: '#444748', fontSize: 14 }}>
                <p style={{ margin: 0 }}>
                    Zweite Zeile hier: {caps.search ? 'Suche' : 'keine Suche'} · {caps.add ? 'Anlegen' : 'kein Anlegen'}{' '}
                    · {caps.filters ? 'Filterreihe' : 'keine Filter'}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 12 }}>Belegt durch {caps.source}</p>
                {caps.note && <p style={{ margin: '8px 0 0', fontSize: 12 }}>{caps.note}</p>}
            </div>
            <div style={{ position: 'absolute', right: 0, bottom: 0, left: 0 }}>
                <AdminMobileNav
                    sections={ADMIN_SECTIONS}
                    accountItems={ADMIN_ACCOUNT_ITEMS}
                    activeSectionKey={sectionKey}
                    activeSubsectionKey={subsectionKey}
                    onSectionSelect={(key) => {
                        setSectionKey(key);
                        setSubsectionKey(firstSubsection(key));
                    }}
                    onSubsectionSelect={setSubsectionKey}
                    onBack={withBack ? () => undefined : undefined}
                    backLabel="Zurück"
                    onSearch={caps.search ? () => undefined : undefined}
                    searchLabel="Suchen"
                    searchPlaceholder="Suchen…"
                    onAdd={caps.add ? () => undefined : undefined}
                    addLabel="Neu anlegen"
                    filters={caps.filters ? <FilterChips /> : undefined}
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
 * Click through it: open the menu, switch to **Nutzende** — its icon moves into
 * the FAB and the chip row reloads with the four user groups. The search row
 * above never moves, whatever section you are in.
 */
export const Interactive: Story = {
    render: () => <PhoneFrame />,
};

/** A section without subsections: the chip row is empty, nothing else shifts. */
export const SectionWithoutSubsections: Story = {
    render: () => <PhoneFrame startSection="statistics" />,
};

/** Same bar on a page you can leave — back button, icon only (A2). */
export const WithBackButton: Story = {
    render: () => <PhoneFrame withBack />,
};
