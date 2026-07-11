import { describe, expect, it } from 'vitest';
import {
    applyEnforcedOnFields,
    applyForcedOffFields,
    applyVisibleTogglesAsValues,
    buildTenantAdminControlsPayload,
    getEnforcedOnFields,
    getForcedOffFields,
    isSubToggleDisabled,
    syncMasterTogglesToTenantAdminControls,
} from './permissionsSettingsUtils';

describe('permissions settings utils', () => {
    it('resolves all feature fields forced off by hidden platform toggles', () => {
        const forcedOffFields = getForcedOffFields({ anonymousChat: false } as any);

        expect(forcedOffFields.has('featureAnonymousChatEnabled')).toBe(true);
        expect(forcedOffFields.has('featureVideoCallsAnonymousChatsEnabled')).toBe(true);
    });

    it('resolves all feature fields enforced-on by upper-level enforcement flags', () => {
        const enforcedOnFields = getEnforcedOnFields({ videoCalls: true } as never);

        expect(enforcedOnFields.has('featureVideoCallsEnabled')).toBe(true);
        expect(enforcedOnFields.has('featureVideoCallsAnonymousChatsEnabled')).toBe(true);
        // Only enforced keys count; an unset key must not leak fields.
        expect(enforcedOnFields.has('featureAudioCallsEnabled')).toBe(false);
    });

    it('ignores enforcement flags that are not truthy', () => {
        expect(getEnforcedOnFields({ videoCalls: false } as never).size).toBe(0);
        expect(getEnforcedOnFields(undefined).size).toBe(0);
    });

    it('applies enforced-on fields as true without mutating the original settings object', () => {
        const original = { featureVideoCallsEnabled: false };
        const result = applyEnforcedOnFields(original, new Set(['featureVideoCallsEnabled']));

        expect(result).toEqual({ featureVideoCallsEnabled: true });
        expect(original).toEqual({ featureVideoCallsEnabled: false });
    });

    it('applies forced-off fields without mutating the original settings object', () => {
        const original = { featureAnonymousChatEnabled: true };
        const result = applyForcedOffFields(original, new Set(['featureAnonymousChatEnabled']));

        expect(result).toEqual({ featureAnonymousChatEnabled: false });
        expect(original).toEqual({ featureAnonymousChatEnabled: true });
    });

    it('maps visible platform toggles into concrete feature values', () => {
        const settings = applyVisibleTogglesAsValues({ calls: false, groupChat: true } as any);

        expect(settings.featureCallsEnabled).toBe(false);
        expect(settings.featureGroupChatV2Enabled).toBe(true);
    });

    it('maps each feature setting to its own toggle without gating sub-features by the card master', () => {
        // Anonymous master off, but the admin explicitly left video-in-anonymous ON. The stored
        // toggle must reflect that exact choice — NOT be rewritten to false by the master (that was
        // the "toggle springt zurück" bug). The master's own key still reflects the master.
        const result = syncMasterTogglesToTenantAdminControls({
            settings: {
                featureAnonymousChatEnabled: false,
                featureCallsEnabled: true,
                featureGroupChatV2Enabled: true,
                featureSupervisionEnabled: true,
                featureVideoCallsAnonymousChatsEnabled: true,
            },
        });

        expect(result.settings?.tenantAdminControls).toMatchObject({
            allowedPermissionToggles: {
                anonymousChat: false,
                calls: true,
                videoCallsAnonymousChats: true,
            },
        });
    });

    it('round-trips platform toggles losslessly even when a card master is off (no revert)', () => {
        // Platform disallows the 1:1 modality (calls master off) but keeps audio/video 1:1 allowed.
        // decode -> encode must return exactly what went in — this is the regression guard for the
        // "toggle springt zurück" bug.
        const allowed = {
            calls: false,
            audioCallsOneOnOneChats: true,
            videoCallsOneOnOneChats: true,
            supervisionOneOnOneChats: true,
            anonymousChat: true,
            audioCallsAnonymousChats: true,
        } as never;

        const settings = applyVisibleTogglesAsValues(allowed);
        const encoded = syncMasterTogglesToTenantAdminControls({ settings }).settings?.tenantAdminControls as {
            allowedPermissionToggles: Record<string, boolean>;
        };

        expect(encoded.allowedPermissionToggles.calls).toBe(false);
        expect(encoded.allowedPermissionToggles.audioCallsOneOnOneChats).toBe(true);
        expect(encoded.allowedPermissionToggles.videoCallsOneOnOneChats).toBe(true);
        expect(encoded.allowedPermissionToggles.supervisionOneOnOneChats).toBe(true);
    });

    it('preserves existing toggles while building tenant admin controls payload', () => {
        const result = buildTenantAdminControlsPayload(
            { settings: { featureCallsEnabled: false } },
            { groupChat: true } as any,
            false,
        );

        expect(result).toMatchObject({
            permissionsPageEnabled: false,
            allowedPermissionToggles: {
                calls: false,
                groupChat: true,
            },
        });
    });

    it('disables sub toggles when their master toggle is off', () => {
        expect(
            isSubToggleDisabled(
                { key: 'group', masterField: ['settings', 'featureGroupChatV2Enabled'] } as any,
                [],
                false,
            ),
        ).toBe(true);
        expect(
            isSubToggleDisabled(
                { key: 'oneOnOne' } as any,
                ['settings', 'featureAudioCallsOneOnOneChatsEnabled'],
                false,
            ),
        ).toBe(true);
        expect(
            isSubToggleDisabled({ key: 'anonymous' } as any, ['settings', 'featureAnonymousChatEnabled'], false),
        ).toBe(false);
    });
});
