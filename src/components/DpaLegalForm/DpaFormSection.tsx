import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { M3Checkbox } from '../M3Checkbox';
import { MuiFormField } from '../mui/MuiFormField';
import { DpaLegalText } from './DpaLegalText';
import styles from './styles.module.scss';

export interface DpaFormSectionProps {
    /** Sanitized HTML of the published legal text (host applies DOMPurify + language pick). */
    dpaHtml: string;
    /** Accessible name of the legal-text region. */
    textLabel: string;
    /** See {@link DpaLegalText}: `inner` scroll box (onboarding) vs scrolling `container` (blocker overlay). */
    scrollMode?: 'inner' | 'container';
    accepted: boolean;
    acceptTouched: boolean;
    /** Toggle handler — the host owns the accepted/touched state (it gates its own submit). */
    onAcceptedChange: (value: boolean) => void;
}

/**
 * The ONE shared DPA/AVV form block (#569 hardening — deduplicates the U8
 * onboarding DPA step and the U10 blocker): legal text with TOC anchor
 * navigation, the established signer fields (mirroring `DpaSignature`,
 * src/types/dpa.ts) and the explicit confirmation checkbox. Must be rendered
 * inside an antd `<Form>` — field names, validation rules and i18n keys are
 * identical in every host.
 */
export const DpaFormSection = ({
    dpaHtml,
    textLabel,
    scrollMode = 'inner',
    accepted,
    acceptTouched,
    onAcceptedChange,
}: DpaFormSectionProps) => {
    const { t } = useTranslation();

    return (
        <>
            {dpaHtml && <DpaLegalText html={dpaHtml} label={textLabel} scrollMode={scrollMode} />}
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="signerName"
                    label={t('tenantOnboarding.dpa.signerName')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerPosition"
                    label={t('tenantOnboarding.dpa.signerPosition')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerEmail"
                    label={t('tenantOnboarding.dpa.signerEmail')}
                    rules={[
                        { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                        { type: 'email', message: t('tenantOnboarding.validation.email') },
                    ]}
                />
                <MuiFormField
                    name="signerOrganisation"
                    label={t('tenantOnboarding.dpa.signerOrganisation')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
            </div>

            <div className={styles.acceptRow}>
                <M3Checkbox checked={accepted} label={t('tenantOnboarding.dpa.accept')} onChange={onAcceptedChange} />
                <Typography component="span" className={styles.acceptLabel} onClick={() => onAcceptedChange(!accepted)}>
                    {t('tenantOnboarding.dpa.accept')}
                </Typography>
            </div>
            {acceptTouched && !accepted && (
                <Typography role="alert" color="error" variant="body2" sx={{ mt: 1 }}>
                    {t('tenantOnboarding.dpa.acceptRequired')}
                </Typography>
            )}
        </>
    );
};
