import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { Card } from '../../Card';
import { M3Button } from '../../M3Button';
import { MuiPasswordFormField } from '../../mui/MuiFormField';
import { TileSections } from '../../TileSections';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { TRANSLATION_PROVIDERS, TranslationKeys, TranslationProvider } from '../../../types/translation';
import { translationHelp } from './help';
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
            help={translationHelp}
            titleKey="legal.translation.settings.title"
            subTitleKey="legal.translation.settings.description"
            isLoading={isLoading}
            autoHeight
        >
            <ThemeProvider theme={orisoMuiTheme}>
                <Form form={form} layout="vertical" disabled={disabled}>
                    <TileSections>
                        {TRANSLATION_PROVIDERS.map((provider) => (
                            <TileSections.Section
                                key={provider}
                                id={`translation-${provider}`}
                                title={t(`legal.translation.settings.provider.${provider}`)}
                                note={
                                    keys?.[provider]
                                        ? t('legal.translation.settings.currentKey', { key: keys[provider] })
                                        : t('legal.translation.settings.noKey')
                                }
                            >
                                <div className={styles.provider}>
                                    <MuiPasswordFormField
                                        label={t('legal.translation.settings.newKey')}
                                        name={provider}
                                        autoComplete="new-password"
                                        disabled={disabled}
                                    />
                                    <M3Button
                                        variant="outlined"
                                        loading={savingProvider === provider}
                                        disabled={disabled}
                                        onClick={() => save(provider)}
                                    >
                                        {t('legal.translation.settings.save')}
                                    </M3Button>
                                </div>
                            </TileSections.Section>
                        ))}
                    </TileSections>
                </Form>
            </ThemeProvider>
        </Card>
    );
};

export default TranslationApiKeysCard;
