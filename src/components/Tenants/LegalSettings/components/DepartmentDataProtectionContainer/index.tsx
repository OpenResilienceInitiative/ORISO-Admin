import { useMemo } from 'react';
import { useDepartmentDpp } from '../../../../../hooks/useDepartmentDpp.hook';
import { useLegalTextVersions } from '../../../../../hooks/useLegalTextVersions.hook';
import { usePublishDepartmentDpp } from '../../../../../hooks/usePublishDepartmentDpp.hook';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { DepartmentDataProtectionCard } from '../DepartmentDataProtectionCard';
import { getEditableLanguages, parseLegalContentMap } from '../../utils/legalContentLanguages';

interface DepartmentDataProtectionContainerProps {
    agencyId: number;
    topicId: number;
    departmentName?: string;
}

/**
 * Container for one Fachbereich's (agency × topic) data privacy policy card: loads the stored
 * content + status and the tenant's active languages, hands the card the complete content map
 * for per-language editing, and wires the publish/draft mutation (which refreshes the read query
 * on success). The card submits the complete merged map, so saving in one UI language never
 * drops the other languages (or unknown keys) any more.
 */
export const DepartmentDataProtectionContainer = ({
    agencyId,
    topicId,
    departmentName,
}: DepartmentDataProtectionContainerProps) => {
    const { data, isLoading } = useDepartmentDpp(agencyId, topicId);
    const { mutate: publish, isPending } = usePublishDepartmentDpp(agencyId, topicId);
    const { data: tenantData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();
    const { data: versions = [] } = useLegalTextVersions({ level: 'department', agencyId, topicId, kind: 'dpp' });

    const contentByLanguage = useMemo(() => parseLegalContentMap(data?.content), [data?.content]);
    // `undefined` (backend without the field) must stay `undefined` — the card uses
    // exactly that to decide whether the consent editor may be offered at all.
    const consentByLanguage = useMemo(
        () => (data && data.consentText !== undefined ? parseLegalContentMap(data.consentText) : undefined),
        [data],
    );
    const languages = useMemo(
        () => getEditableLanguages(tenantData?.settings?.activeLanguages, contentByLanguage),
        [tenantData?.settings?.activeLanguages, contentByLanguage],
    );

    if (isLoading) {
        return null;
    }

    return (
        <DepartmentDataProtectionCard
            // remount when the stored content changes (e.g. after a publish) so the editor resets to it
            key={`${agencyId}-${topicId}-${data?.content ?? ''}`}
            departmentName={departmentName}
            initialContentByLanguage={contentByLanguage}
            consentByLanguage={consentByLanguage}
            languages={languages}
            publicationStatus={data?.publicationStatus}
            versions={versions}
            onSave={(contentByLang, doPublish, consentByLang) =>
                publish({ content: contentByLang, publish: doPublish, consentText: consentByLang })
            }
            saving={isPending}
            onTranslate={translate}
        />
    );
};

export default DepartmentDataProtectionContainer;
