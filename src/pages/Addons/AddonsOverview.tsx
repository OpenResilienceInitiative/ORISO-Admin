import { Alert, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import { AddonsLoading } from './AddonsLoading';
import { FETCH_ERRORS } from '../../api/fetchData';
import { AddonCard } from './AddonCard';
import { useAddonsOutletContext } from './AddonsLayout';
import { TenantSelect } from './RemoteSearchSelect';
import { useAdminAddons } from './useAddons';
import styles from './addons.module.scss';

const isForbidden = (error: unknown) => error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN;

export const AddonsOverview = () => {
    const { t } = useTranslation();
    const { tenant, setTenant, isSuperAdmin } = useAddonsOutletContext();
    const tenantId = tenant?.id ?? null;
    const addons = useAdminAddons(tenantId, tenantId != null);

    const renderList = () => {
        if (tenantId == null) {
            return <Alert type="info" showIcon message={t('addons.tenant.chooseFirst')} />;
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
        if (!addons.data?.length) {
            return <Empty description={t('addons.empty')} />;
        }
        return addons.data.map((addon) => (
            <AddonCard key={addon.manifest.name} addon={addon} tenantId={tenantId} isSuperAdmin={isSuperAdmin} />
        ));
    };

    return (
        <div className={styles.overview}>
            <div className={styles.intro}>
                <h2 className={styles.heading}>{t('addons.title')}</h2>
                <p className={styles.description}>{t('addons.description')}</p>
            </div>
            {isSuperAdmin && (
                <div className={styles.tenantPicker}>
                    <label htmlFor="addons-tenant" className={styles.label}>
                        {t('addons.tenant.label')}
                    </label>
                    <TenantSelect
                        id="addons-tenant"
                        className={styles.select}
                        ariaLabel={String(t('addons.tenant.label'))}
                        placeholder={String(t('addons.tenant.placeholder'))}
                        value={tenantId}
                        selectedOption={tenant?.id != null ? { id: tenant.id, name: tenant.name ?? '' } : null}
                        onChange={(option) => setTenant(option ? { id: option.id, name: option.name } : null)}
                    />
                </div>
            )}
            <div className={styles.list}>{renderList()}</div>
        </div>
    );
};

export default AddonsOverview;
