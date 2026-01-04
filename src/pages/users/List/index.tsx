import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Page } from '../../../components/Page';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useTenantAdminsData } from '../../../hooks/useTenantUserAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { TenantsTableData } from './components/TenantAdminsTableData';
import { UsersTableData } from './components/UsersTableData';

export const UsersList = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { data: tenantData } = useTenantData();
    const allowedNumberOfUsers = tenantData?.licensing?.allowedNumberOfUsers || 0;
    const { typeOfUsers } = useParams<{ typeOfUsers: TypeOfUser }>();
    const isTenantAdmins = typeOfUsers === TypeOfUser.TenantAdmins;

    const { data } = useTenantAdminsData({ current: 1, enabled: isTenantAdmins });
    const { data: responseList } = useConsultantsOrAdminsData({
        typeOfUser: typeOfUsers,
        enabled:
            typeOfUsers === TypeOfUser.Consultants
                ? can(PermissionAction.Read, Resource.Consultant)
                : can(PermissionAction.Read, Resource.AgencyAdminUser),
    });
    let title = t('tenantAdmins.title.text', { userCount: data?.total });
    if (typeOfUsers === 'consultants') {
        title = t('consultants.title.text', {
            userCount: `${responseList?.total || '-'}/${allowedNumberOfUsers}`,
        });
    } else if (typeOfUsers === TypeOfUser.AgencyAdmins) {
        title = t('agencyAdmins.title.text', { userCount: responseList?.total });
    }
    return (
        <Page>
            <Page.Title
                titleKey="users.title"
                subTitle={title}
                tabs={[
                    can(PermissionAction.Read, Resource.Consultant) && {
                        to: '/admin/users/consultants',
                        titleKey: 'counselor.title',
                    },
                    // Temporarily hidden - Keycloak admin client auth issues
                    // can(PermissionAction.Read, Resource.AgencyAdminUser) && {
                    //     to: '/admin/users/agency-admins',
                    //     titleKey: 'agencyAdmins.title',
                    // },
                    // can(PermissionAction.Read, Resource.TenantAdminUser) && {
                    //     to: '/admin/users/tenant-admins',
                    //     titleKey: 'tenantAdmins.title',
                    // },
                ]}
            />
            {isTenantAdmins ? <TenantsTableData /> : <UsersTableData key={`admins-${typeOfUsers}`} />}
        </Page>
    );
};
