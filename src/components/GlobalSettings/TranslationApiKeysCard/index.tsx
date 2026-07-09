import { Button, Form, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { Card } from '../../Card';
import { FormInputPasswordField } from '../../FormInputPasswordField';
import { TRANSLATION_PROVIDERS, TranslationKeys, TranslationProvider } from '../../../types/translation';
import styles from './styles.module.scss';

interface TranslationApiKeysCardProps {
    /** Masked keys per provider from the backend (e.g. `sk-…abcd`); undefined while loading. */
    keys?: TranslationKeys;
    isLoading?: boolean;
    /** Saves one provider's new API key. */
    onSave: (provider: TranslationProvider, apiKey: string) => void;
    /** The provider whose key is currently being saved (drives the button spinner). */
    savingProvider?: TranslationProvider | null;
    /**
     * ORISO design rule: superadmin-only settings are never hidden, only disabled.
     * Pass true for non-superadmins — everything renders greyed out and read-only.
     */
    disabled?: boolean;
}

/**
 * Global settings card for the machine-translation API keys (OpenRouter / Mistral).
 * Shows the masked stored key per provider and lets superadmins save a new one.
 */
export const TranslationApiKeysCard = ({
    keys,
    isLoading,
    onSave,
    savingProvider,
    disabled,
}: TranslationApiKeysCardProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    const save = (provider: TranslationProvider) => {
        const apiKey = `${form.getFieldValue(provider) ?? ''}`.trim();
        if (!apiKey) {
            message.error(t('legal.translation.settings.emptyKey'));
            return;
        }
        onSave(provider, apiKey);
        form.resetFields([provider]);
    };

    return (
        <Card
            className={styles.card}
            variant="dialog"
            headerIcon={<TranslateOutlinedIcon />}
            titleKey="legal.translation.settings.title"
            subTitleKey="legal.translation.settings.description"
            isLoading={isLoading}
            autoHeight
        >
            <Form form={form} layout="vertical" disabled={disabled}>
                {TRANSLATION_PROVIDERS.map((provider) => (
                    <div key={provider} className={styles.provider}>
                        <Typography.Text strong className={styles.providerName}>
                            {t(`legal.translation.settings.provider.${provider}`)}
                        </Typography.Text>
                        <Typography.Text type="secondary" className={styles.currentKey}>
                            {keys?.[provider]
                                ? t('legal.translation.settings.currentKey', { key: keys[provider] })
                                : t('legal.translation.settings.noKey')}
                        </Typography.Text>
                        <FormInputPasswordField
                            labelKey="legal.translation.settings.newKey"
                            name={provider}
                            autoComplete="new-password"
                        />
                        <Button
                            loading={savingProvider === provider}
                            disabled={disabled}
                            onClick={() => save(provider)}
                        >
                            {t('legal.translation.settings.save')}
                        </Button>
                    </div>
                ))}
            </Form>
        </Card>
    );
};

export default TranslationApiKeysCard;
