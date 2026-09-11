import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSplitButton } from './TemplateSplitButton';
import splitButtonStyles from '../GlobalSearch/splitButton.module.scss';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

const templates = [
    { id: 1, name: 'Standard-Einladung' },
    { id: 2, name: 'Kurzfassung' },
];

/**
 * The styled root carries the size/variant classes. Resolve it by its own class rather
 * than by `parentElement`: a harmless wrapper change would otherwise break a size
 * assertion before the size behaviour actually changed. Same lookup as InviteComposer.test.
 */
const pillOf = (name: RegExp) =>
    screen.getByRole('button', { name }).closest(`.${splitButtonStyles.splitButton}`) as HTMLElement;

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

    /*
     * PR #727 post-merge review: without `onMainClick` the main segment is an
     * inert button — it must leave the keyboard tab order instead of focusing
     * a control that does nothing.
     */
    it('disables the inert main segment in picker-only mode', () => {
        render(<TemplateSplitButton activeTemplateId={1} templates={templates} onSelectTemplate={() => {}} />);
        expect(screen.getByRole('button', { name: /Standard-Einladung/ })).toBeDisabled();
    });

    it('keeps the main segment interactive when a main action is wired', async () => {
        const user = userEvent.setup();
        const onMainClick = vi.fn();
        render(
            <TemplateSplitButton
                activeTemplateId={1}
                templates={templates}
                onMainClick={onMainClick}
                onSelectTemplate={() => {}}
            />,
        );
        const main = screen.getByRole('button', { name: /Standard-Einladung/ });
        expect(main).toBeEnabled();
        await user.click(main);
        expect(onMainClick).toHaveBeenCalledTimes(1);
    });

    /*
     * ORISO-Admin#741, owner feedback on PR #727: "Das ist nur ein Elevated
     * state, der hier falsch ist." The picker rests as a plain outlined pill —
     * elevation (and the elevated colourway) is reserved for the open state /
     * the explicit elevated variant.
     */
    it('rests outlined, never in the elevated colourway (#741)', () => {
        render(<TemplateSplitButton activeTemplateId={1} templates={templates} onSelectTemplate={() => {}} />);
        const rootClasses = screen.getByRole('button', { name: /Standard-Einladung/ }).parentElement?.classList;
        expect(rootClasses?.contains(splitButtonStyles.outlined)).toBe(true);
        expect(rootClasses?.contains(splitButtonStyles.elevated)).toBe(false);
    });

    /*
     * The 40px pill is the legal editors' geometry (their neighbouring pickers are
     * 36px); rows built from default-size buttons ask for `medium` instead. Both
     * halves are pinned: a chooser that silently grew would tower over the legal
     * editors again, and one that ignored `size` would stay a size short of the
     * invite composer's send button.
     */
    it('rests on the small (40px) pill by default', () => {
        render(<TemplateSplitButton activeTemplateId={1} templates={templates} onSelectTemplate={() => {}} />);
        expect(pillOf(/Standard-Einladung/)).toHaveClass(splitButtonStyles.small);
        expect(pillOf(/Standard-Einladung/)).not.toHaveClass(splitButtonStyles.medium);
    });

    it('takes the medium (56px) pill when the surrounding row asks for it', () => {
        render(
            <TemplateSplitButton
                activeTemplateId={1}
                size="medium"
                templates={templates}
                onSelectTemplate={() => {}}
            />,
        );
        expect(pillOf(/Standard-Einladung/)).toHaveClass(splitButtonStyles.medium);
        expect(pillOf(/Standard-Einladung/)).not.toHaveClass(splitButtonStyles.small);
    });
});
