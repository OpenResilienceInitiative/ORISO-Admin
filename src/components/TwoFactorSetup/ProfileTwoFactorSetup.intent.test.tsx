import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfileTwoFactorSetup } from './ProfileTwoFactorSetup';

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
    userData: {
        email: 'counsellor@example.test',
        twoFactorAuth: {
            isEnabled: true,
            isActive: true,
            isToEncourage: true,
            type: 'APP',
            secret: 'test-secret',
            qrCode: '',
        },
    },
}));
const t = (key: string) => key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));
vi.mock('../../hooks/useUserData.hook', () => ({
    USER_DATA_KEY: 'user-data',
    useUserData: () => ({ data: mocks.userData }),
}));
vi.mock('../../api/fetchData', async () => {
    const original = await vi.importActual<typeof import('../../api/fetchData')>('../../api/fetchData');
    return { ...original, fetchData: (...args: unknown[]) => mocks.fetch(...args) };
});
let client: QueryClient;
afterEach(() => {
    cleanup();
    client?.clear();
    mocks.fetch.mockReset();
});

it('retains an unknown app activation retry and supersedes an older teardown after re-enrollment', async () => {
    document.body.innerHTML = '<div id="overlay"></div><div id="root"></div>';
    mocks.fetch
        .mockRejectedValueOnce(new TypeError('old delete reply lost'))
        .mockRejectedValueOnce(new TypeError('activation reply lost'))
        .mockResolvedValue(undefined);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const user = userEvent.setup({ delay: null });
    const view = render(<ProfileTwoFactorSetup />, { wrapper });
    await user.click(screen.getByRole('switch'));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const oldDeleteId = mocks.fetch.mock.calls[0][0].headersData['Idempotency-Key'];
    mocks.userData = { ...mocks.userData, twoFactorAuth: { ...mocks.userData.twoFactorAuth, isActive: false } };
    view.rerender(<ProfileTwoFactorSetup />);
    await user.click(screen.getByRole('switch'));
    await screen.findByText('twoFactorAuth.activate.step1.title');
    for (let step = 0; step < 3; step++)
        await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.next' }));
    fireEvent.change(screen.getByPlaceholderText('twoFactorAuth.activate.otp.input.label'), {
        target: { value: '123456' },
    });
    await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.save' }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: 'twoFactorAuth.overlayButton.save' }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
    expect(mocks.fetch.mock.calls[2][0].headersData).toEqual(mocks.fetch.mock.calls[1][0].headersData);
    expect(mocks.fetch.mock.calls[2][0].bodyData).toBe(mocks.fetch.mock.calls[1][0].bodyData);
    await waitFor(() => expect(screen.queryByText('twoFactorAuth.activate.app.step4.title')).not.toBeInTheDocument());
    mocks.userData = { ...mocks.userData, twoFactorAuth: { ...mocks.userData.twoFactorAuth, isActive: true } };
    view.rerender(<ProfileTwoFactorSetup />);
    await user.click(screen.getByRole('switch'));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
    expect(mocks.fetch.mock.calls[3][0].headersData['Idempotency-Key']).not.toBe(oldDeleteId);
});
