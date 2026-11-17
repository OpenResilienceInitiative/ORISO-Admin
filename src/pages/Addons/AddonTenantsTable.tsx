import { Alert, Button, Input, Radio, Tag } from 'antd';
import classNames from 'classnames';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ADDON_MODES, type AddonMode, type AddonTenantState } from '../../addons/addonTypes';
import { formatDateTime } from '../../addons/intlLocale';
import { AdminEmpty } from '../../components/AdminEmpty';
import {
    DataTable,
    DataTableCell,
    DataTableHeader,
    DataTableRow,
    type DataTableColumn,
} from '../../components/DataTable';
import { M3Select } from '../../components/M3Select';
import { snackbar } from '../../components/Snackbar';
import { useMeasuredListLayout } from '../../hooks/useMeasuredListLayout';
import { AddonModeHelp } from './AddonModeHelp';
import { useAddonTenants, useAllTenants, useSetTenantMode, type TenantName } from './useAddons';
import { reportAddonSaveError } from './mutationFeedback';
import styles from './addons.module.scss';

export interface TenantRow {
    id: number;
    name: string;
    state: AddonTenantState | null;
}

type Filter = 'all' | 'available';

// Measured in Storybook with a long Träger name: five columns fit from 730px, the tablet row (date folded into the
// Träger cell) from 560px. Each band keeps 10px of slack.
export const TENANT_LIST_BANDS = { phoneBelow: 570, wideFrom: 740 };

export const tenantMode = (row: TenantRow): AddonMode => row.state?.mode ?? 'OFF';

export const isActiveForTenant = (row: TenantRow): boolean => {
    const mode = tenantMode(row);
    return mode === 'ON' || mode === 'ON_HIDDEN' || (mode === 'TENANT' && !!row.state?.enabled);
};

/** Joins every Träger with the add-on's state; Träger the tenant list does not know still appear. */
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

/** Platform admin: every Träger with the add-on's mode, its agency exceptions and the last change. */
export const AddonTenantsTable = ({ addonName, selectedTenantId, onSelect }: AddonTenantsTableProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const tenants = useAllTenants(true);
    const states = useAddonTenants(addonName, true);
    const setMode = useSetTenantMode(addonName);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [savingTenantIds, setSavingTenantIds] = useState<ReadonlySet<number>>(new Set());
    const containerRef = useRef<HTMLElement>(null);
    const layout = useMeasuredListLayout(containerRef, TENANT_LIST_BANDS);

    const allRows = useMemo(() => tenantRows(tenants.data ?? [], states.data ?? []), [tenants.data, states.data]);
    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return allRows.filter(
            (row) =>
                (filter === 'all' || tenantMode(row) !== 'OFF') &&
                (!query || row.name.toLowerCase().includes(query) || String(row.id) === query),
        );
    }, [allRows, filter, search]);
    const activeCount = allRows.filter(isActiveForTenant).length;

    const tenantLabel = (row: TenantRow) =>
        row.name ? `${row.name} (${row.id})` : String(t('addons.tenant.unnamed', { id: row.id }));

    const changeMode = (row: TenantRow, mode: AddonMode) => {
        setSavingTenantIds((current) => new Set(current).add(row.id));
        setMode.mutate(
            { tenantId: row.id, mode },
            {
                onSuccess: () => snackbar.success(String(t('addons.mode.saved'))),
                onError: (error) => reportAddonSaveError(error, t),
                onSettled: () =>
                    setSavingTenantIds((current) => {
                        const next = new Set(current);
                        next.delete(row.id);
                        return next;
                    }),
            },
        );
    };

    const overridesLabel = (state: AddonTenantState | null) => {
        const parts = [];
        if (state?.agenciesEnabled) {
            parts.push(t('addons.tenants.agenciesOn', { count: state.agenciesEnabled }));
        }
        if (state?.agenciesDisabled) {
            parts.push(t('addons.tenants.agenciesOff', { count: state.agenciesDisabled }));
        }
        return parts.length ? parts.join(', ') : '-';
    };

    const updatedLabel = (row: TenantRow) =>
        row.state?.updatedAt ? formatDateTime(row.state.updatedAt, language) : '-';

    if (tenants.isError || states.isError) {
        return <Alert type="error" showIcon role="alert" message={t('addons.tenants.loadError')} />;
    }

    const wide = layout === 'wide';
    const cards = layout === 'phone';
    const columns: DataTableColumn[] = [
        { key: 'tenant', label: t('addons.tenant.label') },
        { key: 'mode', label: t('addons.mode.label'), addon: cards ? undefined : <AddonModeHelp /> },
        { key: 'agencies', label: t('addons.tenants.agencies') },
        ...(wide ? [{ key: 'updatedAt', label: t('addons.tenants.updatedAt') }] : []),
        { key: 'actions', label: '', ariaLabel: String(t('addons.agencies.actions')) },
    ];

    const renderCell = (key: string, row: TenantRow) => {
        const mode = tenantMode(row);
        switch (key) {
            case 'tenant':
                return (
                    <span className={styles.pair}>
                        <span>{tenantLabel(row)}</span>
                        {!wide && row.state?.updatedAt && (
                            <span className={styles.secondary}>
                                {t('addons.tenants.updatedAtValue', { date: updatedLabel(row) })}
                            </span>
                        )}
                    </span>
                );
            case 'mode':
                return (
                    <span className={styles.modeCell}>
                        <M3Select<AddonMode>
                            size="small"
                            className={styles.modeSelect}
                            aria-label={String(t('addons.mode.for', { tenant: tenantLabel(row) }))}
                            value={mode}
                            loading={savingTenantIds.has(row.id)}
                            disabled={savingTenantIds.has(row.id)}
                            onChange={(next) => changeMode(row, next)}
                            options={ADDON_MODES.map((value) => ({ value, label: t(`addons.mode.${value}`) }))}
                        />
                        {mode === 'TENANT' && (
                            <Tag className={row.state?.enabled ? styles.statusActive : undefined}>
                                {t(row.state?.enabled ? 'addons.mode.tenantOn' : 'addons.mode.tenantOff')}
                            </Tag>
                        )}
                    </span>
                );
            case 'agencies':
                return overridesLabel(row.state);
            case 'updatedAt':
                return <span className={styles.nowrap}>{updatedLabel(row)}</span>;
            case 'actions':
                return (
                    <Button
                        type="link"
                        className={styles.inlineLink}
                        aria-label={String(t('addons.tenants.manageFor', { tenant: tenantLabel(row) }))}
                        aria-pressed={row.id === selectedTenantId}
                        onClick={() => onSelect(row)}
                    >
                        {t('addons.tenants.manage')}
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <section
            ref={containerRef}
            className={styles.tenants}
            aria-label={String(t('addons.tenants.title'))}
            data-testid="addon-tenants"
            data-layout={layout}
        >
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
                            { value: 'available', label: t('addons.tenants.filter.available') },
                        ]}
                    />
                </div>
            </div>
            <DataTable
                ariaLabel={String(t('addons.tenants.title'))}
                className={classNames(styles.tenantTable, { [styles.cards]: cards })}
                stacked={cards}
                header={<DataTableHeader columns={columns} />}
                loading={tenants.isLoading || states.isLoading}
                skeletonColumns={columns.length}
                isEmpty={rows.length === 0}
                empty={<AdminEmpty description={t('addons.tenants.empty')} />}
            >
                {rows.map((row) => (
                    <DataTableRow key={row.id} selected={row.id === selectedTenantId}>
                        {columns.map((column) => (
                            <DataTableCell key={column.key}>
                                {column.label && (
                                    <span className={styles.cellLabel}>
                                        {column.label}
                                        {cards && column.key === 'mode' && <AddonModeHelp />}
                                    </span>
                                )}
                                {renderCell(column.key, row)}
                            </DataTableCell>
                        ))}
                    </DataTableRow>
                ))}
            </DataTable>
        </section>
    );
};

export default AddonTenantsTable;
