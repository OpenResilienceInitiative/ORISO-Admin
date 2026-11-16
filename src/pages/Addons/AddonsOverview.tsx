import { Alert, Empty } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { FETCH_ERRORS } from '../../api/fetchData';
import { M3Select } from '../../components/M3Select';
import type { AdminAddon } from '../../addons/addonTypes';
import { AddonCard } from './AddonCard';
import { AddonInfo } from './AddonInfo';
import { AddonsLoading } from './AddonsLoading';
import { AddonTenantsTable } from './AddonTenantsTable';
import { useAddonsOutletContext } from './AddonsLayout';
import { useAdminAddons } from './useAddons';
import styles from './addons.module.scss';

const isForbidden = (error: unknown) => error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN;

const ADDON_PARAM = 'addon';

/** The add-on of one Träger, loaded with that Träger's switch and agency overrides. */
const TenantAddon = ({
    name,
    tenantId,
    tenantName,
    isSuperAdmin,
}: {
    name: string;
    tenantId: number;
    tenantName?: string;
    isSuperAdmin: boolean;
}) => {
    const { t } = useTranslation();
    const addons = useAdminAddons(tenantId);
    if (addons.isLoading) {
        return <AddonsLoading />;
    }
    const addon = addons.data?.find((candidate) => candidate.manifest.name === name);
    if (addons.isError || !addon) {
        return (
            <Alert
                type="error"
                showIcon
                role="alert"
                message={t(isForbidden(addons.error) ? 'addons.error.forbidden' : 'addons.error.load')}
            />
        );
    }
    return <AddonCard addon={addon} tenantId={tenantId} tenantName={tenantName} isSuperAdmin={isSuperAdmin} />;
};

/**
 * Add-on centred view: pick an add-on, see what it is, then (SuperAdmins) which Träger use it and,
 * for one Träger, its agencies, settings and statistics. Träger admins see their own Träger only.
 */
export const AddonsOverview = () => {
    const { t } = useTranslation();
    const { tenant, setTenant, isSuperAdmin } = useAddonsOutletContext();
    const [searchParams, setSearchParams] = useSearchParams();
    // SuperAdmins list the add-ons for the platform (tenant 0 in their token); Träger admins for theirs.
    const listTenantId = isSuperAdmin ? null : tenant?.id ?? null;
    const addons = useAdminAddons(listTenantId, isSuperAdmin || listTenantId != null);
    const detailsRef = useRef<HTMLDivElement>(null);

    const list: AdminAddon[] = useMemo(() => addons.data ?? [], [addons.data]);
    const requested = searchParams.get(ADDON_PARAM);
    const selected = list.find((addon) => addon.manifest.name === requested) ?? (list.length ? list[0] : null);

    useEffect(() => {
        if (selected && requested !== selected.manifest.name) {
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
        if (isSuperAdmin) {
            setTenant(null);
        }
    };

    const renderContent = () => {
        if (!isSuperAdmin && listTenantId == null) {
            return <AddonsLoading />;
        }
        if (addons.isLoading) {
            return <AddonsLoading />;
        }
        if (addons.isError) {
            return (
                <Alert
                    type="error"
                    showIcon
                    role="alert"
                    message={t(isForbidden(addons.error) ? 'addons.error.forbidden' : 'addons.error.load')}
                />
            );
        }
        if (!selected) {
            return <Empty description={t('addons.empty')} />;
        }
        const { name } = selected.manifest;
        return (
            <>
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
                <AddonInfo addon={selected} isSuperAdmin={isSuperAdmin} />
                {!selected.global?.enabled && <Alert type="warning" showIcon message={t('addons.global.offHint')} />}
                {isSuperAdmin ? (
                    <>
                        <AddonTenantsTable
                            addonName={name}
                            selectedTenantId={tenant?.id ?? null}
                            onSelect={(row) => {
                                setTenant({ id: row.id, name: row.name || undefined });
                                window.setTimeout(
                                    () => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                                    0,
                                );
                            }}
                        />
                        <div ref={detailsRef}>
                            {tenant ? (
                                <TenantAddon
                                    key={`${name}-${tenant.id}`}
                                    name={name}
                                    tenantId={tenant.id}
                                    tenantName={tenant.name}
                                    isSuperAdmin
                                />
                            ) : (
                                <Alert type="info" showIcon message={t('addons.tenant.chooseFirst')} />
                            )}
                        </div>
                    </>
                ) : (
                    tenant && (
                        <AddonCard
                            addon={selected}
                            tenantId={tenant.id}
                            tenantName={tenant.name}
                            isSuperAdmin={false}
                        />
                    )
                )}
            </>
        );
    };

    return (
        <div className={styles.overview}>
            <div className={styles.intro}>
                <h2 className={styles.heading}>{t('addons.title')}</h2>
                <p className={styles.description}>{t('addons.description')}</p>
            </div>
            <div className={styles.list}>{renderContent()}</div>
        </div>
    );
};

export default AddonsOverview;
