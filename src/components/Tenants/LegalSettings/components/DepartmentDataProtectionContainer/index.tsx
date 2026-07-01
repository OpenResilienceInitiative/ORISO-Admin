import { useTranslation } from 'react-i18next';
import { useDepartmentDpp } from '../../../../../hooks/useDepartmentDpp.hook';
import { usePublishDepartmentDpp } from '../../../../../hooks/usePublishDepartmentDpp.hook';
import { DepartmentDataProtectionCard } from '../DepartmentDataProtectionCard';

interface DepartmentDataProtectionContainerProps {
    agencyId: number;
    topicId: number;
    departmentName?: string;
}

/** Reads the stored multilingual JSON content and returns the HTML for the active language. */
const pickLanguage = (jsonContent: string | null | undefined, lang: string): string => {
    if (!jsonContent) {
        return '';
    }
    try {
        const map = JSON.parse(jsonContent) as Record<string, string>;
        return map[lang] ?? Object.values(map)[0] ?? '';
    } catch {
        // Not a JSON map (older/plain content) — show it as-is.
        return jsonContent;
    }
};

/**
 * Container for one Fachbereich's (agency × topic) data privacy policy card: loads the stored
 * content + status to prefill the editor, and wires the publish/draft mutation (which refreshes the
 * read query on success).
 */
export const DepartmentDataProtectionContainer = ({
    agencyId,
    topicId,
    departmentName,
}: DepartmentDataProtectionContainerProps) => {
    const { i18n } = useTranslation();
    const lang = i18n.language?.split('-')[0] || 'de';

    const { data, isLoading } = useDepartmentDpp(agencyId, topicId);
    const { mutate: publish, isPending } = usePublishDepartmentDpp(agencyId, topicId);

    if (isLoading) {
        return null;
    }

    return (
        <DepartmentDataProtectionCard
            // remount when the stored content changes (e.g. after a publish) so the editor resets to it
            key={`${agencyId}-${topicId}-${data?.content ?? ''}`}
            departmentName={departmentName}
            initialContent={pickLanguage(data?.content, lang)}
            publicationStatus={data?.publicationStatus}
            onSave={(html, doPublish) => publish({ content: { [lang]: html }, publish: doPublish })}
            saving={isPending}
        />
    );
};

export default DepartmentDataProtectionContainer;
