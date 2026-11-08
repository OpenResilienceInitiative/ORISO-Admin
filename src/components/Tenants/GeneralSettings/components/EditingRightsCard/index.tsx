import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormSwitchField } from '../../../../FormSwitchField';
import { TilePicture } from '../../../../TileFill';
import masterDataPicture from '../../../../../resources/img/tile-help/master-data.webp';
import styles from '../../styles.module.scss';

/** Whether organisation admins may change the appearance themselves. Only platform admins edit this. */
interface EditingRightsFormData {
    tenantAdminControls?: { allowedPermissionToggles?: { appearance?: boolean } };
}

export const EditingRightsCard = ({
    allowEdit,
    editable,
    isLoading,
    onSave,
}: {
    allowEdit: boolean;
    /** `undefined` means the value is not known (still loading or the read failed): the switch stays unset. */
    editable: boolean | undefined;
    isLoading?: boolean;
    onSave: (formData: Partial<EditingRightsFormData>, options?: { onError?: () => void }) => void;
}) => {
    const { t } = useTranslation();
    return (
        <CardEditable
            key={`tenant-master-data-editable-${editable}`}
            allowEdit={allowEdit}
            isLoading={isLoading}
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
                className={styles.masterDataToggle}
                switchLabel={t('settings.masterData.editable.toggle')}
            />
        </CardEditable>
    );
};
