import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteTemplateQuickPicker } from './InviteTemplateQuickPicker';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';

const locale = vi.hoisted(() => ({ language: 'de-DE' }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_: string, fallback: string) => fallback, i18n: locale }),
}));

const templates: InviteEmailTemplateDTO[] = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    name: `Vorlage ${index + 1}`,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject: 'Einladung',
    body: 'Hallo {{firstName}}',
    active: true,
    createDate: '',
    updateDate: null,
    systemDefault: index === 0,
}));
const openMenu = async () => userEvent.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));

describe('InviteTemplateQuickPicker', () => {
    beforeEach(() => {
        locale.language = 'de-DE';
    });
    it('has only two creation actions and no catalogue fallback before any explicit choice', async () => {
        const onManage = vi.fn();
        const onCreateFrom = vi.fn();
        render(<InviteTemplateQuickPicker templates={{ list: templates, recentIds: [], onManage, onCreateFrom }} />);
        await openMenu();
        expect(await screen.findAllByRole('menuitem')).toHaveLength(2);
        expect(screen.queryByRole('menuitem', { name: /^Vorlage / })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('menuitem', { name: 'Standardvorlage' }));
        expect(onCreateFrom).toHaveBeenCalledWith(1);
        await userEvent.click(screen.getByRole('button', { name: 'Vorlage wählen' }));
        expect(onManage).toHaveBeenCalledWith('list');
    });

    it('shows latest four visible ids in choice order, excluding removed ids', async () => {
        const onSelect = vi.fn();
        render(
            <InviteTemplateQuickPicker
                templates={{
                    list: templates,
                    recentIds: [99, 6, 5, 4, 3, 2],
                    selectedId: 1,
                    onManage: vi.fn(),
                    onSelect,
                }}
            />,
        );
        expect(screen.getByRole('button', { name: 'Vorlage 1' })).toBeInTheDocument();
        await openMenu();
        const choices = await screen.findAllByRole('menuitem', { name: /^Vorlage / });
        expect(choices.map((choice) => choice.textContent)).toEqual([
            'Vorlage 6',
            'Vorlage 5',
            'Vorlage 4',
            'Vorlage 3',
        ]);
        await userEvent.click(choices[1]);
        expect(onSelect).toHaveBeenCalledWith(5);
    });

    it.each([
        { language: 'de@informal', includeEnglish: true, expected: 1 },
        { language: 'fr-FR', includeEnglish: true, expected: 10 },
        { language: 'fr-FR', includeEnglish: false, expected: 1 },
    ])(
        'uses a same-kind system default for $language with English/German fallback',
        async ({ language, includeEnglish, expected }) => {
            locale.language = language;
            const onCreateFrom = vi.fn();
            // A custom French template and another invite kind must never become the fallback.
            const list: InviteEmailTemplateDTO[] = [
                { ...templates[1], language: 'fr' },
                { ...templates[0], id: 9, kind: 'COUNSELLOR_INVITE', language: 'fr' },
                ...templates,
                ...(includeEnglish ? [{ ...templates[0], id: 10, language: 'en' }] : []),
            ];
            render(<InviteTemplateQuickPicker templates={{ list, selectedId: 2, onManage: vi.fn(), onCreateFrom }} />);
            await openMenu();
            await userEvent.click(await screen.findByRole('menuitem', { name: 'Standardvorlage' }));
            expect(onCreateFrom).toHaveBeenCalledWith(expected);
        },
    );

    it('creates blank and never copies a custom template as the standard', async () => {
        const onManage = vi.fn();
        const onCreateFrom = vi.fn();
        render(
            <InviteTemplateQuickPicker
                templates={{ list: templates.slice(1), recentIds: [], onManage, onCreateFrom }}
            />,
        );
        await openMenu();
        expect(await screen.findByRole('menuitem', { name: 'Standardvorlage' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        await userEvent.click(screen.getByRole('menuitem', { name: 'Neue Vorlage' }));
        expect(onManage).toHaveBeenCalledWith('create');
        expect(onCreateFrom).not.toHaveBeenCalled();
    });
});
