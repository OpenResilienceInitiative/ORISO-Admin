import { type ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../../../../components/Card';
import { M3Button } from '../../../../components/M3Button';
import routePathNames from '../../../../appConfig';
import { getTenantAdmins, type TenantUnitAdmin } from '../../../../api/admins/getTenantAdmins';
import { TENANT_ADMINS_QUERY_KEY } from '../../../../hooks/useTenantUserAdminData';
import { DeleteTenantAdminModal } from '../../../users/List/components/DeleteTenantAdmin';
import type { CounselorData } from '../../../../types/counselor';
import styles from './styles.module.scss';

const asCounselor = (admin: TenantUnitAdmin, tenantId: string): CounselorData =>
    ({
        id: admin.id,
        firstname: admin.firstname,
        lastname: admin.lastname,
        email: admin.email,
        tenantId,
    } as CounselorData);

/** The admins of this Tenant-Unit (Träger detail). Add opens the existing admin form; remove uses the existing delete. */
export const TenantUnitAdmins = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const [removing, setRemoving] = useState<TenantUnitAdmin | null>(null);
    const {
        data: admins = [],
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: [TENANT_ADMINS_QUERY_KEY, 'unit', tenantId],
        queryFn: () => getTenantAdmins(tenantId),
        enabled: Boolean(tenantId),
    });

    let content: ReactNode = (
        <ul className={styles.adminList}>
            {admins.map((admin) => (
                <li key={admin.id} className={styles.adminRow}>
                    <span>
                        {admin.firstname} {admin.lastname}
                    </span>
                    <span>{admin.email}</span>
                    <M3Button type="button" onClick={() => setRemoving(admin)}>
                        {t('tenants.edit.admins.remove')}
                    </M3Button>
                </li>
            ))}
        </ul>
    );
    if (admins.length === 0) content = <p className={styles.description}>{t('tenants.edit.adminEmailsCardEmpty')}</p>;
    if (isError)
        content = (
            <div role="alert">
                <p className={styles.description}>{t('tenants.edit.admins.loadError')}</p>
                <M3Button
                    type="button"
                    onClick={() => {
                        refetch();
                    }}
                >
                    {t('tenants.edit.admins.retry')}
                </M3Button>
            </div>
        );

    return (
        <Card titleKey="tenants.edit.adminEmailsCardTitle" isLoading={isLoading} dataTestId="tenant-unit-admins">
            <div>
                {content}
                <Link to={`${routePathNames.tenantAdmins}/add?tenantId=${encodeURIComponent(tenantId)}`}>
                    {t('tenants.edit.admins.add')}
                </Link>
                {removing && (
                    <DeleteTenantAdminModal
                        user={asCounselor(removing, tenantId)}
                        isPlatformAdmin={false}
                        onClose={() => setRemoving(null)}
                    />
                )}
            </div>
        </Card>
    );
};
