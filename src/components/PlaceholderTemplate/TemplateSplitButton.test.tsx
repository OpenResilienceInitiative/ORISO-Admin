import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSplitButton } from './TemplateSplitButton';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

const templates = [
    { id: 1, name: 'Standard-Einladung' },
    { id: 2, name: 'Kurzfassung' },
];

describe('TemplateSplitButton', () => {
    it('shows the active template name on the main segment', () => {
        render(<TemplateSplitButton activeTemplateId={2} templates={templates} onSelectTemplate={() => {}} />);
        expect(screen.getByRole('button', { name: /Kurzfassung/ })).toBeInTheDocument();
    });

    it('falls back to the pick-a-template label without an active template', () => {
        render(<TemplateSplitButton templates={templates} onSelectTemplate={() => {}} />);
        expect(screen.getByRole('button', { name: /Vorlage wählen/ })).toBeInTheDocument();
    });

    it('lists every template in the menu and selects on click', async () => {
        const user = userEvent.setup();
        const onSelectTemplate = vi.fn();
        render(
            <TemplateSplitButton
                activeTemplateId={1}
                templates={templates}
                onSelectTemplate={onSelectTemplate}
                onCreateFromTemplate={() => {}}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Kurzfassung$/ }));
        expect(onSelectTemplate).toHaveBeenCalledWith(2);
    });

    it('marks the active template in the menu', async () => {
        const user = userEvent.setup();
        render(
            <TemplateSplitButton
                activeTemplateId={1}
                templates={templates}
                onSelectTemplate={() => {}}
                onCreateFromTemplate={() => {}}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        const active = await screen.findByRole('menuitem', { name: /^Standard-Einladung$/ });
        expect(within(active).getByTestId('active-template-mark')).toBeInTheDocument();
    });

    it('offers "create new from template" entries when the callback is wired', async () => {
        const user = userEvent.setup();
        const onCreateFromTemplate = vi.fn();
        render(
            <TemplateSplitButton
                activeTemplateId={1}
                templates={templates}
                onSelectTemplate={() => {}}
                onCreateFromTemplate={onCreateFromTemplate}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Neu aus „Kurzfassung“/ }));
        expect(onCreateFromTemplate).toHaveBeenCalledWith(2);
    });

    it('hides the create-from entries without the callback', async () => {
        const user = userEvent.setup();
        render(<TemplateSplitButton activeTemplateId={1} templates={templates} onSelectTemplate={() => {}} />);
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await screen.findByRole('menuitem', { name: /^Standard-Einladung$/ });
        expect(screen.queryByRole('menuitem', { name: /Neu aus/ })).not.toBeInTheDocument();
    });
});
