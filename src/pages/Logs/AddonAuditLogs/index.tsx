import { useMemo, useRef, useState } from 'react';
import { Alert, Button } from 'antd';
import TextField from '@mui/material/TextField';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { M3Select } from '../../../components/M3Select';
import { AdminEmpty } from '../../../components/AdminEmpty';
import {
    DataTable,
    DataTableCell,
    DataTableHeader,
    DataTablePagination,
    DataTableRow,
    type DataTableColumn,
} from '../../../components/DataTable';
import { useMeasuredListLayout } from '../../../hooks/useMeasuredListLayout';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import decodeHTML from '../../../utils/decodeHTML';
import { localizedText, type AddonAuditEntry } from '../../../addons/addonTypes';
import { TenantSelect, type SelectOption } from '../../Addons/RemoteSearchSelect';
import { useAddonAuditEntries, useAddonRegistry, useAdminAddons, useAgencyNames } from '../../Addons/useAddons';
import { AUDIT_LIST_BANDS, dayEnd, dayStart, visibleRoles } from './auditFilters';
import styles from './addonAuditLogs.module.scss';

const errorKey = (error: unknown) => {
    const code = error instanceof Error ? error.message : '';
    if (code === FETCH_ERRORS.FORBIDDEN) return 'addonAudit.error.forbidden';
    if (code === FETCH_ERRORS.NO_MATCH) return 'addonAudit.error.unavailable';
    return 'addonAudit.error.load';
};

export const AddonAuditLogsPage = () => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const { isSuperAdmin, tenantId: tokenTenantId } = useUserRoles();
    const { data: ownTenant } = useTenantData();
    const [tenant, setTenant] = useState<SelectOption | null>(null);
    const [addon, setAddon] = useState<string | undefined>(undefined);
    const [fromDay, setFromDay] = useState('');
    const [toDay, setToDay] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const ownTenantId = tokenTenantId != null && tokenTenantId > 0 ? tokenTenantId : ownTenant?.id ?? null;
    const scopeTenantId = isSuperAdmin ? tenant?.id ?? null : ownTenantId;

    const audit = useAddonAuditEntries({
        tenantId: isSuperAdmin ? tenant?.id ?? null : null,
        addon,
        from: dayStart(fromDay),
        to: dayEnd(toDay),
        page: page - 1,
        size: perPage,
    });
    const registry = useAddonRegistry();
    const tenantAddons = useAdminAddons(scopeTenantId, scopeTenantId != null);
    const rows = audit.data?.items ?? [];

    const appTitles = useMemo(() => {
        const titles = new Map<string, string>();
        (registry.data?.addons ?? []).forEach((entry) =>
            (entry.apps ?? []).forEach((app) =>
                titles.set(`${entry.name}/${app.id}`, localizedText(app.title, language, app.id)),
            ),
        );
        return titles;
    }, [registry.data, language]);

    const addonOptions = useMemo(() => {
        const names = new Set<string>();
        (tenantAddons.data ?? []).forEach((entry) => names.add(entry.manifest.name));
        (registry.data?.addons ?? []).forEach((entry) => names.add(entry.name));
        rows.forEach((row) => names.add(row.addon));
        if (addon) names.add(addon);
        return [...names].sort().map((name) => ({ value: name, label: name }));
    }, [tenantAddons.data, registry.data, rows, addon]);

    const agencyIds = useMemo(
        () => [...new Set(rows.map((row) => row.agencyId).filter((id): id is number => typeof id === 'number'))],
        [rows],
    );
    const agencyNames = useAgencyNames(agencyIds);

    const tenantName = (id: number | null | undefined) => {
        if (id == null) return '-';
        if (tenant?.id === id && tenant.name) return tenant.name;
        if (ownTenant?.id != null && Number(ownTenant.id) === id && ownTenant.name) return decodeHTML(ownTenant.name);
        return t('addonAudit.tenantFallback', { id });
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const layout = useMeasuredListLayout(containerRef, AUDIT_LIST_BANDS);
    const combined = layout !== 'wide';

    const columns: DataTableColumn[] = [
        { key: 'createdAt', label: t('addonAudit.table.createdAt') },
        { key: 'addon', label: t('addonAudit.table.addon') },
        ...(combined ? [] : [{ key: 'action', label: t('addonAudit.table.action') }]),
        { key: 'summary', label: t('addonAudit.table.summary') },
        { key: 'actor', label: t('addonAudit.table.actor') },
        { key: 'scope', label: t('addonAudit.table.scope') },
        ...(combined ? [] : [{ key: 'subject', label: t('addonAudit.table.subject') }]),
    ];

    const renderSubject = (row: AddonAuditEntry) => (
        <span className={styles.pair}>
            <span className={styles.id}>{row.subjectId || '-'}</span>
            {row.sessionId != null && (
                <span className={styles.secondary}>{t('addonAudit.session', { id: row.sessionId })}</span>
            )}
        </span>
    );

    const renderCell = (key: string, row: AddonAuditEntry) => {
        switch (key) {
            case 'createdAt':
                return (
                    <span className={styles.nowrap}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString(language) : '-'}
                    </span>
                );
            case 'addon':
                return (
                    <span className={styles.pair}>
                        <span>{row.addon}</span>
                        {row.appId && (
                            <span className={styles.secondary}>
                                {appTitles.get(`${row.addon}/${row.appId}`) ?? row.appId}
                            </span>
                        )}
                        {combined && <code className={classNames(styles.action, styles.id)}>{row.action}</code>}
                    </span>
                );
            case 'action':
                return <code className={classNames(styles.action, styles.id)}>{row.action}</code>;
            case 'summary':
                return localizedText(row.summary, language, '-');
            case 'actor': {
                const roles = visibleRoles(row.actor?.roles);
                return (
                    <span className={styles.pair}>
                        <span className={styles.id}>{row.actor?.username || row.actor?.id || '-'}</span>
                        {roles.length > 0 && (
                            <span className={styles.secondary}>
                                {roles.map((role) => t(`addonAudit.role.${role}`, { defaultValue: role })).join(', ')}
                            </span>
                        )}
                    </span>
                );
            }
            case 'scope':
                return (
                    <span className={styles.pair}>
                        <span>{tenantName(row.tenantId)}</span>
                        {row.agencyId != null && (
                            <span className={styles.secondary}>
                                {agencyNames[row.agencyId] ??
                                    t('addons.agencies.unnamed', {
                                        id: row.agencyId,
                                        defaultValue: `#${row.agencyId}`,
                                    })}
                            </span>
                        )}
                        {combined && (row.subjectId || row.sessionId != null) && renderSubject(row)}
                    </span>
                );
            case 'subject':
                return renderSubject(row);
            default:
                return null;
        }
    };

    const resetPage = () => setPage(1);

    return (
        <div ref={containerRef} className={styles.list} data-testid="addon-audit-log" data-layout={layout}>
            {audit.isError && (
                <Alert className={styles.alert} type="error" role="alert" message={t(errorKey(audit.error))} showIcon />
            )}
            <div
                className={styles.toolbar}
                onFocus={(event) => event.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })}
            >
                {isSuperAdmin && (
                    <TenantSelect
                        className={styles.tenantSelect}
                        ariaLabel={String(t('addonAudit.filters.tenant'))}
                        placeholder={String(t('addonAudit.filters.tenantAll'))}
                        allowClear
                        value={tenant?.id ?? null}
                        selectedOption={tenant}
                        onChange={(option) => {
                            setTenant(option);
                            resetPage();
                        }}
                    />
                )}
                <M3Select
                    allowClear
                    aria-label={t('addonAudit.filters.addon')}
                    placeholder={t('addonAudit.filters.addon')}
                    style={{ width: 200 }}
                    value={addon}
                    onChange={(value) => {
                        setAddon(value || undefined);
                        resetPage();
                    }}
                    options={addonOptions}
                />
                <TextField
                    type="date"
                    size="small"
                    label={t('addonAudit.filters.from')}
                    value={fromDay}
                    onChange={(event) => {
                        setFromDay(event.target.value);
                        resetPage();
                    }}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: toDay || undefined } }}
                />
                <TextField
                    type="date"
                    size="small"
                    label={t('addonAudit.filters.to')}
                    value={toDay}
                    onChange={(event) => {
                        setToDay(event.target.value);
                        resetPage();
                    }}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fromDay || undefined } }}
                />
                <Button
                    onClick={() => {
                        setTenant(null);
                        setAddon(undefined);
                        setFromDay('');
                        setToDay('');
                        resetPage();
                    }}
                >
                    {t('addonAudit.filters.reset')}
                </Button>
            </div>

            <DataTable
                ariaLabel={t('addonAudit.title')}
                className={classNames(styles.table, {
                    [styles.combined]: layout === 'tablet',
                    [styles.cards]: layout === 'phone',
                })}
                stacked={layout === 'phone'}
                header={<DataTableHeader columns={columns} />}
                loading={audit.isLoading}
                skeletonColumns={columns.length}
                isEmpty={!audit.isError && rows.length === 0}
                empty={<AdminEmpty />}
                footer={
                    <DataTablePagination
                        page={page}
                        pageSize={perPage}
                        total={audit.data?.total ?? 0}
                        onPageChange={setPage}
                        onPageSizeChange={(nextPageSize) => {
                            setPerPage(nextPageSize);
                            resetPage();
                        }}
                    />
                }
            >
                {rows.map((row) => (
                    <DataTableRow key={row.id}>
                        {columns.map((column) => (
                            <DataTableCell key={column.key}>
                                <span className={styles.cellLabel}>{column.label}</span>
                                {renderCell(column.key, row)}
                            </DataTableCell>
                        ))}
                    </DataTableRow>
                ))}
            </DataTable>
        </div>
    );
};

export default AddonAuditLogsPage;
