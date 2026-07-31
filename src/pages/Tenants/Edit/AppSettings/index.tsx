import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CardDeck } from '../../../../components/CardDeck';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { UserRole } from '../../../../enums/UserRole';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { CommunicationSettings } from '../../../../components/Tenants/AppSettings/CommunicationSettings';
import { OtherFunctionsSettings } from '../../../../components/Tenants/AppSettings/OtherFunctionsSettings';
import { SmtpSettings } from '../../../../components/Tenants/AppSettings/SmtpSettings';
import { TopicsSettings } from '../../../../components/Tenants/AppSettings/TopicsSettings';

export const TenantAppSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const canSeeTenantAppSettings = isSuperAdmin || hasRole(UserRole.TenantAdmin);

    if (!canSeeTenantAppSettings) {
        return null;
    }

    return (
        <CardDeck
            ariaLabel={t('tenant.settings.cardDeck.ariaLabel')}
            previousLabel={t('tenant.settings.cardDeck.previous')}
            nextLabel={t('tenant.settings.cardDeck.next')}
        >
            <CardDeck.Item>
                <SmtpSettings tenantId={id} />
            </CardDeck.Item>
            <CardDeck.Item>
                <CommunicationSettings tenantId={id} />
            </CardDeck.Item>
            <CardDeck.Item>
                <OtherFunctionsSettings tenantId={id} hideTopics={settings.multitenancyWithSingleDomainEnabled} />
            </CardDeck.Item>
            <CardDeck.Item>
                <TopicsSettings />
            </CardDeck.Item>
        </CardDeck>
    );
};
