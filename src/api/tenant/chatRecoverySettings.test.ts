import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantAdminEndpoint } from '../../appConfig';
import { fetchData } from '../fetchData';
import { getChatRecoverySettings, updateChatRecoverySettings } from './chatRecoverySettings';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

describe('chat recovery settings API', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('reads the dedicated platform recovery controls', async () => {
        vi.mocked(fetchData).mockResolvedValue({ asker: 'LOGIN_PASSWORD', consultant: 'LOGIN_PASSWORD', revision: 3 });

        await getChatRecoverySettings();

        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/controls/chat-recovery`,
                method: 'GET',
                skipAuth: false,
            }),
        );
    });

    it('writes exactly the two role modes and confirmed revision', async () => {
        const settings = { asker: 'RECOVERY_KEY' as const, consultant: 'LOGIN_PASSWORD' as const, revision: 7 };
        vi.mocked(fetchData).mockResolvedValue({ ...settings, revision: 8 });

        await updateChatRecoverySettings(settings);

        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/controls/chat-recovery`,
                method: 'PUT',
                bodyData: JSON.stringify(settings),
                responseHandling: expect.arrayContaining(['BAD_REQUEST', 'CONFLICT', 'FORBIDDEN']),
            }),
        );
    });
});
