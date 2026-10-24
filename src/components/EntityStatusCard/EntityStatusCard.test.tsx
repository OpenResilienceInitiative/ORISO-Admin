import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
            'Ordnen Sie der Beratungsstelle zuerst mindestens eine beratende Person zu.',
        ],
        ['en', 'AGENCY_CONTAINS_NO_CONSULTANTS', 'Assign at least one counsellor to this counselling centre first.'],
        ['de', 'INVALID_OFFLINE_STATUS', 'Hinterlegen Sie zuerst den Einzugsbereich der Beratungsstelle.'],
        ['en', 'INVALID_OFFLINE_STATUS', 'Set the counselling centre’s postcode coverage first.'],
    ])('gives a safe actionable %s cause for %s', async (language, reason, instruction) => {
        state.language = language;
        expect(await attempt(reason)).toHaveTextContent(instruction);
    });
    it('keeps unknown server reasons generic and the confirmed state inactive', async () => {
        expect(await attempt('PRIVATE_UNKNOWN_REASON')).toHaveTextContent(de['entityStatus.error.save']);
    });
});

describe('status confirmation cancellation', () => {
    it('keeps the draft editable and the confirmed state unchanged after cancellation', async () => {
        const save = vi.fn(async () => false);
        render(
            <EntityStatusCard
                entityKind="agency"
                entityId="7"
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
        await waitFor(() => expect(save).toHaveBeenCalledWith(true));
        await waitFor(() => expect(within(screen.getByTestId('entity-status-save')).getByRole('button')).toBeEnabled());
        expect(screen.getByRole('switch')).toBeChecked();
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

describe('compact status settings presentation', () => {
    beforeEach(() => {
        state.language = 'de';
    });
    const accountData = {
        active: false,
        ownActive: false,
        restrictions: [],
        account: {
            username: 'Selected account',
            createDate: null,
            updateDate: null,
            twoFactor: { required: true, configured: false, active: null },
        },
    };
    const props = {
        entityKind: 'account' as const,
        entityId: 'selected',
        entityName: 'Selected person',
        canManage: true,
        isLoading: false,
        onSave: vi.fn(async () => {}),
        onReload: vi.fn(),
    };

    it('uses one actionable load notice without duplicate unknown copy or stale security facts', () => {
        render(<EntityStatusCard {...props} data={accountData} loadError={new Error('unavailable')} />);
        const error = screen.getByRole('alert');
        expect(error).toHaveTextContent(de['entityStatus.error.load']);
        expect(within(error).getByRole('button', { name: de['entityStatus.reload'] })).toBeEnabled();
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(screen.queryByText(de['entityStatus.unknownNotice'])).not.toBeInTheDocument();
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'unknown');
        ['required', 'configured', 'active'].forEach((field) =>
            expect(screen.getByTestId(`2fa-${field}`)).toHaveAttribute('data-state', 'unknown'),
        );
        expect(screen.queryByTestId('entity-status-actions')).not.toBeInTheDocument();
    });

    it('recovers through the inline reload action and edits with just two footer actions', () => {
        const reload = vi.fn();
        const page = render(<EntityStatusCard {...props} onReload={reload} loadError={new Error('unavailable')} />);
        fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: de['entityStatus.reload'] }));
        expect(reload).toHaveBeenCalledTimes(1);
        page.rerender(<EntityStatusCard {...props} onReload={reload} data={accountData} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        fireEvent.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        const actions = screen.getByTestId('entity-status-actions');
        expect(within(actions).getAllByRole('button')).toHaveLength(2);
        expect(within(actions).getByRole('button', { name: de.save })).toBeEnabled();
        page.rerender(
            <EntityStatusCard {...props} onReload={reload} data={accountData} loadError={new Error('readback')} />,
        );
        expect(within(screen.getByTestId('entity-status-actions')).getAllByRole('button')).toHaveLength(2);
        expect(
            within(screen.getByTestId('entity-status-actions')).queryByRole('button', {
                name: de['entityStatus.reload'],
            }),
        ).not.toBeInTheDocument();
        expect(
            within(screen.getByTestId('entity-status-actions')).getByRole('button', { name: de.save }),
        ).toBeDisabled();
    });

    it('gives short 2FA labels an accessible group context while keeping all three facts separate', () => {
        render(<EntityStatusCard {...props} data={accountData} />);
        expect(
            within(screen.getByRole('group', { name: de['entityStatus.accountDetails'] })).getByText(
                'Selected account',
            ),
        ).toBeInTheDocument();
        const group = screen.getByRole('group', { name: de['entityStatus.twoFactor.title'] });
        expect(within(group).getByText(de['entityStatus.twoFactor.short.required'])).toBeInTheDocument();
        expect(within(group).getByTestId('2fa-required')).toHaveAttribute('data-state', 'true');
        expect(within(group).getByTestId('2fa-configured')).toHaveAttribute('data-state', 'false');
        expect(within(group).getByTestId('2fa-active')).toHaveAttribute('data-state', 'unknown');
    });
});
