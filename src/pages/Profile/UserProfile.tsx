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
import { Card } from '../../components/Card';
import { ReactComponent as VerifiedIcon } from '../../resources/img/svg/verified.svg';
import { TwoFactorSetup } from '../../components/TwoFactorSetup/TwoFactorSetup';

export const UserProfile = () => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();

    return (
        <Page>
            <Page.Title titleKey="profile.title" subTitleKey="profile.title.text" />

            {/* Masonry: cards of different heights stack in columns, nothing scrolls sideways. */}
            <CardGrid masonry minCardWidth={380} maxColumns={3}>
                {!hasRole(UserRole.TenantAdmin) && <PrivateData />}
                <RolesAndAssignment />
                <SelfConsultantIdentity />
                <PasswordChange />
                <Card titleKey="twoFactorAuth.title" subTitleKey="twoFactorAuth.subtitle" headerIcon={<VerifiedIcon />}>
                    <TwoFactorSetup context="profile" />
                </Card>
                <LanguageSettings />
                <Absence />
                <TourOverviewSection />
                {settings.documentationEnabled && <Documentation />}
            </CardGrid>
        </Page>
    );
};
