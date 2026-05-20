import { useParams } from 'react-router';
import { Page } from '../../../components/Page';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { UserManagementTable } from '../management/UserManagementTable';
import { UserSectionPills } from '../management/UserSectionPills';
import styles from './styles.module.scss';

const USER_HUB_SECTIONS = new Set<string>([
    TypeOfUser.Tenants,
    TypeOfUser.Consultants,
    TypeOfUser.AgencyAdmins,
    TypeOfUser.TenantAdmins,
]);

export const UsersList = () => {
    const { typeOfUsers } = useParams<{ typeOfUsers: TypeOfUser }>();
    const isUsersHub = USER_HUB_SECTIONS.has(typeOfUsers);

    return (
        <Page>
            {isUsersHub ? (
                <div className={styles.usersHubHeader}>
                    <UserSectionPills />
                </div>
            ) : (
                <Page.Title titleKey="users.title" />
            )}
            <UserManagementTable key={`user-table-${typeOfUsers}`} figmaTableHeader={isUsersHub} />
        </Page>
    );
};
