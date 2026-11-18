import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

export const AddonsLoading = () => {
    const { t } = useTranslation();
    return (
        <div role="status" aria-label={String(t('addons.loading'))}>
            <Spin />
        </div>
    );
};
