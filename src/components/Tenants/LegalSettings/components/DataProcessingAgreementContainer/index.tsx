import { useMemo } from 'react';
import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDpaVersions } from '../../../../../hooks/useDpaVersions.hook';
import { usePublishDpa } from '../../../../../hooks/usePublishDpa.hook';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { DpaVersion } from '../../../../../types/dpa';
import { LegalVersion } from '../LegalVersionViewer';
import { DataProcessingAgreementCard } from '../DataProcessingAgreementCard';
import {
    getEditableLanguages,
    parseLegalContentMap,
    pickLegalContentLanguage,
} from '../../utils/legalContentLanguages';

interface DataProcessingAgreementContainerProps {
    tenantId: string | number;
    /** Read-only view (agency page): the DPA is managed at tenant (Träger) level. */
    readOnly?: boolean;
}

/**
 * Container for the DPA card: loads the tenant's published versions and the tenant's active
 * languages, hands the card the complete latest content map for per-language editing, and wires
 * the publish mutation. The card submits the complete merged map, so publishing in one UI
 * language never drops the other languages (or unknown keys) any more.
 */
export const DataProcessingAgreementContainer = ({ tenantId, readOnly }: DataProcessingAgreementContainerProps) => {
    const { t, i18n } = useTranslation();
    const id = Number(tenantId);
    const lang = i18n.language?.split('-')[0] || 'de';

    const {
        data: versions = [],
        isError: versionsError,
        refetch: refetchVersions,
    } = useDpaVersions(id, Number.isFinite(id) && id > 0);
    const { mutate: publish, isPending } = usePublishDpa(id);
    const { data: tenantData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();

    const latestContentByLanguage = useMemo(
        () => parseLegalContentMap((versions as DpaVersion[])[0]?.content),
        [versions],
    );
    const languages = useMemo(
        () => getEditableLanguages(tenantData?.settings?.activeLanguages, latestContentByLanguage),
        [tenantData?.settings?.activeLanguages, latestContentByLanguage],
    );

    const mapped: LegalVersion[] = useMemo(
        () =>
            (versions as DpaVersion[]).map((version, index) => {
                const date = new Date(version.activationDate);
                const dateLabel = Number.isNaN(date.getTime())
                    ? version.activationDate
                    : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
                return {
                    id: version.activationDate,
                    label: index === 0 ? `${dateLabel} ${t('tenants.legal.version.current')}` : dateLabel,
                    content: pickLegalContentLanguage(version.content, lang),
                };
            }),
        [versions, lang, t],
    );

    // A failed version load must not masquerade as "no versions yet": editing a
    // legal text on an unknown current state could silently overwrite it, so we
    // withhold the editor and offer a retry instead.
    if (versionsError) {
        return (
            <Alert
                type="error"
                showIcon
                message={t('tenants.legal.version.loadError')}
                action={
                    <Button size="small" onClick={() => refetchVersions()}>
                        {t('tenants.legal.version.retry')}
                    </Button>
                }
            />
        );
    }

    return (
        <DataProcessingAgreementCard
            // remount when the stored content changes (e.g. after a publish) so the editor resets to it
            key={`${id}-${(versions as DpaVersion[])[0]?.activationDate ?? ''}`}
            initialContentByLanguage={latestContentByLanguage}
            languages={languages}
            defaultLanguage={lang}
            versions={mapped}
            onPublish={publish}
            publishing={isPending}
            onTranslate={readOnly ? undefined : translate}
            readOnly={readOnly}
        />
    );
};

export default DataProcessingAgreementContainer;
