import type { PolicyValue } from '../../../../types/permissionPolicy';
import { CHAT_TYPE_CARDS } from './chatTypeCards';

/**
 * ORISO-Admin#1577 (Frank, 2026-11-19): two older switches still gate the counselling app, but no
 * longer have a control of their own. The admin keeps them in step with the conversation-type tiles
 * whenever a tile setting they depend on is saved.
 *
 * - `extendedSettings.isVideoCallAllowed` (per Träger, synced into its consulting type): the app shows
 *   call buttons only while it is true AND the tile's own call switch is on (ORISO-Frontend
 *   `SessionMenu.tsx`, `call/callFeatureGates.ts`). Supervision chats are not gated by it.
 * - `featureGroupChatV2Enabled`: the app lets counsellors create group chats only while it is true
 *   (ORISO-Frontend `createChatHelpers.ts`), ignoring the two group tile masters, which TenantService
 *   already prefers once they are stored.
 */

export const GROUP_CHAT_UMBRELLA = 'featureGroupChatV2Enabled';
export const GROUP_CHAT_MASTERS = ['featureSelfHelpGroupsEnabled', 'featureInternalGroupChatEnabled'] as const;

const CALL_LABELS = new Set(['tenants.permissions.feature.videoCalls', 'tenants.permissions.feature.audioCalls']);

/** Per tile: the master and the call switches that only work while it is on. */
export const CALL_TILES = CHAT_TYPE_CARDS.flatMap((card) => {
    const calls = card.toggles.filter((toggle) => CALL_LABELS.has(toggle.labelKey)).map(({ field }) => field[1]);
    return calls.length && card.masterField ? [{ master: card.masterField[1], calls }] : [];
});

const CALL_FIELDS = new Set(CALL_TILES.flatMap(({ master, calls }) => [master, ...calls]));

export const affectsCalls = (field: string) => CALL_FIELDS.has(field);

export const isGroupChatMaster = (field: string) => (GROUP_CHAT_MASTERS as readonly string[]).includes(field);

/** True while at least one conversation type offers an audio or video call. */
export const callsAllowed = (valueOf: (field: string) => boolean) =>
    CALL_TILES.some(({ master, calls }) => valueOf(master) && calls.some((field) => valueOf(field)));

/**
 * The umbrella follows the two group tiles: on while either is on. It is a requirement only where the
 * tiles leave no choice below: on and required by an "on" requirement, or off with both masters off
 * as a requirement. Otherwise it stays adjustable, so the level below can follow its own tiles.
 */
export const groupChatUmbrellaPolicy = (policyOf: (field: string) => PolicyValue<boolean>): PolicyValue<boolean> => {
    const masters = GROUP_CHAT_MASTERS.map(policyOf);
    const value = masters.some((policy) => policy.value);
    const forced = value
        ? masters.some((policy) => policy.value && policy.mode === 'ENFORCED')
        : masters.every((policy) => policy.mode === 'ENFORCED');
    return { value, mode: forced ? 'ENFORCED' : 'SUGGESTED', inherited: false };
};
