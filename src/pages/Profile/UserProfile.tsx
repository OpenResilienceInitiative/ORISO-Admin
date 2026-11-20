import { Page } from '../../components/Page';
import { CardGrid } from '../../components/CardGrid';
import { useAppConfigContext } from '../../context/useAppConfig';
import { UserRole } from '../../enums/UserRole';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { Documentation } from './Documentation';
import { TourOverviewSection } from '../../components/productTour/TourOverviewSection';
import { Absence } from './Absence';
import { LanguageSettings } from './LanguageSettings';
import { PasswordChange } from './PassswordChange';
import { PrivateData } from './PrivateData';
import { RolesAndAssignment } from './RolesAndAssignment';
import { SelfConsultantIdentity } from './SelfConsultantIdentity';
import { TwoFactorCard } from './TwoFactorCard';

export const UserProfile = () => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();

    return (
        <Page>
            <Page.Title titleKey="profile.title" subTitleKey="profile.title.text" />

            {/* The settings raster: tiles share the rows, nothing scrolls sideways. */}
            <CardGrid raster>
                {!hasRole(UserRole.TenantAdmin) && (
                    <CardGrid.Item>
                        <PrivateData />
                    </CardGrid.Item>
                )}
                <CardGrid.Item>
                    <RolesAndAssignment />
                </CardGrid.Item>
                <SelfConsultantIdentity />
                <CardGrid.Item>
                    <PasswordChange />
                </CardGrid.Item>
                <CardGrid.Item>
                    <TwoFactorCard />
                </CardGrid.Item>
                <CardGrid.Item>
                    <LanguageSettings />
                </CardGrid.Item>
                <CardGrid.Item>
                    <Absence />
                </CardGrid.Item>
                <CardGrid.Item>
                    <TourOverviewSection />
                </CardGrid.Item>
                {settings.documentationEnabled && (
                    <CardGrid.Item>
                        <Documentation />
                    </CardGrid.Item>
                )}
            </CardGrid>
        </Page>
    );
};
