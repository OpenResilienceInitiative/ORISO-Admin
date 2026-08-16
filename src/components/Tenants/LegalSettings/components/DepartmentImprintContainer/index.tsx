import { useMemo } from 'react';
import { useDepartmentImprint } from '../../../../../hooks/useDepartmentImprint.hook';
import { usePublishDepartmentImprint } from '../../../../../hooks/usePublishDepartmentImprint.hook';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { DepartmentDataProtectionCard } from '../DepartmentDataProtectionCard';
import { getEditableLanguages, parseLegalContentMap } from '../../utils/legalContentLanguages';

export const DepartmentImprintContainer = ({
    agencyId,
    topicId,
    departmentName,
}: {
    agencyId: number;
    topicId: number;
    departmentName?: string;
}) => {
    const { data, isLoading } = useDepartmentImprint(agencyId, topicId);
    const { mutate: publish, isPending } = usePublishDepartmentImprint(agencyId, topicId);
    const { data: tenantData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();
    const contentByLanguage = useMemo(() => parseLegalContentMap(data?.content), [data?.content]);
    const languages = useMemo(
        () => getEditableLanguages(tenantData?.settings?.activeLanguages, contentByLanguage),
        [tenantData?.settings?.activeLanguages, contentByLanguage],
    );

    if (isLoading) return null;

    return (
        <DepartmentDataProtectionCard
            key={`${agencyId}-${topicId}-${data?.content ?? ''}`}
            documentType="imprint"
            departmentName={departmentName}
            initialContentByLanguage={contentByLanguage}
            languages={languages}
            publicationStatus={data?.publicationStatus}
            onSave={(content, doPublish) => publish({ content, publish: doPublish })}
            saving={isPending}
            onTranslate={translate}
        />
    );
};
