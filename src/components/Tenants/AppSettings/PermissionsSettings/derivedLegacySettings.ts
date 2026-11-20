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

/** True while the tile with this master is on and offers an audio or video call. */
export const tileOffersCalls = (master: string, valueOf: (field: string) => boolean) =>
    CALL_TILES.some((tile) => tile.master === master && valueOf(master) && tile.calls.some((field) => valueOf(field)));

/** True while at least one conversation type offers an audio or video call. */
export const callsAllowed = (valueOf: (field: string) => boolean) =>
    CALL_TILES.some(({ master }) => tileOffersCalls(master, valueOf));

/**
 * The Träger's `isVideoCallAllowed` as the Funktionszugriff page sees it. Only the Träger page writes
 * it, and only where the former "Anrufe" switch was offered; platform and Beratungsstelle pages cannot
 * (ORISO-TenantService#380 retires the value).
 */
export type CallsPermission = {
    /** Stored value; undefined while loading. */
    stored: boolean | undefined;
    pending?: boolean;
    /**
     * Make the stored value `allowed`. With `afterField`: once the queued save of that tile field went
     * through, and only then. Without: as one explicit write (aligning existing data).
     */
    follow: (allowed: boolean, afterField?: string) => void;
};

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

/**
 * The umbrella write the group tiles call for, or `null` when it already matches or is locked from
 * above. A Beratungsstelle writes its own value, never a requirement.
 */
export const groupChatUmbrellaUpdate = (
    policyOf: (field: string) => PolicyValue<boolean>,
    { level, restricted }: { level: 'platform' | 'tenant' | 'agency'; restricted: boolean },
): PolicyValue<boolean> | null => {
    const current = policyOf(GROUP_CHAT_UMBRELLA);
    if (restricted || (current.mode === 'ENFORCED' && current.inherited === true)) return null;
    const umbrella = groupChatUmbrellaPolicy(policyOf);
    const target = level === 'agency' ? { ...umbrella, mode: 'SUGGESTED' as const } : umbrella;
    return current.value === target.value && current.mode === target.mode ? null : target;
};
