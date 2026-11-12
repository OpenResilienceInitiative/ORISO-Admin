import { Alert } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddonsLoading } from './AddonsLoading';
import { AddonMount } from '../../addons/AddonMount';
import { useAddonsOutletContext } from './AddonsLayout';

/** Mounts one `admin.page` app of an add-on. */
export const AddonAdminPage = () => {
    const { t } = useTranslation();
    const { addonName, appId } = useParams();
    const { adminPages, registryLoading, tenant } = useAddonsOutletContext();
    const entry = adminPages.find((candidate) => candidate.addon.name === addonName && candidate.app.id === appId);

    if (registryLoading) {
        return <AddonsLoading />;
    }
    if (!entry) {
        return <Alert type="warning" showIcon message={t('addons.page.notFound')} />;
    }

    return <AddonMount key={entry.to} addon={entry.addon} app={entry.app} tenant={tenant ?? {}} />;
};

export default AddonAdminPage;
