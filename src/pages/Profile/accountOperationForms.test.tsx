import { ReactNode, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivateData } from './PrivateData';
import { PasswordChange } from './PassswordChange';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const t = (key: string) => key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));
vi.mock('../../hooks/useUserData.hook', () => ({
    USER_DATA_KEY: 'user-data',
    useUserData: () => ({
        data: { firstName: 'Ada', lastName: 'Tester', email: 'old@example.test' },
        isLoading: false,
    }),
}));
vi.mock('../../api/fetchData', async () => {
    const original = await vi.importActual<typeof import('../../api/fetchData')>('../../api/fetchData');
    return { ...original, fetchData: (...args: unknown[]) => mocks.fetch(...args) };
});

const clients: QueryClient[] = [];
const wrapper = ({ children }: { children: ReactNode }) => {
    const [client] = useState(() => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        clients.push(queryClient);
        return queryClient;
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
afterEach(() => {
    cleanup();
    clients.splice(0).forEach((client) => client.clear());
    mocks.fetch.mockReset();
});
const idAt = (index: number) => mocks.fetch.mock.calls[index][0].headersData['Idempotency-Key'];

describe('real profile forms and their account mutations', () => {
    it('retains the exact unknown profile retry and renews identity after an email edit away and back', async () => {
        mocks.fetch.mockRejectedValue(new TypeError('reply lost'));
        const user = userEvent.setup({ delay: null });
        render(<PrivateData />, { wrapper });
        await user.click(screen.getByRole('button', { name: 'edit' }));
        const email = screen.getByPlaceholderText('placeholder.email');
        fireEvent.change(email, { target: { value: 'new@example.test' } });
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(email).toBeEnabled());
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(email).toBeEnabled());
        expect(idAt(1)).toBe(idAt(0));
        expect(mocks.fetch.mock.calls[1][0].bodyData).toBe(mocks.fetch.mock.calls[0][0].bodyData);
        fireEvent.change(email, { target: { value: 'temporary@example.test' } });
        fireEvent.change(email, { target: { value: 'new@example.test' } });
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
        expect(idAt(2)).not.toBe(idAt(0));
    });

    it('reopens the real password form after an unknown response and preserves the exact retry', async () => {
        mocks.fetch.mockRejectedValue(new TypeError('reply lost'));
        const user = userEvent.setup({ delay: null });
        render(<PasswordChange />, { wrapper });
        await user.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(screen.getByPlaceholderText('profile.passwordChange.form.currentPassword'), {
            target: { value: 'Original-test-pass-927!' },
        });
        fireEvent.change(screen.getByPlaceholderText('profile.passwordChange.form.newPassword'), {
            target: { value: 'Changed-test-pass-928!' },
        });
        fireEvent.change(screen.getByPlaceholderText('profile.passwordChange.form.passwordConfirmation'), {
            target: { value: 'Changed-test-pass-928!' },
        });
        await user.click(screen.getByRole('button', { name: 'profile.passwordChange.save' }));
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(screen.getByPlaceholderText('profile.passwordChange.form.currentPassword')).toBeEnabled(),
        );
        await user.click(screen.getByRole('button', { name: 'profile.passwordChange.save' }));
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
        expect(idAt(1)).toBe(idAt(0));
        expect(mocks.fetch.mock.calls[1][0].bodyData).toBe(mocks.fetch.mock.calls[0][0].bodyData);
    });
});
