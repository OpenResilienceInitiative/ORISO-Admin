import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormSwitchField } from '../../../../FormSwitchField';
import { TilePicture } from '../../../../TileFill';
import type { AppConfigInterface } from '../../../../../types/AppConfigInterface';
import masterDataPicture from '../../../../../resources/img/tile-help/master-data.webp';
import styles from '../../styles.module.scss';

/** Whether organisation admins may change the appearance themselves. Only platform admins edit this. */
export const EditingRightsCard = ({
    allowEdit,
    editable,
    onSave,
}: {
    allowEdit: boolean;
    editable: boolean;
    onSave: (formData: Partial<AppConfigInterface>, options?: { onSuccess?: () => void; onError?: () => void }) => void;
}) => {
    const { t } = useTranslation();
    return (
        <CardEditable
            key={`tenant-master-data-editable-${editable}`}
            allowEdit={allowEdit}
            initialValues={{ tenantAdminControls: { allowedPermissionToggles: { appearance: editable } } }}
            titleKey="settings.masterData.editable.title"
            subTitle={t<string>('settings.masterData.editable.subtitle')}
            onSave={onSave}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<ManageAccountsOutlinedIcon />}
            picture={<TilePicture src={masterDataPicture} />}
        >
            <FormSwitchField
                label={
                    <span className={styles.masterDataToggleCopy}>
                        <span className={styles.masterDataToggleTitle}>{t('settings.masterData.editable.toggle')}</span>
                        <span className={styles.masterDataToggleDescription}>
                            {t('settings.masterData.editable.toggle.description')}
                        </span>
                    </span>
                }
                name={['tenantAdminControls', 'allowedPermissionToggles', 'appearance']}
                inline
                disableLabels
                disabled={!allowEdit}
                className={styles.masterDataToggle}
                switchLabel={t('settings.masterData.editable.toggle')}
                switchVariant="m3"
            />
        </CardEditable>
    );
};
