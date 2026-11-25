import { useState } from 'react';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { snackbar } from '../../Snackbar';
import { Card } from '../../Card';
import { M3Button } from '../../M3Button';
import { MuiPasswordFormField } from '../../mui/MuiFormField';
import { TileSections } from '../../TileSections';
import { HintText } from '../../HintText';
import { getTranslationErrorKey } from '../../Tenants/LegalSettings/utils/translationErrors';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import {
    TRANSLATION_PROVIDERS,
    TranslationKeyTestResult,
    TranslationKeys,
    TranslationProvider,
} from '../../../types/translation';
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
    /**
     * Tests the stored key with one short live call and resolves with the provider's reply. Without
     * it no test button is shown.
     */
    onTest?: (provider: TranslationProvider) => Promise<TranslationKeyTestResult>;
}

type KeyTest =
    | { state: 'testing' }
    | { state: 'ok'; result: TranslationKeyTestResult }
    | { state: 'failed'; messageKey: string };

/** What the last key test returned, as plain text in the section (it stays until the next test). */
const KeyTestOutcome = ({ test, provider }: { test?: KeyTest; provider: TranslationProvider }) => {
    const { t } = useTranslation();
    if (!test || test.state === 'testing') return null;
    if (test.state === 'failed') {
        return (
            <HintText
                tone="error"
                title={t('legal.translation.settings.testFailed')}
                role="status"
                data-testid={`translation-key-test-result-${provider}`}
            >
                {t(test.messageKey)}
            </HintText>
        );
    }
    const { result } = test;
    return (
        <HintText
            title={t('legal.translation.settings.testOk')}
            role="status"
            data-testid={`translation-key-test-result-${provider}`}
        >
            {t('legal.translation.settings.testReply', {
                model: result.model,
                ms: result.latencyMs,
                source: result.sourceText,
                reply: result.reply,
            })}
        </HintText>
    );
};

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
    onTest,
}: TranslationApiKeysCardProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [tests, setTests] = useState<Partial<Record<TranslationProvider, KeyTest>>>({});

    const runTest = async (provider: TranslationProvider) => {
        if (!onTest) return;
        setTests((current) => ({ ...current, [provider]: { state: 'testing' } }));
        try {
            const result = await onTest(provider);
            setTests((current) => ({ ...current, [provider]: { state: 'ok', result } }));
        } catch (error) {
            setTests((current) => ({
                ...current,
                [provider]: { state: 'failed', messageKey: getTranslationErrorKey(error) },
            }));
        }
    };

    const save = (provider: TranslationProvider) => {
        const apiKey = `${form.getFieldValue(provider) ?? ''}`.trim();
        if (!apiKey) {
            snackbar.error(t('legal.translation.settings.emptyKey'));
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
                                    <div className={styles.actions} data-testid={`translation-key-actions-${provider}`}>
                                        <M3Button
                                            variant="outlined"
                                            loading={savingProvider === provider}
                                            disabled={disabled}
                                            onClick={() => save(provider)}
                                        >
                                            {t('legal.translation.settings.save')}
                                        </M3Button>
                                        {onTest && (
                                            <M3Button
                                                variant="text"
                                                loading={tests[provider]?.state === 'testing'}
                                                disabled={disabled || !keys?.[provider]}
                                                onClick={() => runTest(provider)}
                                            >
                                                {t('legal.translation.settings.test')}
                                            </M3Button>
                                        )}
                                    </div>
                                    <KeyTestOutcome test={tests[provider]} provider={provider} />
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
