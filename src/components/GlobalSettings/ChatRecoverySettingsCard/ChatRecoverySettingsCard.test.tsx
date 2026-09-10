import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatRecoverySettingsCard } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([(key: string) => key], { t: (key: string) => key }),
}));

const confirmed = { asker: 'LOGIN_PASSWORD' as const, consultant: 'RECOVERY_KEY' as const, revision: 4 };

describe('ChatRecoverySettingsCard', () => {
    const onSave = vi.fn();

    beforeEach(() => onSave.mockReset());

    it('shows both roles, both recovery modes, and the new-account scope', async () => {
        render(<ChatRecoverySettingsCard data={confirmed} isLoading={false} isSaving={false} onSave={onSave} />);

        expect(screen.getByLabelText(/globalSettings.chatRecovery.asker/)).toBeVisible();
        expect(screen.getByLabelText(/globalSettings.chatRecovery.consultant/)).toBeVisible();
        expect(screen.getAllByText('globalSettings.chatRecovery.newUsersHelp')).toHaveLength(2);

        await userEvent.click(screen.getByRole('button', { name: 'edit' }));
        await userEvent.click(screen.getAllByRole('combobox')[0]);
        expect(screen.getByText('globalSettings.chatRecovery.mode.loginPassword')).toBeVisible();
        expect(screen.getByText('globalSettings.chatRecovery.mode.recoveryKey')).toBeVisible();
    });

    it('keeps changes local until save and sends only both modes plus the confirmed revision', async () => {
        render(<ChatRecoverySettingsCard data={confirmed} isLoading={false} isSaving={false} onSave={onSave} />);
        await userEvent.click(screen.getByRole('button', { name: 'edit' }));

        const asker = screen.getAllByRole('combobox')[0];
        await userEvent.click(asker);
        await userEvent.click(screen.getByText('globalSettings.chatRecovery.mode.recoveryKey'));
        expect(onSave).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith(
                { asker: 'RECOVERY_KEY', consultant: 'RECOVERY_KEY', revision: 4 },
                expect.objectContaining({ onError: expect.any(Function) }),
            ),
        );
    });

    it('does not offer editing while the initial value is loading', () => {
        render(<ChatRecoverySettingsCard isLoading data={undefined} isSaving={false} onSave={onSave} />);
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
    });

    it('keeps the attempted values available when a failed save reopens the form', async () => {
        let rejectSave: (() => void) | undefined;
        onSave.mockImplementation((_settings, options) => {
            rejectSave = options?.onError;
        });
        render(<ChatRecoverySettingsCard data={confirmed} isLoading={false} isSaving={false} onSave={onSave} />);
        await userEvent.click(screen.getByRole('button', { name: 'edit' }));
        const asker = screen.getAllByRole('combobox')[0];
        await userEvent.click(asker);
        await userEvent.click(screen.getByText('globalSettings.chatRecovery.mode.recoveryKey'));
        fireEvent.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => {
            expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
            expect(screen.getAllByRole('combobox')[0]).toHaveValue('globalSettings.chatRecovery.mode.recoveryKey');
        });
        act(() => rejectSave?.());

        await waitFor(() =>
            expect(screen.getAllByRole('combobox')[0]).toHaveValue('globalSettings.chatRecovery.mode.recoveryKey'),
        );
    });

    it('displays a newly confirmed server response when its revision changes', async () => {
        const { rerender } = render(
            <ChatRecoverySettingsCard data={confirmed} isLoading={false} isSaving={false} onSave={onSave} />,
        );

        rerender(
            <ChatRecoverySettingsCard
                data={{ asker: 'RECOVERY_KEY', consultant: 'LOGIN_PASSWORD', revision: 5 }}
                isLoading={false}
                isSaving={false}
                onSave={onSave}
            />,
        );

        await waitFor(() =>
            expect(screen.getAllByRole('combobox')[0]).toHaveValue('globalSettings.chatRecovery.mode.recoveryKey'),
        );
    });
});
