import { describe, expect, it } from 'vite-plus/test';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import {
    CALL_TILES,
    affectsCalls,
    callsAllowed,
    groupChatUmbrellaPolicy,
    groupChatUmbrellaUpdate,
    isGroupChatMaster,
    tileOffersCalls,
} from './derivedLegacySettings';

const on = (fields: string[]) => (field: string) => fields.includes(field);
const policy = (value: boolean, mode: 'SUGGESTED' | 'ENFORCED' = 'SUGGESTED'): PolicyValue<boolean> => ({
    value,
    mode,
});

describe('derived legacy settings (ORISO-Admin#1577)', () => {
    it('knows the call switches of every tile that offers calls, and nothing else', () => {
        expect(CALL_TILES.map(({ master }) => master)).toEqual([
            'featureCallsEnabled',
            'featureAnonymousChatEnabled',
            'featureSelfHelpGroupsEnabled',
        ]);
        expect(affectsCalls('featureVideoCallsOneOnOneChatsEnabled')).toBe(true);
        expect(affectsCalls('featureAnonymousChatEnabled')).toBe(true);
        // Supervision chats are not gated by isVideoCallAllowed (ORISO-UserService ConsultingTypeCallGate).
        expect(affectsCalls('featureVideoCallsSupervisionChatsEnabled')).toBe(false);
        expect(affectsCalls('featureThreadsOneOnOneEnabled')).toBe(false);
    });

    it('allows calls while one tile is on with one call switch on', () => {
        expect(callsAllowed(on(['featureCallsEnabled', 'featureAudioCallsOneOnOneChatsEnabled']))).toBe(true);
        expect(callsAllowed(on(['featureSelfHelpGroupsEnabled', 'featureVideoCallsGroupChatsEnabled']))).toBe(true);
    });

    it('allows no calls when every call switch is off, or its tile is off', () => {
        expect(callsAllowed(on(['featureCallsEnabled', 'featureAnonymousChatEnabled']))).toBe(false);
        expect(
            callsAllowed(on(['featureVideoCallsOneOnOneChatsEnabled', 'featureAudioCallsAnonymousChatsEnabled'])),
        ).toBe(false);
    });

    it('turns the group-chat umbrella on while either group tile is on', () => {
        expect(isGroupChatMaster('featureSelfHelpGroupsEnabled')).toBe(true);
        expect(isGroupChatMaster('featureGroupChatV2Enabled')).toBe(false);
        const of = (circle: PolicyValue<boolean>, internal: PolicyValue<boolean>) => (field: string) =>
            field === 'featureSelfHelpGroupsEnabled' ? circle : internal;

        expect(groupChatUmbrellaPolicy(of(policy(true), policy(false)))).toEqual({
            value: true,
            mode: 'SUGGESTED',
            inherited: false,
        });
        expect(groupChatUmbrellaPolicy(of(policy(false), policy(false)))).toMatchObject({ value: false });
    });

    it('makes the umbrella a requirement only where the group tiles leave no choice below', () => {
        const of = (circle: PolicyValue<boolean>, internal: PolicyValue<boolean>) => (field: string) =>
            field === 'featureSelfHelpGroupsEnabled' ? circle : internal;

        expect(groupChatUmbrellaPolicy(of(policy(true, 'ENFORCED'), policy(false))).mode).toBe('ENFORCED');
        expect(groupChatUmbrellaPolicy(of(policy(false, 'ENFORCED'), policy(false, 'ENFORCED'))).mode).toBe('ENFORCED');
        // One "off" requirement leaves the other tile adjustable below, so the umbrella stays adjustable.
        expect(groupChatUmbrellaPolicy(of(policy(false, 'ENFORCED'), policy(false))).mode).toBe('SUGGESTED');
    });

    it('says which tile offers calls', () => {
        const values = on([
            'featureCallsEnabled',
            'featureVideoCallsOneOnOneChatsEnabled',
            'featureAnonymousChatEnabled',
        ]);
        expect(tileOffersCalls('featureCallsEnabled', values)).toBe(true);
        expect(tileOffersCalls('featureAnonymousChatEnabled', values)).toBe(false);
    });

    it('asks for an umbrella write only where it differs and is not locked from above', () => {
        const policies: Record<string, PolicyValue<boolean>> = {
            featureSelfHelpGroupsEnabled: policy(true),
            featureInternalGroupChatEnabled: policy(false),
            featureGroupChatV2Enabled: policy(false),
        };
        const policyOf = (field: string) => policies[field];
        expect(groupChatUmbrellaUpdate(policyOf, { level: 'tenant', restricted: false })).toEqual({
            value: true,
            mode: 'SUGGESTED',
            inherited: false,
        });
        expect(groupChatUmbrellaUpdate(policyOf, { level: 'tenant', restricted: true })).toBeNull();
        policies.featureGroupChatV2Enabled = { value: false, mode: 'ENFORCED', inherited: true };
        expect(groupChatUmbrellaUpdate(policyOf, { level: 'tenant', restricted: false })).toBeNull();
        policies.featureGroupChatV2Enabled = policy(true);
        expect(groupChatUmbrellaUpdate(policyOf, { level: 'tenant', restricted: false })).toBeNull();
        policies.featureSelfHelpGroupsEnabled = policy(true, 'ENFORCED');
        expect(groupChatUmbrellaUpdate(policyOf, { level: 'agency', restricted: false })).toBeNull();
    });
});
