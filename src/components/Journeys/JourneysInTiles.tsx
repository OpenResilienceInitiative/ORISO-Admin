import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import type { ConversationType } from '../ConversationModules/conversationModule';
import type { ChatTypeCardKey } from '../Tenants/AppSettings/PermissionsSettings/types';
import { runtimeConfig } from '../../config/runtimeConfig';
import { useTenantTopics } from '../../hooks/useTenantTopics';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { UserRole } from '../../enums/UserRole';
import { httpJourneyStore } from '../../api/journeys/journeys';
import type { Journey, JourneyTopic } from './journey';
import type { JourneyStore } from './journeyStore';
import { adminTranslator } from './journeyTranslation';
import { JourneysDialog } from './JourneysDialog';
import { GreetingTextsContext } from './GreetingTexts';
import { GreetingTextsForScope } from './GreetingTextsForScope';
import { JourneyTileEntry } from './index';
import { useJourneyWorkspace, type JourneyBase, type JourneyScope, type JourneyWorkspace } from './useJourneyWorkspace';
import styles from './styles.module.scss';

/** The conversation type of each tile in Funktionszugriff. */
export const TYPE_OF_TILE: Record<ChatTypeCardKey, ConversationType> = {
    oneOnOne: 'AGENCY_COUNSELLING',
    liveChat: 'LIVE_CHAT',
    group: 'SELF_HELP',
    groupInternal: 'INTERNAL_GROUP',
};

export interface JourneysInTiles {
    /** For `PermissionsSettingsView`; undefined while journeys are switched off or out of reach. */
    renderJourneys?: (cardKey: ChatTypeCardKey) => ReactNode;
    /** The open dialog, if any; render it beside the view. */
    dialog: ReactNode;
}

/** Why saving failed, said to the editor, with the one way on. */
const SaveFailure = ({ workspace, onReload }: { workspace: JourneyWorkspace; onReload: () => void }) => {
    const { t } = useTranslation();
    if (!workspace.failure) return null;
    return (
        <div className={styles.warning} role="alert" data-testid="journeys-save-failure">
            <p className={styles.noticeTitle}>{t(`journeys.saveFailure.${workspace.failure}.title`)}</p>
            <p>{t(`journeys.saveFailure.${workspace.failure}.text`)}</p>
            {workspace.failure === 'conflict' && (
                <div className={styles.failureActions}>
                    <M3Button variant="tonal" onClick={onReload}>
                        {t('journeys.saveFailure.conflict.reload')}
                    </M3Button>
                </div>
            )}
        </div>
    );
};

/** Tile content while the journeys cannot be shown: loading, failed, or nothing to layer on yet. */
const TileState = ({ text, alert }: { text: string; alert?: boolean }) => (
    <p className={styles.help} role={alert ? 'alert' : undefined} data-testid="journeys-tile-state">
        {text}
    </p>
);

/**
 * The journeys on the conversation type tiles of Funktionszugriff (ORISO-Admin#1571): loaded from
 * and saved to UserService, per level. Off unless `JOURNEYS_ENABLED` is "true". Below the platform
 * a level edits only its own phases, and only once the platform has stored its journeys.
 */
const useMountedJourneys = (scope: JourneyScope, store: JourneyStore): JourneysInTiles => {
    const { t } = useTranslation();
    const { hasRole, isSuperAdmin } = useUserRoles();
    // A centre builds on its Träger's layer: without the Träger known there is nothing safe to show.
    const on =
        scope.level === 'platform' ||
        (scope.level === 'tenant' ? Boolean(scope.tenantId) : Boolean(scope.agencyId && scope.tenantId));
    const topicQuery = useTenantTopics(false, on, { failClosed: true });
    const topics = useMemo<JourneyTopic[] | undefined>(
        () =>
            topicQuery.data
                ?.filter((topic): topic is typeof topic & { id: number } => typeof topic.id === 'number')
                .map((topic) => ({ id: topic.id, name: topic.name })),
        [topicQuery.data],
    );
    const workspace = useJourneyWorkspace(store, scope, topics, on);
    // The dialog edits what was there when it opened, and saves against exactly those versions.
    const [opened, setOpened] = useState<{ type: ConversationType; base: JourneyBase; journeys: Journey[] }>();
    const setOpen = (type?: ConversationType) =>
        setOpened(type && { type, base: workspace.base, journeys: workspace.journeys });
    // The translation endpoint answers Träger and platform admins only.
    const translator = isSuperAdmin || hasRole(UserRole.TenantAdmin) ? adminTranslator : undefined;

    if (!on) return { renderJourneys: undefined, dialog: null };

    const loadFailed = workspace.status === 'error' || topicQuery.isError;
    const renderJourneys = (cardKey: ChatTypeCardKey) => {
        if (workspace.status === 'forbidden') return <TileState text={t('journeys.tile.noAccess')} />;
        if (loadFailed) return <TileState text={t('journeys.tile.notLoaded')} alert />;
        if (workspace.status === 'loading') return <TileState text={t('journeys.tile.loading')} />;
        const type = TYPE_OF_TILE[cardKey];
        return (
            <>
                {workspace.platformMissing && <TileState text={t('journeys.tile.platformFirst')} />}
                <JourneyTileEntry
                    type={type}
                    journeys={workspace.journeys}
                    topics={topics ?? []}
                    onOpen={workspace.platformMissing ? undefined : () => setOpen(type)}
                />
            </>
        );
    };

    const close = () => {
        workspace.dismissFailure();
        setOpen(undefined);
    };
    const pruned = opened ? workspace.prunedTopicsOf(opened.type) : 0;
    const dialog = opened && (
        <GreetingTextsContext.Provider value={<GreetingTextsForScope scope={scope} />}>
            <JourneysDialog
                key={opened.type}
                type={opened.type}
                journeys={opened.journeys}
                topics={topics ?? []}
                translator={translator}
                level={scope.level}
                saving={workspace.saving}
                saveBlocked={workspace.failure === 'conflict'}
                notice={
                    <>
                        {pruned > 0 && (
                            <div className={styles.notice} role="status" data-testid="journeys-pruned-topics">
                                <p>{t('journeys.prunedTopics', { count: pruned })}</p>
                            </div>
                        )}
                        <SaveFailure
                            workspace={workspace}
                            onReload={() => {
                                workspace.reload();
                                setOpen(undefined);
                            }}
                        />
                    </>
                }
                onSave={async (next) => {
                    if ((await workspace.save(next, opened.base)).ok) setOpen(undefined);
                }}
                onClose={close}
            />
        </GreetingTextsContext.Provider>
    );
    return { renderJourneys, dialog };
};

const OFF: JourneysInTiles = { renderJourneys: undefined, dialog: null };

/**
 * The journeys on the conversation type tiles of Funktionszugriff (ORISO-Admin#1571). Off unless
 * `JOURNEYS_ENABLED` is "true"; then nothing of them loads, so pages work as before.
 */
export const useJourneysInTiles = (
    scope: JourneyScope,
    {
        store = httpJourneyStore,
        enabled = runtimeConfig.journeysEnabled,
    }: { store?: JourneyStore; enabled?: boolean } = {},
): JourneysInTiles =>
    // The switch comes from the runtime config and never changes while a page lives, so the hooks
    // inside run on every render or on none.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    enabled ? useMountedJourneys(scope, store) : OFF;
