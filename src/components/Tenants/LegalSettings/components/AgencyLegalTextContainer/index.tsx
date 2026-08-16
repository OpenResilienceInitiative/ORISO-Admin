import { Alert, Button, Skeleton } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDepartmentDpp } from '../../../../../hooks/useDepartmentDpp.hook';
import { useDepartmentImprint } from '../../../../../hooks/useDepartmentImprint.hook';
import { usePublishDepartmentDpp } from '../../../../../hooks/usePublishDepartmentDpp.hook';
import { usePublishDepartmentImprint } from '../../../../../hooks/usePublishDepartmentImprint.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { AgencyData } from '../../../../../types/agency';
import { DepartmentDataProtectionCard } from '../DepartmentDataProtectionCard';
import { ALL_DEPARTMENTS, DepartmentSelect } from '../DepartmentSelect';
import { getEditableLanguages, parseLegalContentMap } from '../../utils/legalContentLanguages';
import styles from './styles.module.scss';

type LegalField = 'privacy' | 'imprint';

interface AgencyLegalTextContainerProps {
    agencyData?: AgencyData;
    field: LegalField;
    /** Persists the agency-wide text (the "Alle Fachbereiche" entry). */
    onSaveAgencyWide: <T>(formData: T, options?: { onError?: () => void }) => void;
    saving?: boolean;
}

/** The agency-level content key differs from the department wording ("imprint" vs "impressum"). */
const AGENCY_CONTENT_KEY: Record<LegalField, string> = { privacy: 'privacy', imprint: 'impressum' };

/**
 * One legal-text editor per kind for the whole Beratungsstelle, with the Fachbereich chosen in the
 * editor's lower function bar (Figma `Admin.ORISO` 1261:52149) — replacing the previous
 * one-card-per-department deck.
 *
 * **"Alle Fachbereiche"** edits the agency-wide text, which starts from the Träger's text and is
 * what every department inherits until it publishes its own. Selecting a single Fachbereich opens a
 * **draft copy of whatever that department currently shows** — its own text if it has one, otherwise
 * the inherited one. The copy lives in the editor and is written on first save or publish, never on
 * mere selection, so browsing the departments creates nothing.
 *
 * Publishing under a Fachbereich makes that department leave the inherited text for good
 * (ADR-014 amendment 2026-07-28; the link-break happens server-side in ORISO-AgencyService#193).
 */
export const AgencyLegalTextContainer = ({
    agencyData,
    field,
    onSaveAgencyWide,
    saving,
}: AgencyLegalTextContainerProps) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number | typeof ALL_DEPARTMENTS>(ALL_DEPARTMENTS);

    const agencyId = Number(agencyData?.id);
    const isDepartment = selected !== ALL_DEPARTMENTS;
    const topicId = isDepartment ? (selected as number) : undefined;

    const departments = useMemo(
        () =>
            (agencyData?.topics || [])
                .filter((topic) => topic.id != null)
                .map((topic) => ({ id: topic.id as number, name: topic.name })),
        [agencyData?.topics],
    );

    // Tenant text is the root of the inheritance chain: Träger → Agentur → Fachbereich.
    const { data: tenantData } = useSingleTenantData({
        id: agencyData?.tenantId || '',
        enabled: Boolean(agencyData?.tenantId),
    });
    const { data: tenantAdminData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();

    // Both department queries stay mounted; the inactive one is disabled by its own `enabled` guard
    // (a non-finite topicId), so switching kinds never fires the wrong request.
    const dppQuery = useDepartmentDpp(agencyId, field === 'privacy' ? (topicId as number) : NaN);
    const imprintQuery = useDepartmentImprint(agencyId, field === 'imprint' ? (topicId as number) : NaN);
    const departmentQuery = field === 'privacy' ? dppQuery : imprintQuery;

    const publishDpp = usePublishDepartmentDpp(agencyId, topicId as number);
    const publishImprint = usePublishDepartmentImprint(agencyId, topicId as number);
    const departmentPublish = field === 'privacy' ? publishDpp : publishImprint;

    const agencyContentKey = AGENCY_CONTENT_KEY[field];
    const agencyWideContent = useMemo<Record<string, string>>(
        () => ({
            ...((tenantData?.content?.[agencyContentKey] as Record<string, string>) || {}),
            ...((agencyData?.content?.[agencyContentKey] as Record<string, string>) || {}),
        }),
        [tenantData, agencyData, agencyContentKey],
    );

    const departmentContent = useMemo(
        () => parseLegalContentMap(departmentQuery.data?.content),
        [departmentQuery.data?.content],
    );

    // The draft copy: a department with no own text yet starts from what it currently shows, which
    // is the inherited agency-wide text. "Alle Fachbereiche" always edits that same agency-wide text.
    //
    // This inference is only safe once the read SUCCEEDED. A failed request also yields an empty
    // map, and treating that as "has no own text" would seed the editor with the inherited text —
    // publishing would then overwrite the department's real, existing text with the inherited one.
    // That is the same silent-overwrite class this whole epic exists to remove, so a failed read
    // blocks the editor instead (see the isError branch below).
    const hasOwnText = isDepartment && departmentQuery.isSuccess && Object.keys(departmentContent).length > 0;
    const contentByLanguage = hasOwnText ? departmentContent : agencyWideContent;

    const languages = useMemo(
        () => getEditableLanguages(tenantAdminData?.settings?.activeLanguages, contentByLanguage),
        [tenantAdminData?.settings?.activeLanguages, contentByLanguage],
    );

    const onSave = (content: Record<string, string>, publish: boolean) => {
        if (isDepartment) {
            departmentPublish.mutate({ content, publish });
            return;
        }
        // The agency-wide text has no draft state of its own — it is stored on the agency record.
        onSaveAgencyWide({ content: { [agencyContentKey]: content } });
    };

    const selectedDepartment = departments.find(({ id }) => id === topicId);

    // The editor cannot open before the department's own text is known — seeding it with the
    // inherited text would let a publish overwrite the real one. Blanking the whole card would
    // take the switcher with it and strand the admin on a Fachbereich they cannot leave, so only
    // the editor waits.
    if (isDepartment && departmentQuery.isLoading) {
        return (
            <div className={styles.fallbackCard}>
                <Skeleton active title={false} paragraph={{ rows: 4 }} />
                <div className={styles.fallbackSwitcher}>
                    <DepartmentSelect departments={departments} value={selected} onChange={setSelected} />
                </div>
            </div>
        );
    }

    // A department whose text could not be read must not be editable: the editor would show the
    // inherited text and publishing would replace the department's own with it.
    if (isDepartment && departmentQuery.isError) {
        return (
            <div className={styles.fallbackCard}>
                <Alert
                    type="error"
                    showIcon
                    message={t('agency.legal.department.loadError.title')}
                    description={t('agency.legal.department.loadError.text', {
                        name: selectedDepartment?.name ?? '',
                    })}
                    action={
                        <Button size="small" onClick={() => departmentQuery.refetch()}>
                            {t('agency.legal.department.loadError.retry')}
                        </Button>
                    }
                />
                <div className={styles.fallbackSwitcher}>
                    <DepartmentSelect departments={departments} value={selected} onChange={setSelected} />
                </div>
            </div>
        );
    }

    return (
        <DepartmentDataProtectionCard
            // Remount when the source changes, so the editor resets to it instead of keeping the
            // previous department's text in an uncontrolled TipTap instance.
            key={`${agencyId}-${field}-${String(selected)}-${departmentQuery.data?.content ?? ''}`}
            documentType={field}
            departmentName={selectedDepartment?.name}
            initialContentByLanguage={contentByLanguage}
            languages={languages}
            publicationStatus={isDepartment ? departmentQuery.data?.publicationStatus : undefined}
            onSave={onSave}
            saving={saving || departmentPublish.isPending}
            onTranslate={translate}
            departmentSlot={<DepartmentSelect departments={departments} value={selected} onChange={setSelected} />}
        />
    );
};

export default AgencyLegalTextContainer;
