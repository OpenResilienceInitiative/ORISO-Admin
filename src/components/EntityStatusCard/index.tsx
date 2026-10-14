import { useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { ToggleRow } from '../ToggleRow';
import { M3Button } from '../M3Button';
import {
    readEntityStatus,
    writeEntityStatus,
    type EntityKind,
    type EntityStatusData,
} from '../../api/entityStatus/entityStatus';
import { TypeOfUser } from '../../enums/TypeOfUser';
import styles from './styles.module.scss';
import { statusValue as state, statusLabel } from './presentation';
import { useStatusPermission } from './useStatusPermission';

const errorKey = (error: unknown, kind: EntityKind) => {
    if (kind === 'agency' && error instanceof Response && error.status === 400) {
        const reason = error.headers.get('X-Reason');
        if (reason === 'AGENCY_CONTAINS_NO_CONSULTANTS') return 'entityStatus.error.assignCounsellor';
        if (reason === 'INVALID_OFFLINE_STATUS') return 'entityStatus.error.postcodeCoverage';
    }
    if (error instanceof Response && error.status === 403) return 'entityStatus.error.forbidden';
    if (error instanceof Response && error.status === 409) return 'entityStatus.error.restricted';
    return 'entityStatus.error.save';
};
interface Props {
    entityKind: EntityKind;
    entityName?: string;
    entityId: string;
    data?: EntityStatusData;
    isLoading: boolean;
    loadError?: unknown;
    canManage: boolean;
    activationBlockedReason?: string;
    onSave: (active: boolean) => Promise<void | boolean>;
    onReload: () => void;
}
export const EntityStatusCard = ({
    entityKind,
    entityName,
    entityId,
    data,
    isLoading,
    loadError,
    canManage,
    activationBlockedReason,
    onSave,
    onReload,
}: Props) => {
    const { t, i18n } = useTranslation();
    const metadataId = useId();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<unknown>();
    const known = !loadError && typeof data?.ownActive === 'boolean' && typeof data?.active === 'boolean';
    const canEdit = known && canManage && !isLoading && !saving;
    const activationBlocked = editing && draft && data?.ownActive === false ? activationBlockedReason : undefined;
    const canSave = canEdit && !activationBlocked;
    const save = async () => {
        if (!canSave || !editing) return;
        setSaving(true);
        setSaveError(undefined);
        try {
            const saved = await onSave(draft);
            if (saved !== false) setEditing(false);
        } catch (error) {
            setSaveError(error);
        } finally {
            setSaving(false);
        }
    };
    const active = loadError ? null : data?.active;
    const account = loadError ? undefined : data?.account;
    const formatDate = (value?: string | null) => {
        if (!value || Number.isNaN(Date.parse(value))) return t('entityStatus.unknown');
        return new Date(value).toLocaleString(i18n.language);
    };
    return (
        <section
            className={styles.card}
            data-testid="entity-status-card"
            data-entity-kind={entityKind}
            aria-busy={isLoading || saving}
        >
            <Card
                titleKey="entityStatus.title"
                cardTitleClassName={styles.header}
                cardTitleChildren={
                    <output
                        className={`${styles.confirmed} m3-body-medium`}
                        aria-label={t('entityStatus.confirmed')}
                        aria-live="polite"
                        data-testid="entity-status-confirmed"
                        data-active={state(active)}
                    >
                        {t(statusLabel(active))}
                    </output>
                }
                footer={
                    editing && (
                        <div className={styles.actions} data-testid="entity-status-actions">
                            <span data-testid="entity-status-cancel">
                                <M3Button
                                    block
                                    variant="outlined"
                                    disabled={saving}
                                    onClick={() => {
                                        setEditing(false);
                                        setSaveError(undefined);
                                    }}
                                >
                                    {t('btn.cancel')}
                                </M3Button>
                            </span>
                            <span data-testid="entity-status-save">
                                <M3Button block variant="filled" disabled={!canSave} loading={saving} onClick={save}>
                                    {t('save')}
                                </M3Button>
                            </span>
                        </div>
                    )
                }
            >
                <div className={`${styles.body} m3-body-medium`}>
                    <div className={styles.context}>
                        <p data-testid="entity-status-context">
                            <span className={styles.contextLabel}>{t(`entityStatus.kind.${entityKind}`)}</span>
                            <span>{entityName || entityId}</span>
                        </p>
                        {!editing && canEdit && (
                            <span data-testid="entity-status-edit">
                                <M3Button
                                    onClick={() => {
                                        setDraft(data?.ownActive === true);
                                        setSaveError(undefined);
                                        setEditing(true);
                                    }}
                                >
                                    {t('edit')}
                                </M3Button>
                            </span>
                        )}
                    </div>
                    {isLoading && (
                        <p role="status" data-testid="entity-status-pending">
                            {t('entityStatus.loading')}
                        </p>
                    )}
                    {saving && (
                        <p role="status" data-testid="entity-status-pending">
                            {t('entityStatus.saving')}
                        </p>
                    )}
                    {(loadError || saveError) && (
                        <div className={styles.error} role="alert" data-testid="entity-status-error">
                            <p>{t(loadError ? 'entityStatus.error.load' : errorKey(saveError, entityKind))}</p>
                            {loadError && (
                                <M3Button variant="outlined" onClick={onReload} disabled={isLoading}>
                                    {t('entityStatus.reload')}
                                </M3Button>
                            )}
                        </div>
                    )}
                    {activationBlocked && (
                        <p role="status" data-testid="entity-status-activation-blocked">
                            {t(activationBlocked)}
                        </p>
                    )}
                    {data?.ownActive !== active && !loadError && typeof data?.ownActive === 'boolean' && (
                        <p>
                            {t('entityStatus.own')}:{' '}
                            <output data-testid="entity-status-own-active" data-active={state(data?.ownActive)}>
                                {t(statusLabel(data?.ownActive))}
                            </output>
                        </p>
                    )}
                    <div className={styles.switch} data-testid="entity-status-switch">
                        {known ? (
                            <ToggleRow
                                label={t('entityStatus.control')}
                                description={t(`entityStatus.scope.${entityKind}`)}
                                checked={editing ? draft : data?.ownActive === true}
                                switchDisabled={!editing || !canEdit}
                                onCheckedChange={setDraft}
                            />
                        ) : (
                            !loadError && <p>{t('entityStatus.unknownNotice')}</p>
                        )}
                    </div>
                    {!canManage && <p>{t('entityStatus.readOnly')}</p>}
                    {data?.restrictions.length > 0 && (
                        <ul>
                            {data.restrictions.map((reason) => (
                                <li key={reason}>
                                    {t(`entityStatus.restrictions.${reason}`, {
                                        defaultValue: t('entityStatus.restrictionUnknown'),
                                    })}
                                </li>
                            ))}
                        </ul>
                    )}
                    {entityKind === 'account' && (
                        <div data-testid="account-security-info" className={styles.accountInfo}>
                            <div role="group" aria-labelledby={`${metadataId}-account`} className={styles.group}>
                                <h6 id={`${metadataId}-account`} className="m3-title-small">
                                    {t('entityStatus.accountDetails')}
                                </h6>
                                <dl className={styles.metadata}>
                                    <dt>{t('entityStatus.username')}</dt>
                                    <dd>{account?.username ?? t('entityStatus.unknown')}</dd>
                                    <dt>{t('entityStatus.created')}</dt>
                                    <dd>{formatDate(account?.createDate)}</dd>
                                    <dt>{t('entityStatus.updated')}</dt>
                                    <dd>{formatDate(account?.updateDate)}</dd>
                                </dl>
                            </div>
                            <div role="group" aria-labelledby={`${metadataId}-two-factor`} className={styles.group}>
                                <h6 id={`${metadataId}-two-factor`} className="m3-title-small">
                                    {t('entityStatus.twoFactor.title')}
                                </h6>
                                <dl className={styles.metadata}>
                                    {(['required', 'configured', 'active'] as const).map((field) => (
                                        <div className={styles.metadataRow} key={field}>
                                            <dt>{t(`entityStatus.twoFactor.short.${field}`)}</dt>
                                            <dd>
                                                <output
                                                    className={`${styles.valueBadge} m3-body-small`}
                                                    data-testid={`2fa-${field}`}
                                                    data-state={state(account?.twoFactor[field])}
                                                >
                                                    {t(`entityStatus.boolean.${state(account?.twoFactor[field])}`)}
                                                </output>
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </section>
    );
};
interface ManagedProps {
    entityKind: EntityKind;
    entityName?: string;
    entityId: string;
    canManage: boolean;
    activationBlockedReason?: string;
    targetTenantId?: number | string;
    onBeforeChange?: (active: boolean, currentActive: boolean) => Promise<boolean>;
}
export const ManagedEntityStatus = ({
    entityKind,
    entityId,
    entityName,
    canManage,
    activationBlockedReason,
    targetTenantId,
    onBeforeChange,
}: ManagedProps) => {
    const scopeAllowed = useStatusPermission(entityKind, entityId, targetTenantId);
    const client = useQueryClient();
    const key = ['entity-status', entityKind, entityId];
    const query = useQuery({
        queryKey: key,
        queryFn: () => readEntityStatus(entityKind, entityId),
        retry: false,
        refetchOnWindowFocus: false,
        enabled: Boolean(entityId) && entityId !== 'add',
    });
    const save = async (active: boolean) => {
        if (onBeforeChange && !(await onBeforeChange(active, query.data?.ownActive === true))) return false;
        try {
            const confirmed = await writeEntityStatus(entityKind, entityId, active);
            client.setQueryData(key, confirmed);
            const roots = new Set([
                'TENANT',
                'TENANTS',
                'AGENCY',
                'AGENCIES',
                'TENANT_ADMIN',
                ...Object.values(TypeOfUser).map((value) => value.toUpperCase()),
            ]);
            await client.invalidateQueries({ predicate: (cached) => roots.has(String(cached.queryKey[0])) });
            return true;
        } catch (error) {
            // A timed-out write may have committed. Read again before displaying a saved status.
            await query.refetch();
            throw error;
        }
    };
    return (
        <EntityStatusCard
            key={`${entityKind}:${entityId}`}
            entityKind={entityKind}
            entityId={entityId}
            entityName={entityName}
            data={query.data}
            isLoading={query.isLoading}
            loadError={query.error}
            canManage={canManage && scopeAllowed}
            activationBlockedReason={activationBlockedReason}
            onSave={save}
            onReload={() => query.refetch()}
        />
    );
};
