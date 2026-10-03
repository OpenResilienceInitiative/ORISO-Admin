import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Languages } from './index';

const mutate = vi.fn();
let isSuperAdmin = false;

vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: { settings: { activeLanguages: ['de', 'en', 'fr'] } },
        isLoading: false,
        mutate,
    }),
}));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin }),
}));

/**
 * #910: removing a language is the dangerous direction — it hides the
 * interface from advice seekers currently using it and orphans translated
 * legal texts/topics. A removal must warn and gate the save on confirmation,
 * unlike an addition, which still only warns after the fact. The warning's
 * wording also depends on the caller's role: a platform admin is deciding
 * for a Träger they do not own, a Träger admin for their own organisation.
 */
describe('Languages (#910)', () => {
    beforeEach(() => {
        mutate.mockClear();
        isSuperAdmin = false;
    });

    const startEditingAndRemoveEnglish = async () => {
        const user = userEvent.setup();
        render(<Languages tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('checkbox', { name: 'language.en' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        return user;
    };

    it('warns before saving a removal, and does not save until confirmed', async () => {
        await startEditingAndRemoveEnglish();

        expect(
            await screen.findByText('organisations.languageRemovalModalContent'),
        ).toBeInTheDocument();
        expect(mutate).not.toHaveBeenCalled();
    });

    it('saves the removal once the warning is confirmed', async () => {
        const user = await startEditingAndRemoveEnglish();

        await user.click(
            screen.getByRole('button', { name: 'organisations.languageRemovalModalConfirm' }),
        );

        await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
        expect(mutate.mock.calls[0][0].settings.activeLanguages).toEqual(['de', 'fr']);
    });

    it('reopens the card unsaved when the removal is cancelled', async () => {
        const user = await startEditingAndRemoveEnglish();

        await user.click(
            screen.getByRole('button', { name: 'organisations.languageRemovalModalCancel' }),
        );

        expect(mutate).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(screen.getByRole('checkbox', { name: 'language.en' })).toBeEnabled(),
        );
    });

    it('shows the Träger wording for a Träger admin', async () => {
        await startEditingAndRemoveEnglish();

        expect(
            await screen.findByText('organisations.languageRemovalModalContent'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText('organisations.languageRemovalModalContentPlatformAdmin'),
        ).not.toBeInTheDocument();
    });

    it('shows the platform-admin wording, naming the downstream Träger, for a platform admin', async () => {
        isSuperAdmin = true;
        await startEditingAndRemoveEnglish();

        expect(
            await screen.findByText('organisations.languageRemovalModalContentPlatformAdmin'),
        ).toBeInTheDocument();
    });

    it('still only warns after saving when a language is added, not removed', async () => {
        const user = userEvent.setup();
        render(<Languages tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('checkbox', { name: 'language.ru' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
        expect(mutate.mock.calls[0][0].settings.activeLanguages).toEqual(
            expect.arrayContaining(['de', 'en', 'fr', 'ru']),
        );
        expect(mutate.mock.calls[0][0].settings.activeLanguages).toHaveLength(4);

        const onSuccess = mutate.mock.calls[0][1].onSuccess;
        onSuccess();

        expect(
            await screen.findByText('organisations.languageModalContent'),
        ).toBeInTheDocument();
    });
});
