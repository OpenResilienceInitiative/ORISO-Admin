import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateTenantAdminControls } from './updateTenantAdminControls';

describe('platform permission policy HTTP response', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('returns the confirmed policy modes and server-added sibling values after a PUT', async () => {
        const confirmed = {
            permissionsPageEnabled: true,
            permissionPolicies: {
                featureVideoCallsOneOnOneChatsEnabled: { value: false, mode: 'ENFORCED' as const },
                featureVoiceMessagesOneOnOneChatsEnabled: { value: true, mode: 'SUGGESTED' as const },
            },
            internalGroupChat: { recipientScope: { value: 'AGENCY' as const, mode: 'SUGGESTED' as const } },
        };
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json(confirmed)),
        );

        const saved = await updateTenantAdminControls({
            permissionPolicies: {
                featureVideoCallsOneOnOneChatsEnabled: { value: false, mode: 'ENFORCED' },
            },
        });

        expect(saved).toEqual(confirmed);
    });
});
