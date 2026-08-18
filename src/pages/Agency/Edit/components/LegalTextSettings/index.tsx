import { useEffect, useMemo, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { M3RichTextEditor } from '../../../../../components/FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../../components/FormPluginEditor/EditorHelpText';
import { GdprIcon, ImprintIcon } from '../../../../../components/CustomIcons/LegalIcons';
import { LegalConsentField } from '../../../../../components/Tenants/LegalSettings/components/LegalConsentField';
import {
    consentPublicationBlockers,
    MANDATORY_CONSENT_TOKEN,
} from '../../../../../components/Tenants/LegalSettings/utils/consentTextValidation';
import { toEditorVersions } from '../../../../../components/Tenants/LegalSettings/utils/legalVersionOptions';
import { useViewedLegalVersion } from '../../../../../components/Tenants/LegalSettings/hooks/useViewedLegalVersion';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { useLegalTextVersions } from '../../../../../hooks/useLegalTextVersions.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { AgencyData } from '../../../../../types/agency';
import styles from './styles.module.scss';

type AgencyLegalTextField = 'impressum' | 'privacy';

interface LegalTextSettingsProps {
    agencyData?: AgencyData;
    field: AgencyLegalTextField;
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
    /** Pending state of the agency update mutation — disables publishing while in flight. */
    saving?: boolean;
}

const mergeTranslatedContent = (
    inherited?: Record<string, string>,
    agencyContent?: Record<string, string>,
): Record<string, string> => ({
    ...(inherited || {}),
    ...(agencyContent || {}),
});

/**
 * Agency-level imprint / privacy card in the M3 editor shell. The content starts
 * from the tenant's (Träger) texts with the agency's own overrides on top; local
 * edits are kept per language. Inherited tenant values are rendered but never
 * persisted as agency overrides, so future tenant updates still flow through.
 */
export const LegalTextSettings = ({ agencyData, field, onSave, saving }: LegalTextSettingsProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language?.split('-')[0] || 'de';
    const { can } = useUserPermissions();
    const { isEnabled } = useFeatureContext();
    const { data: tenantData, isLoading } = useSingleTenantData({
        id: agencyData?.tenantId || '',
        enabled: Boolean(agencyData?.tenantId),
    });
    const isPrivacy = field === 'privacy';
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [consentEdits, setConsentEdits] = useState<Record<string, string>>({});
    const [publishBlocked, setPublishBlocked] = useState(false);
    const editorIdentity = `${agencyData?.id ?? ''}:${agencyData?.tenantId ?? ''}:${field}`;
    const agencyOverrides = useMemo(() => agencyData?.content?.[field] || {}, [agencyData, field]);
    const { data: versions = [], isError: versionsUnavailable } = useLegalTextVersions({
        level: 'agency',
        agencyId: Number(agencyData?.id),
        kind: isPrivacy ? 'DPP' : 'IMPRINT',
    });
    // Keeps the consent sentence on the same version as the body shown above it.
    const {
        onViewVersionChange,
        viewedConsent,
        isViewingVersion,
        reset: resetViewedVersion,
    } = useViewedLegalVersion(versions);

    const languages = useMemo(() => {
        const configured = tenantData?.settings?.activeLanguages;
        return configured?.length ? configured : ['de'];
    }, [tenantData?.settings?.activeLanguages]);

    useEffect(() => {
        setEdits({});
        setConsentEdits({});
        setPublishBlocked(false);
        setActiveLanguage('de');
        resetViewedVersion();
    }, [editorIdentity, resetViewedVersion]);

    // The initial 'de' can be unavailable once the tenant's languages arrive; fall
    // back to the first configured language so the editor never sits on an empty one.
    useEffect(() => {
        if (!languages.includes(activeLanguage)) {
            setActiveLanguage(languages[0]);
        }
    }, [languages, activeLanguage]);

    // Inherited tenant texts with the agency's overrides on top, plus the local edits.
    const contentByLanguage = useMemo<Record<string, string>>(
        () => ({
            ...mergeTranslatedContent(tenantData?.content?.[field], agencyOverrides),
            ...edits,
        }),
        [agencyOverrides, edits, field, tenantData],
    );

    /**
     * The consent sentence of this Beratungsstelle (ADR-021 decision 4 — a field of
     * the data-protection policy). It follows the SAME inheritance display rule as
     * the policy itself: the Träger sentence is shown, only an actual override is
     * persisted, so a later Träger change still flows through.
     *
     * NOTE (ADR-021 decision 9): inheritance is to move server-side. If the
     * AgencyService PR of #250 lands a resolved read endpoint, prefer it over this
     * client-side merge and delete `mergeTranslatedContent` with it.
     */
    const inheritedConsent = tenantData?.content?.privacyConsent;
    const agencyConsentOverrides = useMemo(() => agencyData?.content?.privacyConsent, [agencyData]);
    const consentEnabled = isPrivacy && (inheritedConsent !== undefined || agencyConsentOverrides !== undefined);
    const consentByLanguage = useMemo<Record<string, string>>(
        () => ({ ...mergeTranslatedContent(inheritedConsent, agencyConsentOverrides), ...consentEdits }),
        [inheritedConsent, agencyConsentOverrides, consentEdits],
    );
    const blockedLanguages = useMemo(
        () => (consentEnabled ? consentPublicationBlockers(consentByLanguage) : []),
        [consentEnabled, consentByLanguage],
    );

    const editorVersions = useMemo(
        () => toEditorVersions(versions, activeLanguage, locale, t('tenants.legal.version.current')),
        [versions, activeLanguage, locale, t],
    );

    const onPublish = () => {
        // The server refuses a consent sentence without `{{legal_links}}`
        // (ADR-021 decision 2) — say so here rather than letting the admin find out
        // from a failed request.
        if (blockedLanguages.length > 0) {
            setPublishBlocked(true);
            return;
        }
        setPublishBlocked(false);
        // Preserve untouched agency overrides, but do not materialize inherited
        // tenant values as local copies.
        onSave({
            content: {
                [field]: { ...agencyOverrides, ...edits },
                ...(consentEnabled ? { privacyConsent: { ...(agencyConsentOverrides ?? {}), ...consentEdits } } : {}),
            },
        });
    };

    if (isLoading) {
        return (
            <div className={styles.card}>
                <Spin />
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={t(`agency.edit.settings.legal.${field}.title`)}
                icon={isPrivacy ? GdprIcon : ImprintIcon}
                readOnly={!canEditLegalText}
                publishing={saving}
                versionLabel={t('legal.m3Editor.versionLabel')}
                versions={editorVersions}
                onRestoreVersion={
                    canEditLegalText
                        ? (html) => setEdits((current) => ({ ...current, [activeLanguage]: html }))
                        : undefined
                }
                onViewVersionChange={onViewVersionChange}
                languages={languages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`),
                }))}
                language={activeLanguage}
                onLanguageChange={setActiveLanguage}
                helpSlot={<EditorHelpText text={t(`agency.edit.settings.legal.${field}.subtitle`)} />}
                placeholder={t(`agency.edit.settings.legal.${field}.placeholder`)}
                placeholders={
                    isPrivacy && isEnabled(FeatureFlag.CentralDataProtectionTemplate)
                        ? {
                              responsible: 'editor.plugin.placeholder.option.responsible.label',
                              dataProtectionOfficer: 'editor.plugin.placeholder.option.dataProtectionOfficer.label',
                          }
                        : undefined
                }
                value={contentByLanguage[activeLanguage] ?? ''}
                onChange={
                    canEditLegalText
                        ? (html) => setEdits((current) => ({ ...current, [activeLanguage]: html }))
                        : undefined
                }
                onPublish={canEditLegalText ? onPublish : undefined}
            />
            {/* Under the editor, not inside its `belowSlot`: the M3 card is a fixed
                800×740 deck card and clips visible slot content (same trap as the
                aboveEditorSlot banner in #708). Still one card — policy + consent. */}
            {consentEnabled && (
                <LegalConsentField
                    inheritedFrom={
                        // The inheritance notice describes the CURRENT state; while an
                        // archived version is on screen it would answer a question
                        // nobody asked about the version being read.
                        !isViewingVersion && agencyConsentOverrides?.[activeLanguage] === undefined
                            ? t('legal.consent.level.tenant')
                            : undefined
                    }
                    language={activeLanguage}
                    readOnly={!canEditLegalText || isViewingVersion}
                    value={(viewedConsent ?? consentByLanguage)[activeLanguage] ?? ''}
                    onChange={(next) => {
                        setPublishBlocked(false);
                        setConsentEdits((current) => ({ ...current, [activeLanguage]: next }));
                    }}
                />
            )}
            {/* A history that failed to load is not an empty history — see LegalText. */}
            {versionsUnavailable && (
                <Alert
                    type="warning"
                    showIcon
                    data-testid="legal-versions-unavailable"
                    message={t('legal.versions.unavailable.title')}
                    description={t('legal.versions.unavailable.description')}
                />
            )}
            {consentEnabled && publishBlocked && (
                <Alert
                    type="error"
                    showIcon
                    data-testid="consent-publish-blocked"
                    message={t('legal.consent.publishBlocked.title')}
                    description={
                        <>
                            {t('legal.consent.publishBlocked.description', {
                                languages: blockedLanguages.join(', '),
                            })}{' '}
                            <code>{`{{${MANDATORY_CONSENT_TOKEN}}}`}</code>
                        </>
                    }
                />
            )}
        </div>
    );
};
