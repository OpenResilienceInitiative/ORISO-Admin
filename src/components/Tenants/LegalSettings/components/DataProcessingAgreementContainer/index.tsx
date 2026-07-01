import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDpaVersions } from '../../../../../hooks/useDpaVersions.hook';
import { usePublishDpa } from '../../../../../hooks/usePublishDpa.hook';
import { DpaVersion } from '../../../../../types/dpa';
import { LegalVersion } from '../LegalVersionViewer';
import { DataProcessingAgreementCard } from '../DataProcessingAgreementCard';

interface DataProcessingAgreementContainerProps {
    tenantId: string | number;
}

/** Reads the stored multilingual JSON content and returns the HTML for the active language. */
const pickLanguage = (jsonContent: string, lang: string): string => {
    try {
        const map = JSON.parse(jsonContent) as Record<string, string>;
        return map[lang] ?? Object.values(map)[0] ?? '';
    } catch {
        // Not a JSON map (older/plain content) — show it as-is.
        return jsonContent ?? '';
    }
};

/**
 * Container for the DPA card: loads the tenant's published versions, maps them to the read-only
 * viewer's shape (formatted label + active-language HTML), and wires the publish mutation.
 */
export const DataProcessingAgreementContainer = ({ tenantId }: DataProcessingAgreementContainerProps) => {
    const { t, i18n } = useTranslation();
    const id = Number(tenantId);
    const lang = i18n.language?.split('-')[0] || 'de';

    const { data: versions = [] } = useDpaVersions(id);
    const { mutate: publish, isPending } = usePublishDpa(id);

    const mapped: LegalVersion[] = useMemo(
        () =>
            (versions as DpaVersion[]).map((version, index) => {
                const date = new Date(version.activationDate);
                const dateLabel = Number.isNaN(date.getTime())
                    ? version.activationDate
                    : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
                return {
                    id: version.activationDate,
                    label:
                        index === 0
                            ? `${dateLabel} ${t('tenants.legal.version.current', '(aktuell)')}`
                            : dateLabel,
                    content: pickLanguage(version.content, lang),
                };
            }),
        [versions, lang, t],
    );

    return (
        <DataProcessingAgreementCard
            initialContent={mapped[0]?.content ?? ''}
            versions={mapped}
            onPublish={(html) => publish({ [lang]: html })}
            publishing={isPending}
        />
    );
};

export default DataProcessingAgreementContainer;
