import { Alert, Button, Input, Radio, Switch, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { AddonTenantState } from '../../addons/addonTypes';
import { setAddonEnabledForTenant } from '../../api/addons/addonsApi';
import {
    ADDON_REGISTRY_KEY,
    ADDON_TENANTS_KEY,
    ADMIN_ADDONS_KEY,
    useAddonTenants,
    useAllTenants,
    type TenantName,
} from './useAddons';
import styles from './addons.module.scss';

export interface TenantRow {
    id: number;
    name: string;
    state: AddonTenantState | null;
}

type Filter = 'all' | 'active';

/** Joins every Träger with the add-on's switches; Träger the tenant list does not know still appear. */
export const tenantRows = (tenants: TenantName[], states: AddonTenantState[]): TenantRow[] => {
    const byId = new Map(states.map((state) => [state.tenantId, state]));
    const rows: TenantRow[] = tenants.map((tenant) => ({ ...tenant, state: byId.get(tenant.id) ?? null }));
    const known = new Set(tenants.map((tenant) => tenant.id));
    states
        .filter((state) => state.tenantId > 0 && !known.has(state.tenantId))
        .forEach((state) => rows.push({ id: state.tenantId, name: '', state }));
    return rows.sort((a, b) => Number(!a.name) - Number(!b.name) || a.name.localeCompare(b.name, 'de') || a.id - b.id);
};

interface AddonTenantsTableProps {
    addonName: string;
    selectedTenantId: number | null;
    onSelect: (row: TenantRow) => void;
}

/** SuperAdmin view: every Träger with the add-on's switch, its agency overrides and the last change. */
export const AddonTenantsTable = ({ addonName, selectedTenantId, onSelect }: AddonTenantsTableProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const queryClient = useQueryClient();
    const tenants = useAllTenants(true);
    const states = useAddonTenants(addonName, true);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [pending, setPending] = useState<number | null>(null);

    const rows = useMemo(() => {
        const all = tenantRows(tenants.data ?? [], states.data ?? []);
        const query = search.trim().toLowerCase();
        return all.filter(
            (row) =>
                (filter === 'all' || row.state?.enabled) &&
                (!query || row.name.toLowerCase().includes(query) || String(row.id) === query),
        );
    }, [tenants.data, states.data, filter, search]);

    const activeCount = (states.data ?? []).filter((state) => state.enabled).length;

    const toggle = async (row: TenantRow, enabled: boolean) => {
        setPending(row.id);
        try {
            await setAddonEnabledForTenant(addonName, row.id, enabled);
            message.success(String(t(enabled ? 'addons.tenant.enabled' : 'addons.tenant.disabled')));
        } catch {
            message.error(String(t('addons.tenants.switchError')));
        } finally {
            setPending(null);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: [ADDON_TENANTS_KEY, addonName] }),
                queryClient.invalidateQueries({ queryKey: [ADMIN_ADDONS_KEY, row.id] }),
                queryClient.invalidateQueries({ queryKey: [ADDON_REGISTRY_KEY] }),
            ]);
        }
    };

    const tenantLabel = (row: TenantRow) =>
        row.name ? `${row.name} (${row.id})` : String(t('addons.tenant.unnamed', { id: row.id }));

    const overridesLabel = (state: AddonTenantState | null) => {
        const parts = [];
        if (state?.agenciesEnabled) {
            parts.push(t('addons.tenants.agenciesOn', { count: state.agenciesEnabled }));
        }
        if (state?.agenciesDisabled) {
            parts.push(t('addons.tenants.agenciesOff', { count: state.agenciesDisabled }));
        }
        return parts.length ? parts.join(', ') : '–';
    };

    if (tenants.isError || states.isError) {
        return <Alert type="error" showIcon role="alert" message={t('addons.tenants.loadError')} />;
    }

    return (
        <section className={styles.tenants} aria-label={String(t('addons.tenants.title'))}>
            <div className={styles.tenantsHeader}>
                <h3 className={styles.subheading}>
                    {t('addons.tenants.title')}{' '}
                    <span className={styles.hint}>{t('addons.tenants.activeCount', { count: activeCount })}</span>
                </h3>
                <div className={styles.tenantsFilter}>
                    <Input.Search
                        allowClear
                        className={styles.select}
                        placeholder={String(t('addons.tenant.placeholder'))}
                        aria-label={String(t('addons.tenant.placeholder'))}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <Radio.Group
                        aria-label={String(t('addons.tenants.filter'))}
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        optionType="button"
                        options={[
                            { value: 'all', label: t('addons.tenants.filter.all') },
                            { value: 'active', label: t('addons.tenants.filter.active') },
                        ]}
                    />
                </div>
            </div>
            <Table<TenantRow>
                size="small"
                rowKey="id"
                loading={tenants.isLoading || states.isLoading}
                dataSource={rows}
                pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                rowClassName={(row) => (row.id === selectedTenantId ? styles.selectedRow : '')}
                onRow={(row) => ({ onClick: () => onSelect(row) })}
                locale={{ emptyText: t('addons.tenants.empty') }}
                columns={[
                    {
                        key: 'tenant',
                        title: t('addons.tenant.label'),
                        render: (_, row) => tenantLabel(row),
                    },
                    {
                        key: 'enabled',
                        title: t('addons.status.active'),
                        width: 90,
                        render: (_, row) => (
                            <Switch
                                checked={!!row.state?.enabled}
                                loading={pending === row.id}
                                aria-label={String(t('addons.tenants.switchFor', { tenant: tenantLabel(row) }))}
                                onClick={(_checked, event) => event.stopPropagation()}
                                onChange={(enabled) => toggle(row, enabled)}
                            />
                        ),
                    },
                    {
                        key: 'agencies',
                        title: t('addons.tenants.agencies'),
                        render: (_, row) => overridesLabel(row.state),
                    },
                    {
                        key: 'updatedAt',
                        title: t('addons.tenants.updatedAt'),
                        render: (_, row) =>
                            row.state?.updatedAt ? new Date(row.state.updatedAt).toLocaleString(language) : '–',
                    },
                    {
                        key: 'actions',
                        title: <span className={styles.srOnly}>{t('addons.agencies.actions')}</span>,
                        width: 110,
                        render: (_, row) => (
                            <Button
                                type="link"
                                aria-label={String(t('addons.tenants.manageFor', { tenant: tenantLabel(row) }))}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onSelect(row);
                                }}
                            >
                                {t('addons.tenants.manage')}
                            </Button>
                        ),
                    },
                ]}
            />
        </section>
    );
};

export default AddonTenantsTable;
