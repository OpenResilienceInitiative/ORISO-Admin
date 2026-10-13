import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import de from '../../locales/de/translation.json';
import en from '../../locales/en/translation.json';
import { EntityStatusCard } from '.';

const state = vi.hoisted(() => ({ language: 'de' }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const strings: Record<string, string> = state.language === 'de' ? de : en;
            return strings[key] ?? key;
        },
        i18n: { language: state.language },
    }),
}));

describe('activation refusal in the actual status card', () => {
    beforeEach(() => {
        state.language = 'de';
    });
    const attempt = async (reason: string) => {
        const save = vi.fn().mockRejectedValue(
            new Response('private untrusted server text', {
                status: 400,
                headers: { 'X-Reason': reason },
            }),
        );
        render(
            <EntityStatusCard
                entityKind="agency"
                entityId="883"
                canManage
                isLoading={false}
                data={{ active: false, ownActive: false, restrictions: [] }}
                onSave={save}
                onReload={vi.fn()}
            />,
        );
        fireEvent.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(within(screen.getByTestId('entity-status-save')).getByRole('button'));
        const error = await screen.findByRole('alert');
        expect(save).toHaveBeenCalledWith(true);
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        expect(error).not.toHaveTextContent('private untrusted server text');
        return error;
    };
    it.each([
        [
            'de',
            'AGENCY_CONTAINS_NO_CONSULTANTS',
            'Ordne der Beratungsstelle zuerst mindestens eine beratende Person zu.',
        ],
        ['en', 'AGENCY_CONTAINS_NO_CONSULTANTS', 'Assign at least one counsellor to this counselling centre first.'],
        ['de', 'INVALID_OFFLINE_STATUS', 'Hinterlege zuerst den Einzugsbereich der Beratungsstelle.'],
        ['en', 'INVALID_OFFLINE_STATUS', 'Set the counselling centre’s postcode coverage first.'],
    ])('gives a safe actionable %s cause for %s', async (language, reason, instruction) => {
        state.language = language;
        expect(await attempt(reason)).toHaveTextContent(instruction);
    });
    it('keeps unknown server reasons generic and the confirmed state inactive', async () => {
        expect(await attempt('PRIVATE_UNKNOWN_REASON')).toHaveTextContent(de['entityStatus.error.save']);
    });
});
