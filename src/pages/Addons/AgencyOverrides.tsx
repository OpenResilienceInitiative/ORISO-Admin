import { Button, Empty, Popconfirm, Switch, Table } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../components/Snackbar';
import type { AdminAddon, AgencyOverride } from '../../addons/addonTypes';
import { AgencySelect, type SelectOption } from './RemoteSearchSelect';
import { useAgencyNames, useClearAgencyOverride, useSetAgencyOverride } from './useAddons';
import styles from './addons.module.scss';

interface AgencyOverridesProps {
    addon: AdminAddon;
    tenantId: number;
}

export const AgencyOverrides = ({ addon, tenantId }: AgencyOverridesProps) => {
    const { t } = useTranslation();
    const { name } = addon.manifest;
    const overrides = useMemo(
        () => (addon.agencyOverrides ?? []).filter((override) => override.agencyId != null),
        [addon.agencyOverrides],
    );
    const agencyNames = useAgencyNames(overrides.map((override) => override.agencyId));
    const setOverride = useSetAgencyOverride(name, tenantId);
    const clearOverride = useClearAgencyOverride(name, tenantId);
    const [newAgency, setNewAgency] = useState<SelectOption | null>(null);
    const [newEnabled, setNewEnabled] = useState(!addon.enabled);
    const pickerId = `addon-${name}-agency`;
    const newSwitchId = `addon-${name}-agency-enabled`;

    const agencyLabel = (agencyId: number) =>
        agencyNames[agencyId]
            ? `${agencyNames[agencyId]} (${agencyId})`
            : t('addons.agencies.unnamed', { id: agencyId });

    const saved = () => snackbar.success(String(t('addons.agencies.saved')));

    const addOverride = () => {
        if (!newAgency) {
            return;
        }
        setOverride.mutate(
            { agencyId: newAgency.id, enabled: newEnabled },
            {
                onSuccess: () => {
                    setNewAgency(null);
                    saved();
                },
            },
        );
    };

    return (
        <div className={styles.overrides}>
            <p className={styles.hint}>
                {t(addon.enabled ? 'addons.agencies.hintEnabled' : 'addons.agencies.hintDisabled')}
            </p>
            {overrides.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('addons.agencies.empty')} />
            ) : (
                <Table<AgencyOverride>
                    size="small"
                    rowKey="agencyId"
                    pagination={false}
                    dataSource={overrides}
                    columns={[
                        {
                            key: 'agency',
                            title: t('addons.agencies.agency'),
                            render: (_, override) => agencyLabel(override.agencyId),
                        },
                        {
                            key: 'enabled',
                            title: t('addons.agencies.enabled'),
                            render: (_, override) => (
                                <Switch
                                    checked={override.enabled}
                                    aria-label={String(
                                        t('addons.agencies.switchFor', { agency: agencyLabel(override.agencyId) }),
                                    )}
                                    onChange={(enabled) =>
                                        setOverride.mutate(
                                            { agencyId: override.agencyId, enabled },
                                            { onSuccess: saved },
                                        )
                                    }
                                />
                            ),
                        },
                        {
                            key: 'actions',
                            title: t('addons.agencies.actions'),
                            render: (_, override) => (
                                <Popconfirm
                                    title={t('addons.agencies.removeConfirm')}
                                    okText={t('addons.agencies.remove')}
                                    cancelText={t('btn.cancel')}
                                    onConfirm={() =>
                                        clearOverride.mutate(override.agencyId, {
                                            onSuccess: () => snackbar.success(String(t('addons.agencies.removed'))),
                                        })
                                    }
                                >
                                    <Button type="link">{t('addons.agencies.remove')}</Button>
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            )}
            <div className={styles.addOverride}>
                <label htmlFor={pickerId} className={styles.label}>
                    {t('addons.agencies.add')}
                </label>
                <AgencySelect
                    id={pickerId}
                    tenantId={tenantId}
                    className={styles.select}
                    ariaLabel={String(t('addons.agencies.agency'))}
                    placeholder={String(t('addons.agencies.placeholder'))}
                    value={newAgency?.id ?? null}
                    selectedOption={newAgency}
                    allowClear
                    excludeIds={overrides.map((override) => override.agencyId)}
                    onChange={setNewAgency}
                />
                <span className={styles.switchRow}>
                    <Switch id={newSwitchId} checked={newEnabled} onChange={setNewEnabled} />
                    <label htmlFor={newSwitchId}>{t('addons.agencies.enabled')}</label>
                </span>
                <Button type="primary" disabled={!newAgency} loading={setOverride.isPending} onClick={addOverride}>
                    {t('addons.agencies.addButton')}
                </Button>
            </div>
        </div>
    );
};

export default AgencyOverrides;
