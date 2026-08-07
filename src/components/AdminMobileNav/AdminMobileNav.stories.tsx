import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminMobileNav } from './AdminMobileNav';
import { ADMIN_ACCOUNT_ITEMS, ADMIN_SECTIONS } from './adminSections.fixture';

const firstSubsection = (key: string) => ADMIN_SECTIONS.find((s) => s.key === key)?.subsections?.[0]?.key;

/**
 * A phone-sized page with the bar pinned to its bottom edge — the same
 * relationship the layout wrapper will create in the app.
 */
const PhoneFrame = ({ withBack = false, startSection = 'settings' }: { withBack?: boolean; startSection?: string }) => {
    const [sectionKey, setSectionKey] = useState(startSection);
    const [subsectionKey, setSubsectionKey] = useState<string | undefined>(firstSubsection(startSection));
    const section = ADMIN_SECTIONS.find((s) => s.key === sectionKey);
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
            <div style={{ padding: '24px 24px 80px' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{section?.label}</p>
                <p style={{ margin: '4px 0 0', color: '#444748' }}>
                    {subsection ? subsection.label : 'Bereich ohne Unterbereiche'}
                </p>
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
