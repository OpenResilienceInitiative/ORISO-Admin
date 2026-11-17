import { Alert, Tag } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AdminEmpty } from '../../components/AdminEmpty';
import { FETCH_ERRORS } from '../../api/fetchData';
import { M3Select } from '../../components/M3Select';
import type { AdminAddon } from '../../addons/addonTypes';
import { AddonCard } from './AddonCard';
import { AddonInfo } from './AddonInfo';
import { AddonsLoading } from './AddonsLoading';
import { AddonTenantsTable } from './AddonTenantsTable';
import { useAddonsOutletContext, type AdminPageEntry } from './AddonsLayout';
import { useAdminAddons } from './useAddons';
import styles from './addons.module.scss';

const errorCode = (error: unknown) => (error instanceof Error ? error.message : '');

const ADDON_PARAM = 'addon';

const LoadState = ({ error }: { error: unknown }) => {
    const { t } = useTranslation();
    if (errorCode(error) === FETCH_ERRORS.NO_MATCH) {
        return <AdminEmpty description={t('addons.empty')} />;
    }
    return (
        <Alert
            type="error"
            showIcon
            role="alert"
            message={t(errorCode(error) === FETCH_ERRORS.FORBIDDEN ? 'addons.error.forbidden' : 'addons.error.load')}
        />
    );
};

/** Add-on pages act for the caller's own Träger, so they are not offered for a picked one. */
const NO_ADMIN_PAGES: AdminPageEntry[] = [];

/** The add-on at the Träger the platform admin picked in the table. */
const TenantAddon = ({ name, tenantId, tenantName }: { name: string; tenantId: number; tenantName?: string }) => {
    const { t } = useTranslation();
    const addons = useAdminAddons(tenantId);
    if (addons.isLoading) {
        return <AddonsLoading />;
    }
    const addon = addons.data?.find((candidate) => candidate.manifest.name === name);
    if (addons.isError || !addon) {
        return <LoadState error={addons.error ?? new Error(FETCH_ERRORS.NO_MATCH)} />;
    }
    return (
        <AddonCard
            addon={addon}
            tenantId={tenantId}
            adminPages={NO_ADMIN_PAGES}
            title={tenantName ? `${tenantName} (${tenantId})` : t('addons.tenant.unnamed', { id: tenantId })}
            tags={<Tag>{t(`addons.mode.${addon.mode ?? 'OFF'}`)}</Tag>}
            canSwitch={false}
            detailsAlwaysOpen
        />
    );
};

/** Platform admin: pick an add-on, see what it is, set its mode per Träger and manage one Träger. */
const PlatformAddons = ({ list }: { list: AdminAddon[] }) => {
    const { t } = useTranslation();
    const { tenant, setTenant } = useAddonsOutletContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const detailsRef = useRef<HTMLDivElement>(null);
    const requested = searchParams.get(ADDON_PARAM);
    const selected = list.find((addon) => addon.manifest.name === requested) ?? list[0];

    useEffect(() => {
        if (requested !== selected.manifest.name) {
            setSearchParams(
                (params) => {
                    params.set(ADDON_PARAM, selected.manifest.name);
                    return params;
                },
                { replace: true },
            );
        }
    }, [selected, requested, setSearchParams]);

    const selectAddon = (name: string) => {
        setSearchParams((params) => {
            params.set(ADDON_PARAM, name);
            return params;
        });
        setTenant(null);
    };

    const { name } = selected.manifest;
    return (
        <>
            {list.length > 1 && (
                <div className={styles.tenantPicker}>
                    <label htmlFor="addons-addon" className={styles.label}>
                        {t('addons.addon.label')}
                    </label>
                    <M3Select
                        id="addons-addon"
                        className={styles.select}
                        aria-label={String(t('addons.addon.label'))}
                        value={name}
                        onChange={(value: string) => selectAddon(value)}
                        options={list.map((addon) => ({
                            value: addon.manifest.name,
                            label: `${addon.manifest.name} (${addon.manifest.version})`,
                        }))}
                    />
                </div>
            )}
            <AddonInfo key={name} addon={selected} />
            {!selected.global?.enabled && <Alert type="warning" showIcon message={t('addons.global.offHint')} />}
            <AddonTenantsTable
                key={`tenants-${name}`}
                addonName={name}
                selectedTenantId={tenant?.id ?? null}
                onSelect={(row) => {
                    setTenant({ id: row.id, name: row.name || undefined });
                    window.setTimeout(
                        () => detailsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
                        0,
                    );
                }}
            />
            <div ref={detailsRef}>
                {tenant && (
                    <TenantAddon
                        key={`${name}-${tenant.id}`}
                        name={name}
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                    />
                )}
            </div>
        </>
    );
};

/** Träger admin: one card per add-on the platform admin made visible to the Träger. */
const TenantAddons = ({ list, tenantId }: { list: AdminAddon[]; tenantId: number }) => {
    const { adminPages } = useAddonsOutletContext();
    return (
        <>
            {list.map((addon) => (
                <AddonCard
                    key={addon.manifest.name}
                    addon={addon}
                    tenantId={tenantId}
                    adminPages={adminPages}
                    canSwitch={!!addon.tenantCanSwitch}
                    showReadme
                    defaultOpen={list.length === 1}
                />
            ))}
        </>
    );
};

export const AddonsOverview = () => {
    const { t } = useTranslation();
    const { tenant, isSuperAdmin } = useAddonsOutletContext();
    // SuperAdmins list the add-ons for the platform (tenant 0 in their token); Träger admins for theirs.
    const listTenantId = isSuperAdmin ? null : tenant?.id ?? null;
    const addons = useAdminAddons(listTenantId, isSuperAdmin || listTenantId != null);
    const list: AdminAddon[] = useMemo(() => addons.data ?? [], [addons.data]);

    const renderContent = () => {
        if ((!isSuperAdmin && listTenantId == null) || addons.isLoading) {
            return <AddonsLoading />;
        }
        if (addons.isError) {
            return <LoadState error={addons.error} />;
        }
        if (list.length === 0) {
            return <AdminEmpty description={t('addons.empty')} />;
        }
        return isSuperAdmin ? (
            <PlatformAddons list={list} />
        ) : (
            <TenantAddons list={list} tenantId={listTenantId as number} />
        );
    };

    return (
        <div className={styles.overview}>
            <h2 className={styles.heading}>{t('addons.title')}</h2>
            <div className={styles.list}>{renderContent()}</div>
        </div>
    );
};

export default AddonsOverview;
