import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminMobileNav, type AdminMobileNavSection } from './AdminMobileNav';

const sections: AdminMobileNavSection[] = [
    {
        key: 'settings',
        label: 'Einstellungen',
        subsections: [
            { key: 'globalConfig', label: 'Globale Konfigurationen' },
            { key: 'legal', label: 'Rechtliches' },
        ],
    },
    { key: 'tenants', label: 'Träger' },
];

const Harness = () => {
    const [sectionKey, setSectionKey] = useState('settings');
    const [subsectionKey, setSubsectionKey] = useState<string | undefined>('globalConfig');

    return (
        <MemoryRouter>
            <AdminMobileNav
                sections={sections}
                activeSectionKey={sectionKey}
                activeSubsectionKey={subsectionKey}
                onSectionSelect={(key) => {
                    setSectionKey(key);
                    setSubsectionKey(sections.find((s) => s.key === key)?.subsections?.[0]?.key);
                }}
                onSubsectionSelect={setSubsectionKey}
                onSearch={() => undefined}
                searchLabel="Suchen"
                onAdd={() => undefined}
                addLabel="Neu anlegen"
                openLabel="Menü öffnen"
                closeLabel="Menü schließen"
            />
        </MemoryRouter>
    );
};

describe('AdminMobileNav', () => {
    it('shows the subsections of the section you are in', () => {
        render(<Harness />);

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
            'Globale Konfigurationen',
            'Rechtliches',
        ]);
        expect(screen.getByRole('tab', { name: 'Globale Konfigurationen' })).toHaveAttribute('aria-selected', 'true');
    });

    // The whole point of the redesign: the menu is the sidebar, so switching
    // section has to reload the row next to the FAB.
    it('swaps the row for the new section when a destination is picked', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));
        await userEvent.click(screen.getByRole('button', { name: 'Träger' }));

        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Suchen' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Neu anlegen' })).toBeInTheDocument();
    });

    it('keeps the subsections visible while the menu is open', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));

        expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    it('renders the back button only when there is somewhere to go back to', () => {
        const { rerender } = render(<Harness />);

        expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();

        rerender(
            <MemoryRouter>
                <AdminMobileNav
                    sections={sections}
                    activeSectionKey="tenants"
                    onBack={() => undefined}
                    backLabel="Zurück"
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                />
            </MemoryRouter>,
        );

        expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
    });
});
