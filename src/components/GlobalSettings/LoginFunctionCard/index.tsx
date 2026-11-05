import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { MuiSwitchField } from '../../mui/MuiSwitchField';

interface Props {
    initialValues?: Record<string, unknown>;
    isLoading?: boolean;
    onSave?: (values: unknown, options?: { onError?: () => void }) => void;
}

/**
 * ORISO-Admin#602: `featureAnonymousChatEnabled` is read by no consumer in Frontend or UserService.
 * Rather than invent the behaviour, the note says what the switch actually does, so an admin can
 * read it before deciding.
 */
export const LoginFunctionCard = ({ initialValues, isLoading, onSave }: Props) => {
    const { t } = useTranslation();

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.globalSettings.anonymousChat.title"
            onSave={onSave}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<LoginOutlinedIcon />}
            note={{ icon: <InfoOutlinedIcon />, text: t('tenants.permissions.anonymousChat.description') }}
        >
            <MuiSwitchField
                label={t('tenants.permissions.anonymousChat.title')}
                name={['settings', 'featureAnonymousChatEnabled']}
            />
        </CardEditable>
    );
};
