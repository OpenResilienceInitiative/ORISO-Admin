import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChatRecoverySettings, updateChatRecoverySettings } from '../api/tenant/chatRecoverySettings';
import { CHAT_RECOVERY_SETTINGS_QUERY_KEY, useChatRecoverySettings } from './useChatRecoverySettings.hook';

const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('antd', async () => ({ ...(await vi.importActual('antd')), message: notices }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/tenant/chatRecoverySettings', () => ({
    getChatRecoverySettings: vi.fn(),
    updateChatRecoverySettings: vi.fn(),
}));

describe('useChatRecoverySettings', () => {
    const confirmed = { asker: 'LOGIN_PASSWORD' as const, consultant: 'RECOVERY_KEY' as const, revision: 2 };
    let client: QueryClient;
    const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        vi.mocked(getChatRecoverySettings).mockResolvedValue(confirmed);
    });

    it('caches only the server-confirmed response after save', async () => {
        const saved = { asker: 'RECOVERY_KEY' as const, consultant: 'RECOVERY_KEY' as const, revision: 3 };
        vi.mocked(updateChatRecoverySettings).mockResolvedValue(saved);
        const { result } = renderHook(() => useChatRecoverySettings(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual(confirmed));

        act(() => result.current.save({ ...confirmed, asker: 'RECOVERY_KEY' }));
        await waitFor(() => expect(client.getQueryData(CHAT_RECOVERY_SETTINGS_QUERY_KEY)).toEqual(saved));
        expect(notices.success).toHaveBeenCalledOnce();
    });

    it.each(['CONFLICT', 'BAD_REQUEST', 'FORBIDDEN', 'network'])(
        '%s failure keeps confirmed cache and shows no success',
        async (reason) => {
            vi.mocked(updateChatRecoverySettings).mockRejectedValue(new Error(reason));
            const { result } = renderHook(() => useChatRecoverySettings(), { wrapper });
            await waitFor(() => expect(result.current.data).toEqual(confirmed));

            act(() => result.current.save({ ...confirmed, asker: 'RECOVERY_KEY' }));
            await waitFor(() => expect(notices.error).toHaveBeenCalledOnce());
            expect(client.getQueryData(CHAT_RECOVERY_SETTINGS_QUERY_KEY)).toEqual(confirmed);
            expect(notices.success).not.toHaveBeenCalled();
        },
    );
});
